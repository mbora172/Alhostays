import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";
import Stripe from "stripe";
import type { AddressInfo } from "node:net";

// Isolated storage file; must be set before ./storage is first imported.
const dataFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "alohastays-")), "store.json");
process.env.DATA_FILE = dataFile;
process.env.STRIPE_WEBHOOK_SECRET = "whsec_test_secret";

const { storage } = await import("./storage");
const payments = await import("./payments");

// --- A small fake of the Stripe Checkout API, used through the real SDK ---

interface FakeSession {
  id: string;
  object: "checkout.session";
  status: "open" | "complete" | "expired";
  payment_status: "unpaid" | "paid";
  payment_intent: string | null;
  url: string;
  metadata: Record<string, string>;
  client_reference_id: string | null;
}

const sessions = new Map<string, FakeSession>();
const createRequests: URLSearchParams[] = [];
let server: http.Server;
let stripe: Stripe;

before(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const send = (status: number, obj: unknown) => {
        res.writeHead(status, { "content-type": "application/json" });
        res.end(JSON.stringify(obj));
      };
      const form = new URLSearchParams(body);
      const m = req.url!.match(/^\/v1\/checkout\/sessions(?:\/([^/?]+))?(\/expire)?/);
      if (!m) return send(404, { error: { message: "not found" } });
      const [, id, expire] = m;
      if (req.method === "POST" && !id) {
        createRequests.push(form);
        const sessionId = `cs_test_${sessions.size + 1}`;
        const session: FakeSession = {
          id: sessionId,
          object: "checkout.session",
          status: "open",
          payment_status: "unpaid",
          payment_intent: null,
          url: `https://checkout.stripe.test/${sessionId}`,
          metadata: { bookingId: form.get("metadata[bookingId]")!, propertyId: form.get("metadata[propertyId]")! },
          client_reference_id: form.get("client_reference_id"),
        };
        sessions.set(sessionId, session);
        return send(200, session);
      }
      const session = id ? sessions.get(id) : undefined;
      if (!session) return send(404, { error: { message: "No such session", type: "invalid_request_error" } });
      if (req.method === "POST" && expire) {
        session.status = "expired";
        return send(200, session);
      }
      return send(200, session);
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  stripe = new Stripe("sk_test_fake", { host: "localhost", port, protocol: "http", maxNetworkRetries: 0 });
  payments.setStripeClient(stripe);
});

after(() => {
  server.close();
  fs.rmSync(path.dirname(dataFile), { recursive: true, force: true });
});

let n = 0;
async function newBooking(status = "awaiting_payment") {
  n++;
  const booking = await storage.createBookingIfAvailable({
    propertyId: "property-1",
    guestName: "Test Guest",
    guestEmail: "guest@example.com",
    guestPhone: "8085551234",
    guestCountry: null,
    checkIn: `2027-0${n}-10`,
    checkOut: `2027-0${n}-13`,
    guests: 2,
    specialRequests: null,
    nightlyRate: 289,
    nights: 3,
    cleaningFee: 150,
    serviceFee: 104,
    taxes: 41,
    total: 1162,
    status,
    paymentMethod: "card",
    paymentIntentId: null,
  });
  assert.ok(booking);
  return booking;
}

const startCheckout = (booking: Awaited<ReturnType<typeof newBooking>>) =>
  payments.createCheckoutSession(booking, "https://alohastays.test", {
    expiresInMinutes: payments.CHECKOUT_HOLD_MINUTES,
    successPath: "/booking-confirmation?type=paid",
    cancelPath: `/booking?cancelled=${booking.id}`,
  });

test("checkout charges the server-computed total in USD and links the booking", async () => {
  const booking = await newBooking();
  const before = Math.floor(Date.now() / 1000);
  const url = await startCheckout(booking);

  const form = createRequests.at(-1)!;
  assert.equal(url, "https://checkout.stripe.test/cs_test_1");
  assert.equal(form.get("mode"), "payment");
  assert.equal(form.get("line_items[0][price_data][currency]"), "usd");
  assert.equal(form.get("line_items[0][price_data][unit_amount]"), "116200");
  assert.equal(form.get("line_items[0][quantity]"), "1");
  assert.equal(form.get("customer_email"), "guest@example.com");
  assert.equal(form.get("metadata[bookingId]"), booking.id);
  assert.equal(form.get("payment_intent_data[metadata][bookingId]"), booking.id);
  assert.equal(
    form.get("success_url"),
    "https://alohastays.test/booking-confirmation?type=paid&session_id={CHECKOUT_SESSION_ID}",
  );
  assert.equal(form.get("cancel_url"), `https://alohastays.test/booking?cancelled=${booking.id}`);
  const expiresAt = Number(form.get("expires_at"));
  assert.ok(expiresAt >= before + 30 * 60 && expiresAt <= before + 30 * 60 + 5);

  assert.equal((await storage.getBookingById(booking.id))?.paymentIntentId, "cs_test_1");
});

