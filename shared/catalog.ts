// Booking-relevant property facts shared by the client and the server, so the
// server can validate bookings and recompute prices instead of trusting the client.

export interface PropertyCatalogEntry {
  id: string;
  name: string;
  slug: string;
  capacity: number;
  nightlyRate: number;
  cleaningFee: number;
  weeklyDiscount: number;
  monthlyDiscount: number;
}

export const propertyCatalog: PropertyCatalogEntry[] = [
  {
    id: "property-1",
    name: "Sunset Paradise Suite",
    slug: "sunset-paradise-suite",
    capacity: 6,
    nightlyRate: 289,
    cleaningFee: 150,
    weeklyDiscount: 10,
    monthlyDiscount: 20,
  },
  {
    id: "property-2",
    name: "Diamond Head Retreat",
    slug: "diamond-head-retreat",
    capacity: 4,
    nightlyRate: 199,
    cleaningFee: 100,
    weeklyDiscount: 10,
    monthlyDiscount: 20,
  },
];

export function getCatalogEntry(id: string): PropertyCatalogEntry | undefined {
  return propertyCatalog.find((p) => p.id === id);
}

export const SERVICE_FEE_RATE = 0.12;
export const TAX_RATE = 0.0425;

export interface PriceBreakdown {
  nightlyRate: number;
  nights: number;
  subtotal: number;
  discount: number;
  discountAmount: number;
  discountedSubtotal: number;
  cleaningFee: number;
  serviceFee: number;
  taxes: number;
  total: number;
}

export function calculatePricing(
  property: Pick<PropertyCatalogEntry, "nightlyRate" | "cleaningFee" | "weeklyDiscount" | "monthlyDiscount">,
  nights: number,
): PriceBreakdown | null {
  if (!Number.isInteger(nights) || nights <= 0) return null;

  let discount = 0;
  if (nights >= 30 && property.monthlyDiscount) {
    discount = property.monthlyDiscount;
  } else if (nights >= 7 && property.weeklyDiscount) {
    discount = property.weeklyDiscount;
  }

  const subtotal = property.nightlyRate * nights;
  const discountAmount = Math.round(subtotal * (discount / 100));
  const discountedSubtotal = subtotal - discountAmount;
  const serviceFee = Math.round(discountedSubtotal * SERVICE_FEE_RATE);
  const taxes = Math.round((discountedSubtotal + serviceFee) * TAX_RATE);
  const total = discountedSubtotal + property.cleaningFee + serviceFee + taxes;

  return {
    nightlyRate: property.nightlyRate,
    nights,
    subtotal,
    discount,
    discountAmount,
    discountedSubtotal,
    cleaningFee: property.cleaningFee,
    serviceFee,
    taxes,
    total,
  };
}

// --- Date helpers (all dates are "yyyy-MM-dd" strings in Hawaii local time) ---

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string): boolean {
  if (!DATE_RE.test(value)) return false;
  const d = new Date(value + "T00:00:00Z");
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function nightsBetween(checkIn: string, checkOut: string): number {
  const ms = Date.parse(checkOut + "T00:00:00Z") - Date.parse(checkIn + "T00:00:00Z");
  return Math.round(ms / 86_400_000);
}

export function addDays(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Blocked ranges use iCal semantics: startDate is the first occupied night and
 * endDate is the checkout day (exclusive). Two stays overlap only if they share
 * a night, so a checkout and a check-in on the same day do not conflict.
 */
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart < bEnd && bStart < aEnd;
}

/** Today's date in Honolulu (UTC-10, no daylight saving). */
export function todayInHawaii(now: Date = new Date()): string {
  return new Date(now.getTime() - 10 * 3_600_000).toISOString().slice(0, 10);
}
