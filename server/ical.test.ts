import { test } from "node:test";
import assert from "node:assert/strict";
import { parseIcal, buildIcal, icalValueToDate } from "./ical";
import { loadFeedConfig } from "./calendar-sync";
import { calculatePricing, rangesOverlap, todayInHawaii } from "@shared/catalog";

const crlf = (lines: string[]) => lines.join("\r\n") + "\r\n";

test("parses an Airbnb feed (all-day dates, folded lines)", () => {
  const feed = crlf([
    "BEGIN:VCALENDAR",
    "PRODID;X-RICAL-TZSOURCE=TZINFO:-//Airbnb Inc//Hosting Calendar 0.8.8//EN",
    "CALSCALE:GREGORIAN",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    "DTEND;VALUE=DATE:20261015",
    "DTSTART;VALUE=DATE:20261010",
    "UID:1418fb94e984-ef0a2c8c2d5b0e4ad0b8bc8b8d1f2b7e@airbnb.com",
    "DESCRIPTION:Reservation URL: https://www.airbnb.com/hosting/reservations/details/HM",
    " ABCDEF1234\\nPhone Number (Last 4 Digits): 1234",
    "SUMMARY:Reserved",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "DTEND;VALUE=DATE:20261120",
    "DTSTART;VALUE=DATE:20261118",
    "UID:7f2a-blocked@airbnb.com",
    "SUMMARY:Airbnb (Not available)",
    "END:VEVENT",
    "END:VCALENDAR",
  ]);
  assert.deepEqual(parseIcal(feed), [
    {
      uid: "1418fb94e984-ef0a2c8c2d5b0e4ad0b8bc8b8d1f2b7e@airbnb.com",
      startDate: "2026-10-10",
      endDate: "2026-10-15",
      summary: "Reserved",
    },
    { uid: "7f2a-blocked@airbnb.com", startDate: "2026-11-18", endDate: "2026-11-20", summary: "Airbnb (Not available)" },
  ]);
});

test("parses a VRBO feed with LF line endings and DATE-TIME values in UTC", () => {
  const feed = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HomeAway.com, Inc.//EN",
    "BEGIN:VEVENT",
    "UID:2c7d8a@vrbo.com",
    // 4pm Hawaii check-in on Dec 1 == 02:00Z on Dec 2
    "DTSTART:20261202T020000Z",
    // 10am Hawaii checkout on Dec 5 == 20:00Z on Dec 5
    "DTEND:20261205T200000Z",
    "SUMMARY:Reserved - Jane",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\n");
  const [event] = parseIcal(feed);
  assert.equal(event.startDate, "2026-12-01");
  assert.equal(event.endDate, "2026-12-05");
});

test("parses Booking.com style feeds with TZID, quoted params and no SUMMARY", () => {
  const feed = crlf([
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    'DTSTART;TZID="Pacific/Honolulu":20270103T150000',
    'DTEND;TZID="Pacific/Honolulu":20270106T110000',
    "UID:bdc-123",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "DTSTART:19700101T000000",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ]);
  assert.deepEqual(parseIcal(feed), [{ uid: "bdc-123", startDate: "2027-01-03", endDate: "2027-01-06", summary: "" }]);
});

test("skips cancelled and transparent events", () => {
  const feed = crlf([
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "UID:a",
    "DTSTART;VALUE=DATE:20261001",
    "DTEND;VALUE=DATE:20261003",
    "STATUS:CANCELLED",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:b",
    "DTSTART;VALUE=DATE:20261001",
    "DTEND;VALUE=DATE:20261003",
    "TRANSP:TRANSPARENT",
    "END:VEVENT",
    "END:VCALENDAR",
  ]);
  assert.deepEqual(parseIcal(feed), []);
});

test("handles missing DTEND, DURATION and zero-length events", () => {
  const feed = crlf([
    "BEGIN:VCALENDAR",
    "BEGIN:VEVENT",
    "UID:no-end",
    "DTSTART;VALUE=DATE:20261001",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:duration",
    "DTSTART;VALUE=DATE:20261010",
    "DURATION:P1W",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:same-day",
    "DTSTART;VALUE=DATE:20261020",
    "DTEND;VALUE=DATE:20261020",
    "END:VEVENT",
    "END:VCALENDAR",
  ]);
  const events = parseIcal(feed);
  assert.deepEqual(
    events.map((e) => [e.uid, e.startDate, e.endDate]),
    [
      ["no-end", "2026-10-01", "2026-10-02"],
      ["duration", "2026-10-10", "2026-10-17"],
      ["same-day", "2026-10-20", "2026-10-21"],
    ],
  );
});

test("rejects responses that are not calendars (e.g. HTML error pages)", () => {
  assert.throws(() => parseIcal("<!DOCTYPE html><html><body>Rate limited</body></html>"));
  assert.throws(() => parseIcal(""));
});

