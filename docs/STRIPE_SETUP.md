# Card payments (Stripe)

Guests who choose **Pay Now with Card** go to a secure Stripe Checkout page and pay the exact total the
server calculated. Card details never touch this website.

How a card booking works:

1. The guest submits the booking form. The dates are **held for 30 minutes** (status `awaiting_payment`),
   so nobody else can book them on the website, and they show as reserved in the exported calendars.
2. The guest pays on Stripe and lands on the confirmation page. The booking becomes `confirmed`.
3. If the guest presses **Back** on Stripe, or doesn't pay within 30 minutes, the hold is cancelled and the
   dates free up again everywhere.

The site confirms payments three ways, so a missed one doesn't matter: Stripe's webhook, the guest
returning to the confirmation page, and a check every 5 minutes. The confirmation page always asks Stripe
directly, so a tampered link can't mark a booking as paid.

Until `STRIPE_SECRET_KEY` is set, the card option is greyed out and guests can only choose Pay Later.

## Setup

### 1. Start in test mode

In the Stripe Dashboard, turn on **Test mode**, then open **Developers → API keys** and copy the
**Secret key** (`sk_test_...`). Add these secrets (Replit: **Tools → Secrets**):

| Secret | Value |
| --- | --- |
| `STRIPE_SECRET_KEY` | `sk_test_...` |
| `PUBLIC_URL` | Your site's address, e.g. `https://alohastays.com` (no trailing slash). Stripe sends guests back here after paying. |

Restart the app. The booking page shows a test-mode note. Pay with card `4242 4242 4242 4242`, any
future expiry date and any CVC.

### 2. Add the webhook

In **Developers → Webhooks → Add endpoint**:

- **Endpoint URL:** `https://YOUR-DOMAIN/api/stripe/webhook`
- **Events:**
  - `checkout.session.completed`
  - `checkout.session.async_payment_succeeded`
  - `checkout.session.async_payment_failed`
  - `checkout.session.expired`

Copy the endpoint's **Signing secret** (`whsec_...`) into a `STRIPE_WEBHOOK_SECRET` secret and restart.

### 3. Go live

When a test booking works end to end, repeat steps 1 and 2 with Test mode **off**: use the live secret key
(`sk_live_...`) and create a live webhook endpoint with its own signing secret. Test and live keys and
webhooks are separate.

Also check under **Settings**:

- **Business details / Public details:** the business name and statement descriptor guests see on the
  checkout page and their card statement.
- **Customer emails:** turn on **Successful payments** so guests get a Stripe receipt automatically.

## Pay Later bookings

To collect payment for a Pay Later request, create a Stripe payment link for it (valid 24 hours) and email
it to the guest:

```sh
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" \
  https://YOUR-DOMAIN/api/bookings/<booking-id>/payment-link
```

When the guest pays, the booking becomes `confirmed` automatically. Pay Later bookings keep holding their
dates until you cancel or decline them.

## Refunds and cancellations

Issue refunds from the Stripe Dashboard (**Payments → select payment → Refund**), then cancel the booking
so its dates are released:

```sh
curl -X PATCH -H "Authorization: Bearer $ADMIN_TOKEN" -H "Content-Type: application/json" \
  -d '{"status":"cancelled"}' https://YOUR-DOMAIN/api/bookings/<booking-id>/status
```

If a guest somehow pays for a booking that was already cancelled, it is **not** confirmed automatically
(the dates may have been rebooked). The server log shows an `ATTENTION` line naming the booking, so you
can refund it or reinstate it.

## Settings

| Secret | Required | Purpose |
| --- | --- | --- |
| `STRIPE_SECRET_KEY` | Yes, for card payments | `sk_test_...` or `sk_live_...` |
| `STRIPE_WEBHOOK_SECRET` | Recommended | Confirms payments instantly via webhook |
| `PUBLIC_URL` | Recommended | Site address used in Stripe redirect links |