test("unknown or malformed session ids confirm nothing", async () => {
  assert.equal(await payments.syncCheckoutSession("cs_test_does_not_exist"), "unknown");
  assert.equal(await payments.syncCheckoutSession("../../v1/customers"), "unknown");
});

test("a paid session confirms the booking, idempotently", async () => {
  const booking = await newBooking();
  await startCheckout(booking);
  const session = sessions.get((await storage.getBookingById(booking.id))!.paymentIntentId!)!;

  assert.equal(await payments.syncCheckoutSession(session.id), "unpaid");
  assert.equal((await storage.getBookingById(booking.id))?.status, "awaiting_payment");

  Object.assign(session, { status: "complete", payment_status: "paid", payment_intent: "pi_123" });
  assert.equal(await payments.syncCheckoutSession(session.id), "confirmed");
  assert.equal(await payments.syncCheckoutSession(session.id), "confirmed");
  const updated = await storage.getBookingById(booking.id);
  assert.equal(updated?.status, "confirmed");
  assert.equal(updated?.paymentIntentId, "pi_123");
});

test("an expired checkout releases held dates but not Pay Later requests", async () => {
  const hold = await newBooking("awaiting_payment");
  await startCheckout(hold);
  const holdSession = sessions.get((await storage.getBookingById(hold.id))!.paymentIntentId!)!;
  holdSession.status = "expired";
  assert.equal(await payments.syncCheckoutSession(holdSession.id), "released");
  assert.equal((await storage.getBookingById(hold.id))?.status, "cancelled");

  const request = await newBooking("pending_payment");
  await payments.createPaymentLink(request, "https://alohastays.test");
  const linkSession = sessions.get((await storage.getBookingById(request.id))!.paymentIntentId!)!;
  linkSession.status = "expired";
  await payments.syncCheckoutSession(linkSession.id);
  assert.equal((await storage.getBookingById(request.id))?.status, "pending_payment");
});

test("a Pay Later link lasts 24 hours and confirms the request when paid", async () => {
  const request = await newBooking("pending_payment");
  const before = Math.floor(Date.now() / 1000);
  await payments.createPaymentLink(request, "https://alohastays.test");
  const form = createRequests.at(-1)!;
  assert.ok(Number(form.get("expires_at")) >= before + 24 * 3600);
  const session = sessions.get((await storage.getBookingById(request.id))!.paymentIntentId!)!;
  Object.assign(session, { status: "complete", payment_status: "paid", payment_intent: "pi_later" });
  assert.equal(await payments.syncCheckoutSession(session.id), "confirmed");
  assert.equal((await storage.getBookingById(request.id))?.status, "confirmed");
});

test("payment for a booking cancelled meanwhile is not auto-confirmed", async () => {
  const booking = await newBooking();
  await startCheckout(booking);
  const session = sessions.get((await storage.getBookingById(booking.id))!.paymentIntentId!)!;
  await storage.updateBookingStatus(booking.id, "cancelled");
  Object.assign(session, { status: "complete", payment_status: "paid", payment_intent: "pi_late" });
  assert.equal(await payments.syncCheckoutSession(session.id), "unknown");
  assert.equal((await storage.getBookingById(booking.id))?.status, "cancelled");
});

test("abandoning checkout expires the Stripe session and frees the dates", async () => {
  const booking = await newBooking();
  await startCheckout(booking);
  const sessionId = (await storage.getBookingById(booking.id))!.paymentIntentId!;
  assert.equal(await payments.abandonCheckout(booking.id), true);
  assert.equal(sessions.get(sessionId)?.status, "expired");
  assert.equal((await storage.getBookingById(booking.id))?.status, "cancelled");
  // A second call (e.g. page reload) is harmless.
  assert.equal(await payments.abandonCheckout(booking.id), false);
});

test("webhooks are signature-checked and confirm paid checkouts", async () => {
  const booking = await newBooking();
  await startCheckout(booking);
  const session = sessions.get((await storage.getBookingById(booking.id))!.paymentIntentId!)!;
  Object.assign(session, { status: "complete", payment_status: "paid", payment_intent: "pi_hook" });

  const payload = JSON.stringify({
    id: "evt_1",
    object: "event",
    type: "checkout.session.completed",
    data: { object: session },
  });

  await assert.rejects(
    payments.handleWebhook(Buffer.from(payload), "t=1,v1=forged"),
    (err: Error & { status?: number }) => err.status === 400,
  );
  assert.equal((await storage.getBookingById(booking.id))?.status, "awaiting_payment");

  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: "whsec_test_secret" });
  await payments.handleWebhook(Buffer.from(payload), signature);
  assert.equal((await storage.getBookingById(booking.id))?.status, "confirmed");
});