test("an empty but valid calendar yields no events", () => {
  assert.deepEqual(parseIcal("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n"), []);
});

test("icalValueToDate converts UTC times to Hawaii dates", () => {
  assert.equal(icalValueToDate("20261001"), "2026-10-01");
  assert.equal(icalValueToDate("20261001T090000Z"), "2026-09-30");
  assert.equal(icalValueToDate("20261001T100000Z"), "2026-10-01");
  assert.equal(icalValueToDate("20261001T080000"), "2026-10-01");
  assert.equal(icalValueToDate("garbage"), null);
});

test("buildIcal output is valid and round-trips through the parser", () => {
  const ics = buildIcal(
    "Sunset Paradise Suite - Aloha Stays",
    [
      { uid: "booking-1@alohastays", startDate: "2026-10-10", endDate: "2026-10-15", summary: "Reserved, direct; booking" },
      {
        uid: "block-vrbo-" + "x".repeat(120) + "@alohastays",
        startDate: "2026-11-01",
        endDate: "2026-11-03",
        summary: "Reserved - vrbo",
      },
    ],
    new Date("2026-10-02T00:00:00Z"),
  );

  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
  assert.ok(ics.includes("DTSTART;VALUE=DATE:20261010\r\n"));
  assert.ok(ics.includes("DTEND;VALUE=DATE:20261015\r\n"));
  assert.ok(ics.includes("DTSTAMP:20261002T000000Z\r\n"));
  assert.ok(ics.includes("SUMMARY:Reserved\\, direct\\; booking\r\n"));
  for (const line of ics.split("\r\n")) {
    assert.ok(Buffer.byteLength(line) <= 75, `line too long: ${line}`);
  }
  // Every line ends in CRLF (no bare LF).
  assert.equal(ics.replace(/\r\n/g, "").includes("\n"), false);

  const parsed = parseIcal(ics);
  assert.deepEqual(
    parsed.map((e) => [e.uid, e.startDate, e.endDate, e.summary]),
    [
      ["booking-1@alohastays", "2026-10-10", "2026-10-15", "Reserved, direct; booking"],
      ["block-vrbo-" + "x".repeat(120) + "@alohastays", "2026-11-01", "2026-11-03", "Reserved - vrbo"],
    ],
  );
});

test("loadFeedConfig reads per-property secrets and ICAL_FEEDS JSON", () => {
  const feeds = loadFeedConfig({
    ICAL_PROPERTY_1_AIRBNB: "https://www.airbnb.com/calendar/ical/123.ics?s=abc",
    ICAL_PROPERTY_2_BOOKING_COM: "webcal://admin.booking.com/hotel/ical.ics?t=1",
    ICAL_PROPERTY_9_AIRBNB: "https://example.com/unknown-property.ics",
    ICAL_PROPERTY_1_WEBSITE: "https://example.com/reserved-name.ics",
    ICAL_PROPERTY_1_VRBO: "   ",
    ICAL_FEEDS: JSON.stringify({ "property-2": { vrbo: "http://www.vrbo.com/icalendar/abc.ics" } }),
  });
  const summary = feeds.map((f) => `${f.propertyId}/${f.source} ${f.url}`).sort();
  assert.deepEqual(summary, [
    "property-1/airbnb https://www.airbnb.com/calendar/ical/123.ics?s=abc",
    "property-2/booking-com https://admin.booking.com/hotel/ical.ics?t=1",
    "property-2/vrbo http://www.vrbo.com/icalendar/abc.ics",
  ]);
});

test("same-day turnover is not an overlap; shared nights are", () => {
  assert.equal(rangesOverlap("2026-10-10", "2026-10-15", "2026-10-15", "2026-10-18"), false);
  assert.equal(rangesOverlap("2026-10-10", "2026-10-15", "2026-10-05", "2026-10-10"), false);
  assert.equal(rangesOverlap("2026-10-10", "2026-10-15", "2026-10-14", "2026-10-16"), true);
  assert.equal(rangesOverlap("2026-10-10", "2026-10-15", "2026-10-01", "2026-10-30"), true);
});

test("pricing applies weekly and monthly discounts", () => {
  const p = { nightlyRate: 100, cleaningFee: 50, weeklyDiscount: 10, monthlyDiscount: 20 };
  assert.equal(calculatePricing(p, 0), null);
  assert.equal(calculatePricing(p, 3)!.discount, 0);
  assert.equal(calculatePricing(p, 7)!.discount, 10);
  assert.equal(calculatePricing(p, 30)!.discount, 20);
  const three = calculatePricing(p, 3)!;
  assert.equal(three.total, 300 + 50 + 36 + Math.round(336 * 0.0425));
});

test("todayInHawaii uses UTC-10", () => {
  assert.equal(todayInHawaii(new Date("2026-10-02T09:59:00Z")), "2026-10-01");
  assert.equal(todayInHawaii(new Date("2026-10-02T10:00:00Z")), "2026-10-02");
});
