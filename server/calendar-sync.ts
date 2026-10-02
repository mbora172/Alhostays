// Two-way calendar sync for the rental properties.
//
// Import: every configured external feed (Airbnb, VRBO, Booking.com, ...) is
// fetched on a schedule and its events are stored as blocked dates. A failed
// fetch or an unparseable response keeps the last good data, so a platform
// outage never makes booked dates look available.
//
// Export: /api/ical/:propertyId.ics publishes website bookings, manual blocks
// and every imported block, so each platform can import one feed and learn about
// bookings made everywhere else. Pass ?exclude=<source> to leave out that
// platform's own events (e.g. the URL given to Airbnb uses ?exclude=airbnb).

import { propertyCatalog, getCatalogEntry, todayInHawaii, addDays } from "@shared/catalog";
import type { InsertBlockedDate } from "@shared/schema";
import { storage, bookingHoldsDates } from "./storage";
import { parseIcal, buildIcal, type ExportEvent } from "./ical";
import { log } from "./log";

/** Sources with special meaning that external feeds may not use. */
const RESERVED_SOURCES = new Set(["website", "manual"]);

const FETCH_TIMEOUT_MS = 20_000;
const MAX_FEED_BYTES = 5 * 1024 * 1024;

export interface FeedConfig {
  propertyId: string;
  source: string;
  url: string;
}

export interface FeedStatus {
  propertyId: string;
  source: string;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
  eventCount: number;
}

/**
 * Reads feed URLs from the environment. Two forms are supported:
 *   ICAL_PROPERTY_1_AIRBNB=https://www.airbnb.com/calendar/ical/....ics
 *   ICAL_FEEDS={"property-1":{"airbnb":"https://...","vrbo":"https://..."}}
 * Feed URLs contain private tokens, so keep them in secrets, not in code.
 */
