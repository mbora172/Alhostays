import type { Express, Request, Response, NextFunction } from "express";
import { type Server } from "http";
import { timingSafeEqual } from "crypto";
import { storage, bookingHoldsDates } from "./storage";
import { insertInquirySchema, type UnavailableRange } from "@shared/schema";
import {
  calculatePricing,
  getCatalogEntry,
  isIsoDate,
  nightsBetween,
  propertyCatalog,
  todayInHawaii,
} from "@shared/catalog";
import { buildPropertyCalendar, ensureFresh, getSyncStatus, syncAll } from "./calendar-sync";
import { z } from "zod";

const isoDate = z.string().refine(isIsoDate, "Must be a date in yyyy-MM-dd format");

// What the browser sends. Prices are recomputed on the server, never trusted.
const bookingRequestSchema = z
  .object({
    propertyId: z.string(),
    checkIn: isoDate,
    checkOut: isoDate,
    guests: z.coerce.number().int().min(1),
    guestName: z.string().trim().min(2).max(200),
    guestEmail: z.string().trim().email().max(200),
    guestPhone: z.string().trim().min(7).max(50),
    guestCountry: z.string().trim().max(100).optional().nullable(),
    specialRequests: z.string().trim().max(2000).optional().nullable(),
    paymentMethod: z.enum(["card", "pay_later"]),
  })
  .refine((b) => b.checkOut > b.checkIn, { message: "Check-out must be after check-in", path: ["checkOut"] });

const inquiryRequestSchema = insertInquirySchema.extend({
  name: z.string().trim().min(2).max(200),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(5000),
  checkIn: isoDate.optional().nullable().or(z.literal("")),
  checkOut: isoDate.optional().nullable().or(z.literal("")),
});

const BOOKING_STATUSES = ["pending", "pending_payment", "confirmed", "cancelled", "declined"] as const;

const MAX_NIGHTS = 90;
// Re-check external calendars before accepting a booking if data is older than this.
const BOOKING_FRESHNESS_MS = 2 * 60_000;

/**
 * Admin endpoints expose guest details, so they require
 * `Authorization: Bearer <ADMIN_TOKEN>`. Without ADMIN_TOKEN they are disabled.
 */
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const expected = process.env.ADMIN_TOKEN;
  if (!expected) {
    return res.status(403).json({ error: "Admin API is disabled. Set the ADMIN_TOKEN secret to enable it." });
  }
  const header = req.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function handleError(res: Response, error: unknown, fallback: string) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ error: "Invalid request", details: error.errors });
  }
  console.error(error);
  res.status(500).json({ error: fallback });
}

