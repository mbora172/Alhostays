// Minimal, dependency-free iCalendar (RFC 5545) reader and writer for
// vacation-rental availability feeds (Airbnb, VRBO, Booking.com, Google, ...).

import { addDays } from "@shared/catalog";

export interface ParsedEvent {
  uid: string;
  startDate: string; // yyyy-MM-dd, first blocked night
  endDate: string; // yyyy-MM-dd, checkout day (exclusive)
  summary: string;
}

interface ContentLine {
  name: string;
  params: Record<string, string>;
  value: string;
}

const HAWAII_OFFSET_MS = 10 * 3_600_000; // Honolulu is UTC-10 all year

/** Undo RFC 5545 line folding (CRLF followed by a space or tab). */
function unfold(text: string): string[] {
  return text
    .replace(/^\uFEFF/, "")
    .replace(/\r\n|\r/g, "\n")
    .replace(/\n[ \t]/g, "")
    .split("\n")
    .filter((line) => line.trim().length > 0);
}

function parseContentLine(line: string): ContentLine | null {
  // The value starts at the first ':' that is not inside a quoted parameter value.
  let inQuotes = false;
  let colon = -1;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (ch === ":" && !inQuotes) {
      colon = i;
      break;
    }
  }
  if (colon === -1) return null;

  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const parts = head.match(/(?:[^;"]|"[^"]*")+/g) ?? [];
  const name = (parts.shift() ?? "").toUpperCase();
  const params: Record<string, string> = {};
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    params[part.slice(0, eq).toUpperCase()] = part.slice(eq + 1).replace(/^"|"$/g, "");
  }
  return { name, params, value };
}

function unescapeText(value: string): string {
  return value.replace(/\\([\\;,nN])/g, (_, ch: string) => (ch === "n" || ch === "N" ? "\n" : ch));
}

/**
 * Converts a DATE or DATE-TIME value to a Hawaii-local calendar date.
 * UTC times ("...Z") are shifted to Honolulu time; floating and TZID times are
 * already local to the listing, so their date part is used as-is.
 */
export function icalValueToDate(value: string): string | null {
  const m = value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?$/);
  if (!m) return null;
  const [, y, mo, d, hh, mi, ss, z] = m;
  if (hh !== undefined && z) {
    const utc = Date.UTC(+y, +mo - 1, +d, +hh, +mi, +(ss ?? 0));
    return new Date(utc - HAWAII_OFFSET_MS).toISOString().slice(0, 10);
  }
  return `${y}-${mo}-${d}`;
}

/** Whole days in an ISO 8601 duration such as P3D, P1W or P2DT4H (rounded up). */
function durationToDays(value: string): number {
  const m = value.match(/^[+]?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 1;
  const [, w, d, h, mi, s] = m.map((x) => (x ? Number(x) : 0));
  const days = w * 7 + d + (h * 3600 + mi * 60 + s) / 86400;
  return Math.max(1, Math.ceil(days));
}

/**
 * Parses an iCalendar document into blocked date ranges.
 * Cancelled and "free" (TRANSP:TRANSPARENT) events are ignored.
 * Throws if the text is not an iCalendar document, so callers never mistake an
 * HTML error page for an empty calendar.
 */
export function parseIcal(text: string): ParsedEvent[] {
  const lines = unfold(text);
  if (!lines.some((l) => l.trim().toUpperCase() === "BEGIN:VCALENDAR")) {
    throw new Error("Response is not an iCalendar feed (missing BEGIN:VCALENDAR)");
  }

  const events: ParsedEvent[] = [];
  let current: Record<string, ContentLine> | null = null;
  let depth = 0; // nested components inside VEVENT (e.g. VALARM)

  for (const raw of lines) {
    const line = parseContentLine(raw);
    if (!line) continue;

    if (line.name === "BEGIN") {
      if (line.value.toUpperCase() === "VEVENT" && !current) {
        current = {};
        depth = 0;
      } else if (current) {
        depth++;
      }
      continue;
    }
    if (line.name === "END") {
      if (!current) continue;
      if (depth > 0) {
        depth--;
        continue;
      }
      if (line.value.toUpperCase() === "VEVENT") {
        const event = toEvent(current, events.length);
        if (event) events.push(event);
        current = null;
      }
      continue;
    }
    if (current && depth === 0 && !(line.name in current)) {
      current[line.name] = line;
    }
  }

  return events;
}

function toEvent(props: Record<string, ContentLine>, index: number): ParsedEvent | null {
  if (props.STATUS?.value.trim().toUpperCase() === "CANCELLED") return null;
  if (props.TRANSP?.value.trim().toUpperCase() === "TRANSPARENT") return null;

  const startDate = props.DTSTART ? icalValueToDate(props.DTSTART.value) : null;
  if (!startDate) return null;

  let endDate = props.DTEND ? icalValueToDate(props.DTEND.value) : null;
  if (!endDate && props.DURATION) {
    endDate = addDays(startDate, durationToDays(props.DURATION.value.trim()));
  }
  // A missing or zero-length end still blocks the start night.
  if (!endDate || endDate <= startDate) endDate = addDays(startDate, 1);

  const summary = props.SUMMARY ? unescapeText(props.SUMMARY.value).trim() : "";
  const uid = props.UID?.value.trim() || `${startDate}_${endDate}_${index}`;
  return { uid, startDate, endDate, summary };
}

// --- Writer ---

export interface ExportEvent {
  uid: string;
  startDate: string;
  endDate: string;
  summary: string;
  description?: string;
}

function escapeText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Folds a content line to at most 75 octets per line, as RFC 5545 requires. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const chunks: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Never split a multi-byte UTF-8 character.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    chunks.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // continuation lines start with a space
  }
  return chunks.join("\r\n ");
}

function toIcalDate(date: string): string {
  return date.replace(/-/g, "");
}

function toIcalTimestamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function buildIcal(calendarName: string, events: ExportEvent[], now: Date = new Date()): string {
  const stamp = toIcalTimestamp(now);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aloha Stays//Availability Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(calendarName)}`,
    "X-WR-TIMEZONE:Pacific/Honolulu",
  ];
  for (const event of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${escapeText(event.uid)}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${toIcalDate(event.startDate)}`,
      `DTEND;VALUE=DATE:${toIcalDate(event.endDate)}`,
      `SUMMARY:${escapeText(event.summary)}`,
    );
    if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
    lines.push("TRANSP:OPAQUE", "END:VEVENT");
  }
  lines.push("END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}
