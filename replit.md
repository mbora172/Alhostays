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
│   ├── storage.ts             # In-memory data storage
│   └── index.ts               # Server entry point
└── shared/
    └── schema.ts              # Shared TypeScript types and Zod schemas
```

## Features
- **Homepage**: Hero section, value propositions, property cards, testimonials, CTA
- **Property Listings**: Grid view of all properties with key details
- **Property Details**: Photo gallery, amenities, house rules, location, availability calendar, booking card
- **Booking Flow**: Guest info form, payment method selection (Card/Pay Later), price breakdown
- **Contact Page**: Inquiry form with FAQ accordion
- **About Page**: Company story and local recommendations

## API Endpoints
- `GET /api/bookings` - Get all bookings
- `GET /api/bookings/:id` - Get booking by ID
- `POST /api/bookings` - Create new booking
- `PATCH /api/bookings/:id/status` - Update booking status
- `GET /api/blocked-dates/:propertyId` - Get blocked dates for property
- `GET /api/inquiries` - Get all inquiries
- `POST /api/inquiries` - Create new inquiry

## Tech Stack
- **Frontend**: React, Vite, Tailwind CSS, Shadcn UI, React Query, Wouter
- **Backend**: Express.js, In-memory storage
- **Validation**: Zod, Drizzle-Zod

## Running the Application
The application runs on port 5000 with `npm run dev`.

## Design System
- Uses tropical/Hawaiian theme with ocean blue primary color (HSL 198 88% 48%)
- DM Sans for body text, Playfair Display for serif headings
- Follows Airbnb-inspired design patterns for vacation rentals
