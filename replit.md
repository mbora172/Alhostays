# Aloha Stays - Waikiki Vacation Rentals

## Overview
Aloha Stays is a vacation rental booking website for 2 properties in Waikiki, Hawaii. The site allows guests to browse properties, view availability, and complete bookings with either card payment or pay-later options.

## Project Structure
```
├── client/                    # Frontend React application
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   │   ├── navigation.tsx # Main navigation header
│   │   │   ├── footer.tsx     # Site footer
│   │   │   └── ui/            # Shadcn UI components
│   │   ├── pages/             # Page components
│   │   │   ├── home.tsx       # Homepage with hero, properties, testimonials
│   │   │   ├── properties.tsx # Properties listing page
│   │   │   ├── property-detail.tsx # Individual property details + booking
│   │   │   ├── booking.tsx    # Booking form and payment
│   │   │   ├── booking-confirmation.tsx # Confirmation page
│   │   │   ├── contact.tsx    # Contact form + FAQ
│   │   │   └── about.tsx      # About page with local recommendations
│   │   ├── lib/
│   │   │   ├── property-data.ts  # Static property data
│   │   │   └── queryClient.ts    # React Query configuration
│   │   ├── App.tsx            # Main app with routing
│   │   └── index.css          # Tailwind CSS styles
│   └── index.html             # Entry HTML with SEO tags
├── server/                    # Backend Express server
│   ├── routes.ts              # API endpoints
│   ├── storage.ts             # Postgres / JSON-file storage
│   ├── ical.ts                # iCal parser and writer
│   ├── calendar-sync.ts       # Scheduled import + export of calendars
│   ├── payments.ts            # Stripe Checkout, webhook, unpaid-hold sweeper
│   └── index.ts               # Server entry point
└── shared/
    ├── schema.ts              # Shared TypeScript types and Zod schemas
    └── catalog.ts             # Property rates, capacity and pricing (client + server)
```

## Features
- **Homepage**: Hero section, value propositions, property cards, testimonials, CTA
- **Property Listings**: Grid view of all properties with key details
- **Property Details**: Photo gallery, amenities, house rules, location, availability calendar, booking card
- **Booking Flow**: Guest info form, payment method selection (Card/Pay Later), price breakdown
- **Contact Page**: Inquiry form with FAQ accordion
- **About Page**: Company story and local recommendations

## API Endpoints
Public:
- `GET /api/availability/:propertyId` - Booked/blocked date ranges (no guest details)
- `POST /api/bookings` - Create a booking. The server re-checks availability (409 if taken) and recalculates the price
- `POST /api/inquiries` - Create an inquiry
- `POST /api/stripe/webhook` - Stripe webhook (signature-verified)
- `GET /api/checkout/:sessionId/status` - Payment result for the confirmation page (checked with Stripe)
- `GET /calendar/:slug.ics` - iCal feed for Airbnb/VRBO/Booking.com to import (`?exclude=airbnb` etc.)

Admin (require `Authorization: Bearer $ADMIN_TOKEN`): bookings, booking status, inquiries, manual date
blocks, and calendar sync status. See `docs/CALENDAR_SYNC.md`.

## Card Payments
Stripe Checkout. Set `STRIPE_SECRET_KEY` (plus `STRIPE_WEBHOOK_SECRET` and `PUBLIC_URL`) to enable the
card option; without it guests can only choose Pay Later. Full setup: `docs/STRIPE_SETUP.md`.

## Calendar Sync
Two-way iCal sync with Airbnb, VRBO and Booking.com. Feed URLs go in secrets named
`ICAL_PROPERTY_<n>_<SOURCE>`. Full setup: `docs/CALENDAR_SYNC.md`.

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Shadcn UI, React Query, Wouter
- **Backend**: Express.js, PostgreSQL via Drizzle when `DATABASE_URL` is set (JSON file fallback)
- **Validation**: Zod, Drizzle-Zod

## Running the Application
The application runs on port 5000 with `npm run dev`. Run tests with `npm test`.

## Design System
- Uses tropical/Hawaiian theme with ocean blue primary color (HSL 198 88% 48%)
- DM Sans for body text, Playfair Display for serif headings
- Follows Airbnb-inspired design patterns for vacation rentals