/** Every booked or blocked range for a property, without guest details. */
async function getUnavailableRanges(propertyId: string): Promise<UnavailableRange[]> {
  const today = todayInHawaii();
  const [bookings, blocks] = await Promise.all([
    storage.getBookingsByPropertyId(propertyId),
    storage.getBlockedDates(propertyId),
  ]);
  const ranges = [
    ...bookings.filter(bookingHoldsDates).map((b) => ({ startDate: b.checkIn, endDate: b.checkOut })),
    ...blocks.map((b) => ({ startDate: b.startDate, endDate: b.endDate })),
  ].filter((r) => r.endDate > today);
  ranges.sort((a, b) => a.startDate.localeCompare(b.startDate));

  // Merge overlapping or touching ranges.
  const merged: UnavailableRange[] = [];
  for (const r of ranges) {
    const last = merged[merged.length - 1];
    if (last && r.startDate <= last.endDate) {
      if (r.endDate > last.endDate) last.endDate = r.endDate;
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

function resolveProperty(idOrSlug: string) {
  return getCatalogEntry(idOrSlug) ?? propertyCatalog.find((p) => p.slug === idOrSlug);
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // --- Public: availability ---

  const availabilityHandler = async (req: Request, res: Response) => {
    try {
      const property = resolveProperty(req.params.propertyId);
      if (!property) return res.status(404).json({ error: "Property not found" });
      res.set("Cache-Control", "no-store");
      res.json(await getUnavailableRanges(property.id));
    } catch (error) {
      handleError(res, error, "Failed to fetch availability");
    }
  };
  app.get("/api/availability/:propertyId", availabilityHandler);
  // Kept for backwards compatibility with older clients.
  app.get("/api/blocked-dates/:propertyId", availabilityHandler);

  // --- Public: iCal export for Airbnb / VRBO / Booking.com / Google Calendar ---

  const icalHandler = async (req: Request, res: Response) => {
    try {
      const id = req.params.file.replace(/\.ics$/i, "");
      const property = resolveProperty(id);
      if (!property) return res.status(404).type("text/plain").send("Calendar not found");
      const exclude = String(req.query.exclude ?? "").split(",");
      const body = await buildPropertyCalendar(property.id, exclude);
      res.set({
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `inline; filename="${property.slug}.ics"`,
        "Cache-Control": "no-cache, max-age=0",
      });
      res.send(body);
    } catch (error) {
      console.error(error);
      res.status(500).type("text/plain").send("Failed to build calendar");
    }
  };
  app.get("/api/ical/:file", icalHandler);
  app.get("/calendar/:file", icalHandler);

  // --- Public: bookings & inquiries ---

  app.post("/api/bookings", async (req, res) => {
    try {
      const data = bookingRequestSchema.parse(req.body);
      const property = getCatalogEntry(data.propertyId);
      if (!property) return res.status(400).json({ error: "Unknown property" });

      if (data.checkIn < todayInHawaii()) {
        return res.status(400).json({ error: "Check-in date is in the past" });
      }
      const nights = nightsBetween(data.checkIn, data.checkOut);
      if (nights > MAX_NIGHTS) {
        return res.status(400).json({ error: `Stays longer than ${MAX_NIGHTS} nights must be arranged by contacting us` });
      }
      if (data.guests > property.capacity) {
        return res.status(400).json({ error: `This property sleeps up to ${property.capacity} guests` });
      }
      const pricing = calculatePricing(property, nights)!;

      // Pull the latest Airbnb/VRBO/... calendars so we don't accept dates that
      // were just booked elsewhere. Bounded so a slow platform can't hang checkout.
      await Promise.race([
        ensureFresh(property.id, BOOKING_FRESHNESS_MS),
        new Promise((resolve) => setTimeout(resolve, 8_000)),
      ]);

      const booking = await storage.createBookingIfAvailable({
        propertyId: property.id,
        guestName: data.guestName,
        guestEmail: data.guestEmail,
        guestPhone: data.guestPhone,
        guestCountry: data.guestCountry || null,
        checkIn: data.checkIn,
        checkOut: data.checkOut,
        guests: data.guests,
        specialRequests: data.specialRequests || null,
        nightlyRate: pricing.nightlyRate,
        nights,
        cleaningFee: pricing.cleaningFee,
        serviceFee: pricing.serviceFee,
        taxes: pricing.taxes,
        total: pricing.total,
        status: data.paymentMethod === "pay_later" ? "pending_payment" : "pending",
        paymentMethod: data.paymentMethod,
      });

      if (!booking) {
        return res.status(409).json({
          error: "Sorry, some of those dates were just booked. Please choose different dates.",
        });
      }

      res.status(201).json({
        id: booking.id,
        propertyId: booking.propertyId,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        guests: booking.guests,
        nights: booking.nights,
        total: booking.total,
        status: booking.status,
        paymentMethod: booking.paymentMethod,
      });
    } catch (error) {
      handleError(res, error, "Failed to create booking");
    }
  });

  app.post("/api/inquiries", async (req, res) => {
    try {
      const data = inquiryRequestSchema.parse(req.body);
      if (data.propertyId && !getCatalogEntry(data.propertyId)) {
        return res.status(400).json({ error: "Unknown property" });
      }
      const inquiry = await storage.createInquiry({
        ...data,
        phone: data.phone || null,
        propertyId: data.propertyId || null,
        checkIn: data.checkIn || null,
        checkOut: data.checkOut || null,
      });
      res.status(201).json({ id: inquiry.id });
    } catch (error) {
      handleError(res, error, "Failed to create inquiry");
    }
  });

  // --- Admin (requires ADMIN_TOKEN) ---

  app.get("/api/bookings", requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.getBookings());
    } catch (error) {
      handleError(res, error, "Failed to fetch bookings");
    }
  });

  app.get("/api/bookings/:id", requireAdmin, async (req, res) => {
    try {
      const booking = await storage.getBookingById(req.params.id);
      if (!booking) return res.status(404).json({ error: "Booking not found" });
      res.json(booking);
    } catch (error) {
      handleError(res, error, "Failed to fetch booking");
    }
  });

  app.patch("/api/bookings/:id/status", requireAdmin, async (req, res) => {
    try {
      const { status } = z.object({ status: z.enum(BOOKING_STATUSES) }).parse(req.body);
      const booking = await storage.updateBookingStatus(req.params.id, status);
      if (!booking) return res.status(404).json({ error: "Booking not found" });
      res.json(booking);
    } catch (error) {
      handleError(res, error, "Failed to update booking");
    }
  });

  app.get("/api/inquiries", requireAdmin, async (_req, res) => {
    try {
      res.json(await storage.getInquiries());
    } catch (error) {
      handleError(res, error, "Failed to fetch inquiries");
    }
  });

  // Manual blocks (owner stays, maintenance, ...). They are exported to every platform.
  app.post("/api/blocked-dates", requireAdmin, async (req, res) => {
    try {
      const data = z
        .object({ propertyId: z.string(), startDate: isoDate, endDate: isoDate, summary: z.string().max(200).optional() })
        .refine((d) => d.endDate > d.startDate, { message: "endDate must be after startDate" })
        .parse(req.body);
      if (!getCatalogEntry(data.propertyId)) return res.status(400).json({ error: "Unknown property" });
      res.status(201).json(await storage.createBlockedDate({ ...data, source: "manual" }));
    } catch (error) {
      handleError(res, error, "Failed to block dates");
    }
  });

  app.delete("/api/blocked-dates/:id", requireAdmin, async (req, res) => {
    try {
      const deleted = await storage.deleteBlockedDate(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Not found" });
      res.status(204).end();
    } catch (error) {
      handleError(res, error, "Failed to delete blocked dates");
    }
  });

  app.get("/api/ical/admin/status", requireAdmin, (req, res) => {
    const base = `${req.protocol}://${req.get("host")}`;
    res.json({
      ...getSyncStatus(),
      exportUrls: propertyCatalog.map((p) => ({
        propertyId: p.id,
        name: p.name,
        all: `${base}/calendar/${p.slug}.ics`,
        forAirbnb: `${base}/calendar/${p.slug}.ics?exclude=airbnb`,
        forVrbo: `${base}/calendar/${p.slug}.ics?exclude=vrbo`,
        forBookingCom: `${base}/calendar/${p.slug}.ics?exclude=booking`,
      })),
    });
  });

  app.post("/api/ical/admin/sync", requireAdmin, async (_req, res) => {
    try {
      await syncAll();
      res.json(getSyncStatus());
    } catch (error) {
      handleError(res, error, "Sync failed");
    }
  });

  return httpServer;
}
