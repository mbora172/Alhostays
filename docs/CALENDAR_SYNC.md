# Calendar sync (iCal)

The website is the hub that keeps every calendar in sync:

```
Airbnb ──┐                         ┌──> Airbnb      (imports .../sunset-paradise-suite.ics?exclude=airbnb)
VRBO ────┼──> Aloha Stays website ─┼──> VRBO        (imports ...?exclude=vrbo)
Booking ─┘    (imports every 15m)  └──> Booking.com (imports ...?exclude=booking)
```

- **Import:** the server fetches each platform's iCal feed every 15 minutes, and again right before
  accepting a website booking. Those dates are blocked on the website.
- **Export:** each property publishes one feed with website bookings, manual blocks and the dates
  imported from the other platforms. A platform that imports it learns about every booking made
  anywhere else.

If a platform is down or returns something that isn't a calendar, the last good data is kept. A
platform outage never makes booked dates look free.

## 1. Add each platform's export link (import into the website)

Get each listing's export URL:

- **Airbnb:** Listing → Availability → Connect calendars → *Export calendar*
- **VRBO:** Calendar → Import/Export → *Export*
- **Booking.com:** Rates & Availability → Sync calendars → *Export calendar*

Add one secret per property and platform (Replit: **Tools → Secrets**):

| Secret name | Value |
| --- | --- |
| `ICAL_PROPERTY_1_AIRBNB` | Airbnb export link for **Sunset Paradise Suite** |
| `ICAL_PROPERTY_1_VRBO` | VRBO export link for Sunset Paradise Suite |
| `ICAL_PROPERTY_2_AIRBNB` | Airbnb export link for **Diamond Head Retreat** |
| `ICAL_PROPERTY_2_BOOKING` | Booking.com export link for Diamond Head Retreat |

The last part of the name is the source label, and you can use any platform name. Use
`ICAL_PROPERTY_2_BOOKING` for Booking.com so it matches the `?exclude=booking` export link below.
Restart the app after you change secrets.

These links contain private tokens, so keep them in secrets and never commit them to the code.

## 2. Add the website's links to each platform (export from the website)

Replace `https://YOUR-DOMAIN` with the site's public address:

| Property | Paste into Airbnb | Paste into VRBO | Paste into Booking.com |
| --- | --- | --- | --- |
| Sunset Paradise Suite | `https://YOUR-DOMAIN/calendar/sunset-paradise-suite.ics?exclude=airbnb` | `...?exclude=vrbo` | `...?exclude=booking` |
| Diamond Head Retreat | `https://YOUR-DOMAIN/calendar/diamond-head-retreat.ics?exclude=airbnb` | `...?exclude=vrbo` | `...?exclude=booking` |

`?exclude=<platform>` leaves out that platform's own reservations so they don't echo back to it.
Use the link without `?exclude` for Google Calendar or other personal calendars.

- **Airbnb:** Availability → Connect calendars → *Import calendar*
- **VRBO:** Calendar → Import/Export → *Import calendar*
- **Booking.com:** Rates & Availability → Sync calendars → *Import calendar*

Each platform fetches the link on its own schedule. Airbnb takes about 2-3 hours, others can take
longer. The website's own imports run every 15 minutes, so a short delay on the other platforms is
expected and can't be shortened from our side.

## 3. Check it's working

Set an `ADMIN_TOKEN` secret, then:

```sh
# Status of every feed: last success, last error, number of blocked stays
curl -H "Authorization: Bearer $ADMIN_TOKEN" https://YOUR-DOMAIN/api/ical/admin/status

# Sync right now instead of waiting for the next 15-minute run
curl -X POST -H "Authorization: Bearer $ADMIN_TOKEN" https://YOUR-DOMAIN/api/ical/admin/sync
```

The server log prints a `[ical]` line on every sync and names any failing feed.

## Settings

| Variable | Default | Purpose |
| --- | --- | --- |
| `ICAL_PROPERTY_<n>_<SOURCE>` | - | Feed URL for property `n` from platform `SOURCE` |
| `ICAL_FEEDS` | - | Optional alternative: `{"property-1":{"airbnb":"https://..."}}` |
| `ICAL_SYNC_INTERVAL_MINUTES` | `15` | How often to import (minimum 5) |
| `DATABASE_URL` | - | Postgres connection. Strongly recommended in production. |
| `DATA_FILE` | `data/store.json` | Where bookings are saved when there's no database |
| `ADMIN_TOKEN` | - | Enables the admin endpoints below |

**Use a database in production.** Replit Autoscale deployments don't keep files between restarts.
Without `DATABASE_URL`, website bookings saved to `data/store.json` would be lost and would vanish
from the exported calendar. With a database, the tables are created automatically on startup.

## Admin API

All admin endpoints require `Authorization: Bearer <ADMIN_TOKEN>`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/bookings` | List bookings |
| `PATCH` | `/api/bookings/:id/status` | Set `pending`, `pending_payment`, `confirmed`, `cancelled` or `declined`. Cancelled and declined bookings free their dates on every calendar. |
| `GET` | `/api/inquiries` | List contact-form messages |
| `POST` | `/api/blocked-dates` | Block dates manually: `{"propertyId":"property-1","startDate":"2026-12-24","endDate":"2026-12-27"}` (`endDate` is the checkout day) |
| `DELETE` | `/api/blocked-dates/:id` | Remove a manual block |
| `GET` | `/api/ical/admin/status` | Sync status and every export link |
| `POST` | `/api/ical/admin/sync` | Sync all feeds now |
