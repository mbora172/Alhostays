// Card payments with Stripe Checkout.
//
// A card booking is created as `awaiting_payment`, which holds the dates, and
// the guest is sent to a Stripe-hosted checkout page that expires after
// CHECKOUT_HOLD_MINUTES. The booking becomes `confirmed` when Stripe reports
// the payment (webhook, or the guest returning to the confirmation page), and
// `cancelled` (dates released) when the checkout expires or is abandoned.
// A sweeper re-checks stale holds against Stripe in case a webhook is missed.

import Stripe from "stripe";
import type { Booking } from "@shared/schema";
import { getCatalogEntry } from "@shared/catalog";
import { storage } from "./storage";
import { log } from "./log";

/** Stripe's minimum checkout lifetime is 30 minutes. */
export const CHECKOUT_HOLD_MINUTES = 30;
/** Pay Later links stay valid for Stripe's maximum of 24 hours. */
const PAYMENT_LINK_HOURS = 24;

/** Statuses a successful payment may confirm. */
const PAYABLE_STATUSES = ["awaiting_payment", "pending_payment", "pending"];

let client: Stripe | null | undefined;

export function getStripe(): Stripe | null {
  if (client === undefined) {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    client = key ? new Stripe(key, { maxNetworkRetries: 2, timeout: 20_000 }) : null;
  }
  return client;
}

/** Replaces the Stripe client (tests point it at a local fake API). */
export function setStripeClient(stripe: Stripe | null): void {
  client = stripe;
}

export function cardPaymentsEnabled(): boolean {
  return getStripe() !== null;
}

export function isTestMode(): boolean {
  return process.env.STRIPE_SECRET_KEY?.trim().startsWith("sk_test_") ?? false;
}

function formatDate(date: string): string {
  return new Date(date + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Creates a Stripe Checkout session for the booking's server-computed total
 * and stores its id on the booking. Returns the URL to send the guest to.
 */
export async function createCheckoutSession(
  booking: Booking,
  baseUrl: string,
  options: { expiresInMinutes: number; successPath: string; cancelPath: string },
): Promise<string> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Card payments are not configured");
  const property = getCatalogEntry(booking.propertyId);
  const name = property?.name ?? "Aloha Stays";

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "usd",
            unit_amount: booking.total * 100,
            product_data: {
              name: `${name} - ${booking.nights} night${booking.nights === 1 ? "" : "s"}`,
              description:
                `${formatDate(booking.checkIn)} to ${formatDate(booking.checkOut)} · ` +
                `${booking.guests} guest${booking.guests === 1 ? "" : "s"} · ` +
                `includes cleaning fee, service fee and taxes`,
            },
          },
        },
      ],
      customer_email: booking.guestEmail,
      client_reference_id: booking.id,
      metadata: { bookingId: booking.id, propertyId: booking.propertyId },
      payment_intent_data: {
        description: `${name}: ${booking.checkIn} to ${booking.checkOut}`,
        metadata: { bookingId: booking.id, propertyId: booking.propertyId },
      },
      expires_at: Math.floor(Date.now() / 1000) + options.expiresInMinutes * 60,
      success_url: `${baseUrl}${options.successPath}${options.successPath.includes("?") ? "&" : "?"}session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${options.cancelPath}`,
    },
    // Retrying the same booking never creates two charges.
    { idempotencyKey: `checkout-${booking.id}-${options.expiresInMinutes}-${booking.paymentIntentId ?? "new"}` },
  );

  await storage.updateBooking(booking.id, { paymentIntentId: session.id });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return session.url;
}

/** A Pay Later booking's payment link, valid for 24 hours (admin use). */
export function createPaymentLink(booking: Booking, baseUrl: string): Promise<string> {
  const property = getCatalogEntry(booking.propertyId);
  const query = new URLSearchParams({
    type: "paid",
    ref: booking.id.slice(0, 8).toUpperCase(),
    property: property?.slug ?? "",
    checkIn: booking.checkIn,
    checkOut: booking.checkOut,
    total: String(booking.total),
  });
  return createCheckoutSession(booking, baseUrl, {
    expiresInMinutes: PAYMENT_LINK_HOURS * 60,
    successPath: `/booking-confirmation?${query.toString()}`,
    cancelPath: `/`,
  });
}

export type PaymentOutcome = "confirmed" | "processing" | "released" | "unpaid" | "unknown";

/**
 * Applies a Checkout session's state to its booking. Safe to call repeatedly
 * and from several places (webhook, return page, sweeper).
 */