export function loadFeedConfig(env: NodeJS.ProcessEnv = process.env): FeedConfig[] {
  const feeds = new Map<string, FeedConfig>();
  const add = (propertyId: string, source: string, url: string | undefined) => {
    source = source.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    url = url?.trim();
    if (!url || !source) return;
    if (!getCatalogEntry(propertyId)) {
      log(`ignoring iCal feed for unknown property "${propertyId}"`, "ical");
      return;
    }
    if (RESERVED_SOURCES.has(source)) {
      log(`ignoring iCal feed with reserved source name "${source}"`, "ical");
      return;
    }
    // Airbnb and others hand out webcal:// links; they are plain HTTPS.
    url = url.replace(/^webcals?:\/\//i, "https://");
    if (!/^https?:\/\//i.test(url)) {
      log(`ignoring iCal feed ${propertyId}/${source}: URL must start with https://`, "ical");
      return;
    }
    feeds.set(`${propertyId}:${source}`, { propertyId, source, url });
  };

  if (env.ICAL_FEEDS) {
    try {
      const parsed = JSON.parse(env.ICAL_FEEDS) as Record<string, Record<string, string>>;
      for (const [propertyId, sources] of Object.entries(parsed)) {
        for (const [source, url] of Object.entries(sources ?? {})) add(propertyId, source, url);
      }
    } catch (error) {
      log(`ICAL_FEEDS is not valid JSON: ${(error as Error).message}`, "ical");
    }
  }

  for (const [key, value] of Object.entries(env)) {
    const m = key.match(/^ICAL_PROPERTY_(\d+)_([A-Z0-9_]+)$/);
    if (m) add(`property-${m[1]}`, m[2], value);
  }

  return Array.from(feeds.values());
}

const statuses = new Map<string, FeedStatus>();
const inFlight = new Map<string, Promise<void>>();
let feeds: FeedConfig[] = [];
let timer: NodeJS.Timeout | null = null;

function statusFor(feed: FeedConfig): FeedStatus {
  const key = `${feed.propertyId}:${feed.source}`;
  let status = statuses.get(key);
  if (!status) {
    status = {
      propertyId: feed.propertyId,
      source: feed.source,
      lastAttemptAt: null,
      lastSuccessAt: null,
      lastError: null,
      eventCount: 0,
    };
    statuses.set(key, status);
  }
  return status;
}

async function fetchFeed(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/calendar, text/plain;q=0.9, */*;q=0.5",
        "User-Agent": "AlohaStays-CalendarSync/1.0",
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
    const text = await res.text();
    if (text.length > MAX_FEED_BYTES) throw new Error("Feed is larger than 5 MB");
    return text;
  } catch (error) {
    if ((error as Error).name === "AbortError") {
      throw new Error(`Timed out after ${FETCH_TIMEOUT_MS / 1000}s`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function syncFeed(feed: FeedConfig): Promise<void> {
  const status = statusFor(feed);
  status.lastAttemptAt = new Date().toISOString();
  try {
    const events = parseIcal(await fetchFeed(feed.url));
    const today = todayInHawaii();
    const ranges: InsertBlockedDate[] = events
      // Stays that ended before today can't affect availability.
      .filter((e) => e.endDate > today)
      .map((e) => ({
        propertyId: feed.propertyId,
        source: feed.source,
        startDate: e.startDate,
        endDate: e.endDate,
        externalUid: e.uid,
        summary: e.summary || null,
      }));
    await storage.replaceBlockedDates(feed.propertyId, feed.source, ranges);
    status.lastSuccessAt = new Date().toISOString();
    status.lastError = null;
    status.eventCount = ranges.length;
  } catch (error) {
    // Keep the previously imported blocks: stale-but-blocked beats double-booked.
    status.lastError = (error as Error).message || String(error);
    log(`sync failed for ${feed.propertyId}/${feed.source}: ${status.lastError}`, "ical");
  }
}

/** Syncs one property's feeds, sharing any sync already in progress. */
export function syncProperty(propertyId: string): Promise<void> {
  const existing = inFlight.get(propertyId);
  if (existing) return existing;
  const run = Promise.all(feeds.filter((f) => f.propertyId === propertyId).map(syncFeed))
    .then(() => undefined)
    .finally(() => inFlight.delete(propertyId));
  inFlight.set(propertyId, run);
  return run;
}

export async function syncAll(): Promise<void> {
  await Promise.all(propertyCatalog.map((p) => syncProperty(p.id)));
  await purgeRemovedFeeds();
  const failed = Array.from(statuses.values()).filter((s) => s.lastError);
  log(
    `synced ${feeds.length} feed(s)` + (failed.length ? `, ${failed.length} failing` : ""),
    "ical",
  );
}

/** Drops blocks imported from feeds that are no longer configured. */
async function purgeRemovedFeeds(): Promise<void> {
  if (feeds.length === 0) return; // never wipe data because config is missing
  for (const property of propertyCatalog) {
    const configured = new Set(feeds.filter((f) => f.propertyId === property.id).map((f) => f.source));
    const blocks = await storage.getBlockedDates(property.id);
    const stale = new Set(
      blocks.map((b) => b.source).filter((s) => !RESERVED_SOURCES.has(s) && !configured.has(s)),
    );
    for (const source of Array.from(stale)) {
      await storage.replaceBlockedDates(property.id, source, []);
      log(`removed blocks from unconfigured feed ${property.id}/${source}`, "ical");
    }
  }
}

/**
 * Re-syncs a property's feeds if the last successful sync is older than maxAgeMs.
 * Used right before accepting a booking so we check against current data.
 * Never throws; on failure the last good data is used.
 */
export async function ensureFresh(propertyId: string, maxAgeMs: number): Promise<void> {
  const propertyFeeds = feeds.filter((f) => f.propertyId === propertyId);
  const now = Date.now();
  const stale = propertyFeeds.some((f) => {
    const s = statusFor(f).lastSuccessAt;
    return !s || now - Date.parse(s) > maxAgeMs;
  });
  if (stale) await syncProperty(propertyId);
}

export function getSyncStatus() {
  return {
    intervalMinutes: syncIntervalMinutes(),
    feeds: feeds.map((f) => ({ ...statusFor(f), url: redactUrl(f.url) })),
  };
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname.replace(/[^/]{12,}/g, (s) => s.slice(0, 4) + "…")}`;
  } catch {
    return "(invalid URL)";
  }
}

function syncIntervalMinutes(): number {
  const n = Number(process.env.ICAL_SYNC_INTERVAL_MINUTES);
  return Number.isFinite(n) && n >= 5 ? n : 15;
}

export function startCalendarSync(): void {
  feeds = loadFeedConfig();
  if (feeds.length === 0) {
    log("no external iCal feeds configured (set ICAL_PROPERTY_<n>_<SOURCE> secrets)", "ical");
    return;
  }
  log(
    `syncing ${feeds.length} feed(s) every ${syncIntervalMinutes()} min: ` +
      feeds.map((f) => `${f.propertyId}/${f.source}`).join(", "),
    "ical",
  );
  void syncAll();
  if (timer) clearInterval(timer);
  timer = setInterval(() => void syncAll(), syncIntervalMinutes() * 60_000);
  timer.unref();
}

/** Builds the iCal feed other platforms import for one property. */
export async function buildPropertyCalendar(propertyId: string, exclude: string[] = []): Promise<string | null> {
  const property = getCatalogEntry(propertyId);
  if (!property) return null;

  const excluded = new Set(exclude.map((s) => s.trim().toLowerCase()).filter(Boolean));
  // Keep a short history so platforms don't see recent stays vanish abruptly.
  const cutoff = addDays(todayInHawaii(), -30);
  const events: ExportEvent[] = [];

  if (!excluded.has("website")) {
    const bookings = await storage.getBookingsByPropertyId(propertyId);
    for (const b of bookings) {
      if (!bookingHoldsDates(b) || b.checkOut <= cutoff) continue;
      events.push({
        uid: `booking-${b.id}@alohastays`,
        startDate: b.checkIn,
        endDate: b.checkOut,
        summary: "Reserved - Aloha Stays direct booking",
      });
    }
  }

  const blocks = await storage.getBlockedDates(propertyId);
  for (const block of blocks) {
    if (excluded.has(block.source) || block.endDate <= cutoff) continue;
    events.push({
      uid: `block-${block.source}-${block.externalUid ?? block.id}@alohastays`,
      startDate: block.startDate,
      endDate: block.endDate,
      summary: block.source === "manual" ? "Not available" : `Reserved - ${block.source}`,
    });
  }

  events.sort((a, b) => a.startDate.localeCompare(b.startDate));
  return buildIcal(`${property.name} - Aloha Stays`, events);
}
