import { format } from "date-fns";
import type { UnavailableRange } from "@shared/schema";

/**
 * Unavailable ranges use iCal semantics: startDate is the first booked night,
 * endDate is the checkout day and is itself free to check in on.
 */

export const toDateKey = (date: Date) => format(date, "yyyy-MM-dd");

export function isNightBooked(dateKey: string, ranges: UnavailableRange[]): boolean {
  return ranges.some((r) => r.startDate <= dateKey && dateKey < r.endDate);
}

/** The first booked night after `fromKey`; the latest possible checkout date. */
export function nextBookedNight(fromKey: string, ranges: UnavailableRange[]): string | null {
  let next: string | null = null;
  for (const r of ranges) {
    if (r.startDate > fromKey && (next === null || r.startDate < next)) next = r.startDate;
  }
  return next;
}

/** True if every night from checkIn up to (not including) checkOut is free. */
export function isStayAvailable(checkIn: string, checkOut: string, ranges: UnavailableRange[]): boolean {
  return !ranges.some((r) => r.startDate < checkOut && checkIn < r.endDate);
}