export async function applyCheckoutSession(session: Stripe.Checkout.Session): Promise<PaymentOutcome> {
  const bookingId = session.metadata?.bookingId ?? session.client_reference_id;
  if (!bookingId) return "unknown";
  const booking = await storage.getBookingById(bookingId);
  if (!booking) return "unknown";

  if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
    const paymentRef =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? session.id;
    const updated = await storage.updateBooking(
      booking.id,
      { status: "confirmed", paymentIntentId: paymentRef },
      PAYABLE_STATUSES,
    );
    if (updated) {
      log(`booking ${booking.id} paid and confirmed`, "stripe");
      return "confirmed";
    }
    if (booking.status === "confirmed") return "confirmed";
    // Paid, but the booking was cancelled meanwhile (e.g. by an admin): the
    // dates may be taken, so flag it for a manual decision instead of confirming.
    log(`ATTENTION: booking ${booking.id} was paid while "${booking.status}"; review and refund in Stripe if needed`, "stripe");
    return "unknown";
  }

  if (session.status === "expired") {
    // Only an unpaid checkout hold releases its dates. Expired Pay Later links don't.
    const released = await storage.updateBooking(booking.id, { status: "cancelled" }, ["awaiting_payment"]);
    if (released) log(`booking ${booking.id} checkout expired; dates released`, "stripe");
    return "released";
  }

  return session.status === "complete" ? "processing" : "unpaid";
}

/** Looks up a session on Stripe (never trusting the browser) and applies it. */
export async function syncCheckoutSession(sessionId: string): Promise<PaymentOutcome> {
  const stripe = getStripe();
  if (!stripe || !/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return "unknown";
  try {
    return applyCheckoutSession(await stripe.checkout.sessions.retrieve(sessionId));
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) return "unknown";
    throw error;
  }
}

/** Guest pressed "back" on Stripe: expire the session and release the dates now. */
export async function abandonCheckout(bookingId: string): Promise<boolean> {
  const stripe = getStripe();
  const booking = await storage.getBookingById(bookingId);
  if (!stripe || !booking || booking.status !== "awaiting_payment") return false;
  const sessionId = booking.paymentIntentId;
  if (sessionId?.startsWith("cs_")) {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.status === "open") {
      await applyCheckoutSession(await stripe.checkout.sessions.expire(sessionId));
      return true;
    }
    await applyCheckoutSession(session);
    return (await storage.getBookingById(bookingId))?.status === "cancelled";
  }
  return !!(await storage.updateBooking(bookingId, { status: "cancelled" }, ["awaiting_payment"]));
}

/** Verifies a webhook's signature and applies checkout events. */
export async function handleWebhook(rawBody: Buffer, signature: string): Promise<void> {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) throw Object.assign(new Error("Stripe webhook is not configured"), { status: 503 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (error) {
    throw Object.assign(new Error(`Invalid signature: ${(error as Error).message}`), { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
    case "checkout.session.expired":
      await applyCheckoutSession(event.data.object);
      break;
    case "checkout.session.async_payment_failed":
      await storage.updateBooking(event.data.object.metadata?.bookingId ?? "", { status: "cancelled" }, ["awaiting_payment"]);
      break;
    default:
      break;
  }
}

/**
 * Backup for missed webhooks: re-checks holds older than the checkout window
 * and confirms or releases them based on Stripe's own record.
 */
async function sweepStaleHolds(): Promise<void> {
  const stripe = getStripe();
  if (!stripe) return;
  const cutoff = Date.now() - (CHECKOUT_HOLD_MINUTES + 2) * 60_000;
  const stale = (await storage.getBookings()).filter(
    (b) => b.status === "awaiting_payment" && b.createdAt && new Date(b.createdAt).getTime() < cutoff,
  );
  for (const booking of stale) {
    try {
      const sessionId = booking.paymentIntentId;
      if (!sessionId?.startsWith("cs_")) {
        // Checkout was never created (e.g. Stripe was down): release the dates.
        await storage.updateBooking(booking.id, { status: "cancelled" }, ["awaiting_payment"]);
        continue;
      }
      let session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.status === "open") session = await stripe.checkout.sessions.expire(sessionId);
      await applyCheckoutSession(session);
    } catch (error) {
      log(`could not check payment for booking ${booking.id}: ${(error as Error).message}`, "stripe");
    }
  }
}

export function startPaymentSweeper(): void {
  if (!cardPaymentsEnabled()) {
    log("card payments disabled (set STRIPE_SECRET_KEY to enable)", "stripe");
    return;
  }
  log(`card payments enabled (${isTestMode() ? "test" : "live"} mode)`, "stripe");
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    log("STRIPE_WEBHOOK_SECRET is not set; payments are confirmed when guests return and by a 5-minute check", "stripe");
  }
  void sweepStaleHolds();
  setInterval(() => void sweepStaleHolds(), 5 * 60_000).unref();
}
