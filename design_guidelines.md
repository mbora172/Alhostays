# Aloha Stays Design Guidelines

## Design Approach

**Reference-Based: Airbnb-Inspired Tropical Hospitality**

Drawing from Airbnb's proven vacation rental patterns with Hawaii-specific warmth. Key principles:
- Photo-first storytelling with generous imagery
- Clean, spacious layouts that evoke relaxation
- Trust-building through transparency and detail
- Seamless booking flow that reduces friction

---

## Typography

**Font Stack:**
- Primary: Inter or DM Sans (clean, modern readability)
- Accent: Optional serif for property names (Playfair Display or Lora for elegance)

**Hierarchy:**
- Hero H1: text-5xl md:text-6xl font-bold (make it inviting)
- Section H2: text-3xl md:text-4xl font-semibold
- Property Titles: text-2xl font-semibold
- Body: text-base md:text-lg (generous line-height for easy reading)
- Labels/Meta: text-sm text-gray-600

---

## Layout & Spacing

**Spacing Units:** Tailwind 4, 6, 8, 12, 16, 20, 24 for vertical rhythm

**Container Strategy:**
- Full-width hero with max-w-7xl inner content
- Content sections: max-w-6xl mx-auto px-4 md:px-8
- Property detail grids: max-w-7xl (needs room for gallery)

**Vertical Rhythm:**
- Section padding: py-16 md:py-24
- Component spacing: mb-12 md:mb-16 between major blocks
- Card internal: p-6 md:p-8

---

## Core Components

### Homepage Structure

**Hero Section** (h-[85vh])
- Full-width background image of Waikiki beach/sunset
- Centered content with semi-transparent overlay
- H1 + subtitle with generous spacing (mb-6)
- Two CTAs side-by-side (View Properties + Book Now) with blurred glass backgrounds

**Value Props** (py-16)
- 5 items in grid: grid-cols-2 md:grid-cols-5 gap-8
- Icon + text vertical layout
- Center-aligned

**Property Cards** (py-20)
- Two-column grid: grid-cols-1 md:grid-cols-2 gap-8
- Each card: Aspect-ratio 4:3 image, rounded-xl, overflow-hidden
- Overlay gradient on hover revealing "View Details"
- Below image: Title, capacity, price prominent, quick amenities list

**Testimonials** (py-20)
- Three-column grid: grid-cols-1 md:grid-cols-3 gap-6
- Card style with subtle shadow, p-6
- 5-star rating at top, quote, guest name/photo

**Final CTA** (py-24)
- Centered, background image of property interior
- Large heading + primary button

### Property Detail Pages

**Photo Gallery** (full-width)
- Primary layout: Large main image (2/3 width) + 4 smaller images (1/3) in 2x2 grid
- Click opens lightbox gallery with all 10-15 images
- Rounded corners on desktop, full-bleed mobile

**Content Layout** (two-column: 2/3 content + 1/3 booking card)
- Left column (max-w-3xl): Overview, amenities (grid-cols-2), house rules, location
- Right column (sticky): Booking card with calendar, pricing, CTA (shadow-lg, rounded-lg, p-6)

**Amenities Grid**
- grid-cols-2 md:grid-cols-3 gap-4
- Icon + label per item

**Location Section**
- Google Maps embed (h-96 rounded-lg)
- List of nearby attractions with distances

### Booking Flow

**Booking Page** (centered, max-w-4xl)
- Two-column layout: Left (booking summary card), Right (guest form)
- Summary card: sticky, shadow-lg, all pricing details clearly itemized
- Payment options as radio cards with descriptive copy
- Prominent total at bottom
- Full-width CTA button

### Contact Page

**Split Layout**
- Left (w-1/2): Contact form with generous spacing between fields
- Right (w-1/2): Contact info, office hours, map
- FAQ accordion below (full-width)

---

## Visual Specifications

**Cards & Containers:**
- Rounded corners: rounded-lg to rounded-xl
- Shadows: shadow-md for cards, shadow-lg for elevated elements (booking card)
- Borders: Minimal, use shadow instead when possible

**Buttons:**
- Primary CTA: Large (px-8 py-4), rounded-lg, bold text
- Secondary: Outlined variant
- On hero images: Backdrop blur effect (backdrop-blur-md bg-white/30)

**Forms:**
- Inputs: border rounded-lg px-4 py-3, focus:ring-2 states
- Generous spacing: mb-6 between fields
- Labels: text-sm font-medium mb-2

**Calendar Component:**
- Clean grid layout
- Disabled dates clearly grayed out
- Selected range highlighted distinctly
- Mobile-friendly touch targets (min 44px)

---

## Images Strategy

**Critical Images Required:**

1. **Homepage Hero**: Wide Waikiki beach sunset or property exterior with ocean view (full-width, h-[85vh])
2. **Property Cards**: Exterior shot of each property showing building/location (aspect-ratio 4:3)
3. **Property Detail Gallery**: 10-15 images per property:
   - Bedroom views (2-3)
   - Living room (2)
   - Kitchen (1-2)
   - Bathroom (1)
   - Balcony/view (2)
   - Building exterior
   - Neighborhood/beach proximity
4. **About Page**: Owner/local imagery establishing trust
5. **CTA Sections**: Inviting interior shots with warm lighting

**Image Treatment:**
- Hero: Subtle overlay gradient (from-black/40 to-transparent)
- Cards: Maintain vibrant colors, slight contrast boost
- Gallery: Consistent aspect ratios, optimize for fast loading

---

## Mobile Responsiveness

- Stack all multi-column layouts to single column below md breakpoint
- Booking card moves below property details on mobile
- Gallery switches to vertical scroll/swipe on mobile
- Touch-friendly spacing (min-h-12 for tappable elements)
- Hamburger navigation on mobile with full-screen overlay menu

---

This design creates an inviting, trustworthy vacation rental experience that balances Airbnb's familiarity with Hawaii's warmth and natural beauty.