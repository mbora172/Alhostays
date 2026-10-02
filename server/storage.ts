import {
  bookings as bookingsTable,
  blockedDates as blockedDatesTable,
  inquiries as inquiriesTable,
  type Booking,
  type InsertBooking,
  type Inquiry,
  type InsertInquiry,
  type BlockedDate,
  type InsertBlockedDate,
} from "@shared/schema";
import { rangesOverlap } from "@shared/catalog";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import pg from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, desc, eq, inArray, notInArray, sql } from "drizzle-orm";

/** Booking statuses that no longer hold the dates. */
export const RELEASED_BOOKING_STATUSES = ["cancelled", "declined"];

export function bookingHoldsDates(booking: Booking): boolean {
  return !RELEASED_BOOKING_STATUSES.includes(booking.status);
}

export type BookingPatch = Partial<Pick<Booking, "status" | "paymentIntentId">>;

export interface IStorage {
  // Bookings
  getBookings(): Promise<Booking[]>;
  getBookingById(id: string): Promise<Booking | undefined>;
  getBookingsByPropertyId(propertyId: string): Promise<Booking[]>;
  /**
   * Creates the booking only if its nights don't overlap an active booking or a
   * blocked range for the same property. Returns null when the dates are taken.
   * The check and the insert are atomic.
   */
  createBookingIfAvailable(booking: InsertBooking): Promise<Booking | null>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;
  /**
   * Updates a booking only if its current status is one of `fromStatuses`
   * (when given). Returns the updated booking, or undefined if nothing changed.
   */
  updateBooking(id: string, patch: BookingPatch, fromStatuses?: string[]): Promise<Booking | undefined>;

  // Inquiries
  getInquiries(): Promise<Inquiry[]>;
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;

  // Blocked dates
  getBlockedDates(propertyId: string): Promise<BlockedDate[]>;
  createBlockedDate(blockedDate: InsertBlockedDate): Promise<BlockedDate>;
  deleteBlockedDate(id: string): Promise<boolean>;
  /** Atomically replaces every blocked range for one property + source. */
  replaceBlockedDates(propertyId: string, source: string, ranges: InsertBlockedDate[]): Promise<void>;
}

function normalizeBooking(insert: InsertBooking, id: string): Booking {
  return {
    ...insert,
    id,
    status: insert.status || "pending",
    guestCountry: insert.guestCountry || null,
    specialRequests: insert.specialRequests || null,
    paymentIntentId: insert.paymentIntentId || null,
    createdAt: new Date(),
  };
}

function normalizeInquiry(insert: InsertInquiry, id: string): Inquiry {
  return {
    ...insert,
    id,
    phone: insert.phone || null,
    propertyId: insert.propertyId || null,
    checkIn: insert.checkIn || null,
    checkOut: insert.checkOut || null,
    createdAt: new Date(),
  };
}

function normalizeBlockedDate(insert: InsertBlockedDate, id: string): BlockedDate {
  return {
    ...insert,
    id,
    source: insert.source || "manual",
    externalUid: insert.externalUid || null,
    summary: insert.summary || null,
  };
}

const newestFirst = (a: { createdAt: Date | null }, b: { createdAt: Date | null }) =>
  (b.createdAt ? new Date(b.createdAt).getTime() : 0) - (a.createdAt ? new Date(a.createdAt).getTime() : 0);

interface Snapshot {
  bookings: Booking[];
  inquiries: Inquiry[];
  blockedDates: BlockedDate[];
}

/**
 * In-memory storage, optionally persisted to a JSON file so bookings survive
 * restarts. Node runs request handlers on one thread, so check-then-insert
 * without an intervening await is atomic.
 */
export class MemStorage implements IStorage {
  private bookings = new Map<string, Booking>();
  private inquiries = new Map<string, Inquiry>();
  private blockedDates = new Map<string, BlockedDate>();
  private writeChain: Promise<void> = Promise.resolve();

  constructor(private readonly filePath?: string) {
    if (filePath && fs.existsSync(filePath)) {
      const data: Snapshot = JSON.parse(fs.readFileSync(filePath, "utf8"));
      for (const b of data.bookings ?? []) {
        this.bookings.set(b.id, { ...b, createdAt: b.createdAt ? new Date(b.createdAt) : null });
      }
      for (const i of data.inquiries ?? []) {
        this.inquiries.set(i.id, { ...i, createdAt: i.createdAt ? new Date(i.createdAt) : null });
      }
      for (const d of data.blockedDates ?? []) this.blockedDates.set(d.id, d);
    }
  }

  private persist(): Promise<void> {
    const filePath = this.filePath;
    if (!filePath) return Promise.resolve();
    const snapshot: Snapshot = {
      bookings: Array.from(this.bookings.values()),
      inquiries: Array.from(this.inquiries.values()),
      blockedDates: Array.from(this.blockedDates.values()),
    };
    const json = JSON.stringify(snapshot, null, 2);
    // Serialize writes and replace the file atomically.
    this.writeChain = this.writeChain.then(async () => {
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      const tmp = `${filePath}.${process.pid}.tmp`;
      await fs.promises.writeFile(tmp, json);
      await fs.promises.rename(tmp, filePath);
    });
    return this.writeChain;
  }

  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values()).sort(newestFirst);
  }

  async getBookingById(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByPropertyId(propertyId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter((b) => b.propertyId === propertyId);
  }

  async createBookingIfAvailable(insert: InsertBooking): Promise<Booking | null> {
    const conflict =
      Array.from(this.bookings.values()).some(
        (b) =>
          b.propertyId === insert.propertyId &&
          bookingHoldsDates(b) &&
          rangesOverlap(insert.checkIn, insert.checkOut, b.checkIn, b.checkOut),
      ) ||
      Array.from(this.blockedDates.values()).some(
        (d) =>
          d.propertyId === insert.propertyId &&
          rangesOverlap(insert.checkIn, insert.checkOut, d.startDate, d.endDate),
      );
    if (conflict) return null;

    const booking = normalizeBooking(insert, randomUUID());
    this.bookings.set(booking.id, booking);
    await this.persist();
    return booking;
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    return this.updateBooking(id, { status });
  }

  async updateBooking(id: string, patch: BookingPatch, fromStatuses?: string[]): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (!booking) return undefined;
    if (fromStatuses && !fromStatuses.includes(booking.status)) return undefined;
    Object.assign(booking, patch);
    await this.persist();
    return booking;
  }

  async getInquiries(): Promise<Inquiry[]> {
    return Array.from(this.inquiries.values()).sort(newestFirst);
  }

  async createInquiry(insert: InsertInquiry): Promise<Inquiry> {
    const inquiry = normalizeInquiry(insert, randomUUID());
    this.inquiries.set(inquiry.id, inquiry);
    await this.persist();
    return inquiry;
  }

  async getBlockedDates(propertyId: string): Promise<BlockedDate[]> {
    return Array.from(this.blockedDates.values())
      .filter((d) => d.propertyId === propertyId)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }

  async createBlockedDate(insert: InsertBlockedDate): Promise<BlockedDate> {
    const blocked = normalizeBlockedDate(insert, randomUUID());
    this.blockedDates.set(blocked.id, blocked);
    await this.persist();
    return blocked;
  }

  async deleteBlockedDate(id: string): Promise<boolean> {
    const deleted = this.blockedDates.delete(id);
    if (deleted) await this.persist();
    return deleted;
  }

  async replaceBlockedDates(propertyId: string, source: string, ranges: InsertBlockedDate[]): Promise<void> {
    this.blockedDates.forEach((d, id) => {
      if (d.propertyId === propertyId && d.source === source) this.blockedDates.delete(id);
    });
    for (const range of ranges) {
      const blocked = normalizeBlockedDate({ ...range, propertyId, source }, randomUUID());
      this.blockedDates.set(blocked.id, blocked);
    }
    await this.persist();
  }
}

/** PostgreSQL storage, used automatically when DATABASE_URL is set. */
export class DbStorage implements IStorage {
  private readonly db: NodePgDatabase;
  private readonly pool: pg.Pool;
  private ready: Promise<void>;

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString });
    this.db = drizzle(this.pool);
    this.ready = this.ensureSchema();
  }

  // Creates the tables this app needs, so a fresh database works without a
  // separate `npm run db:push` step.
  private async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id varchar NOT NULL,
        guest_name text NOT NULL,
        guest_email text NOT NULL,
        guest_phone text NOT NULL,
        guest_country text,
        check_in text NOT NULL,
        check_out text NOT NULL,
        guests integer NOT NULL,
        special_requests text,
        nightly_rate integer NOT NULL,
        nights integer NOT NULL,
        cleaning_fee integer NOT NULL,
        service_fee integer NOT NULL,
        taxes integer NOT NULL,
        total integer NOT NULL,
        status text NOT NULL DEFAULT 'pending',
        payment_method text NOT NULL,
        payment_intent_id text,
        created_at timestamp DEFAULT now()
      );
      CREATE TABLE IF NOT EXISTS blocked_dates (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        property_id varchar NOT NULL,
        start_date text NOT NULL,
        end_date text NOT NULL,
        source text NOT NULL DEFAULT 'airbnb'
      );
      ALTER TABLE blocked_dates ADD COLUMN IF NOT EXISTS external_uid text;
      ALTER TABLE blocked_dates ADD COLUMN IF NOT EXISTS summary text;
      CREATE INDEX IF NOT EXISTS blocked_dates_property_idx ON blocked_dates (property_id, source);
      CREATE TABLE IF NOT EXISTS inquiries (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        email text NOT NULL,
        phone text,
        property_id varchar,
        check_in text,
        check_out text,
        message text NOT NULL,
        created_at timestamp DEFAULT now()
      );
    `);
  }

  async getBookings(): Promise<Booking[]> {
    await this.ready;
    return this.db.select().from(bookingsTable).orderBy(desc(bookingsTable.createdAt));
  }

  async getBookingById(id: string): Promise<Booking | undefined> {
    await this.ready;
    const [row] = await this.db.select().from(bookingsTable).where(eq(bookingsTable.id, id));
    return row;
  }

  async getBookingsByPropertyId(propertyId: string): Promise<Booking[]> {
    await this.ready;
    return this.db.select().from(bookingsTable).where(eq(bookingsTable.propertyId, propertyId));
  }

  async createBookingIfAvailable(insert: InsertBooking): Promise<Booking | null> {
    await this.ready;
    return this.db.transaction(async (tx) => {
      // Serialize bookings per property across all server instances.
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"booking:" + insert.propertyId}))`);

      const [bookingConflict] = await tx
        .select({ id: bookingsTable.id })
        .from(bookingsTable)
        .where(
          and(
            eq(bookingsTable.propertyId, insert.propertyId),
            notInArray(bookingsTable.status, RELEASED_BOOKING_STATUSES),
            sql`${bookingsTable.checkIn} < ${insert.checkOut}`,
            sql`${insert.checkIn} < ${bookingsTable.checkOut}`,
          ),
        )
        .limit(1);
      if (bookingConflict) return null;

      const [blockConflict] = await tx
        .select({ id: blockedDatesTable.id })
        .from(blockedDatesTable)
        .where(
          and(
            eq(blockedDatesTable.propertyId, insert.propertyId),
            sql`${blockedDatesTable.startDate} < ${insert.checkOut}`,
            sql`${insert.checkIn} < ${blockedDatesTable.endDate}`,
          ),
        )
        .limit(1);
      if (blockConflict) return null;

      const [row] = await tx
        .insert(bookingsTable)
        .values(normalizeBooking(insert, randomUUID()))
        .returning();
      return row;
    });
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    return this.updateBooking(id, { status });
  }

  async updateBooking(id: string, patch: BookingPatch, fromStatuses?: string[]): Promise<Booking | undefined> {
    await this.ready;
    const where = fromStatuses
      ? and(eq(bookingsTable.id, id), inArray(bookingsTable.status, fromStatuses))
      : eq(bookingsTable.id, id);
    const [row] = await this.db.update(bookingsTable).set(patch).where(where).returning();
    return row;
  }

  async getInquiries(): Promise<Inquiry[]> {
    await this.ready;
    return this.db.select().from(inquiriesTable).orderBy(desc(inquiriesTable.createdAt));
  }

  async createInquiry(insert: InsertInquiry): Promise<Inquiry> {
    await this.ready;
    const [row] = await this.db
      .insert(inquiriesTable)
      .values(normalizeInquiry(insert, randomUUID()))
      .returning();
    return row;
  }

  async getBlockedDates(propertyId: string): Promise<BlockedDate[]> {
    await this.ready;
    return this.db
      .select()
      .from(blockedDatesTable)
      .where(eq(blockedDatesTable.propertyId, propertyId))
      .orderBy(blockedDatesTable.startDate);
  }

  async createBlockedDate(insert: InsertBlockedDate): Promise<BlockedDate> {
    await this.ready;
    const [row] = await this.db
      .insert(blockedDatesTable)
      .values(normalizeBlockedDate(insert, randomUUID()))
      .returning();
    return row;
  }

  async deleteBlockedDate(id: string): Promise<boolean> {
    await this.ready;
    const rows = await this.db
      .delete(blockedDatesTable)
      .where(eq(blockedDatesTable.id, id))
      .returning({ id: blockedDatesTable.id });
    return rows.length > 0;
  }

  async replaceBlockedDates(propertyId: string, source: string, ranges: InsertBlockedDate[]): Promise<void> {
    await this.ready;
    await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${"booking:" + propertyId}))`);
      await tx
        .delete(blockedDatesTable)
        .where(and(eq(blockedDatesTable.propertyId, propertyId), eq(blockedDatesTable.source, source)));
      if (ranges.length > 0) {
        await tx
          .insert(blockedDatesTable)
          .values(ranges.map((r) => normalizeBlockedDate({ ...r, propertyId, source }, randomUUID())));
      }
    });
  }
}

function createStorage(): IStorage {
  if (process.env.DATABASE_URL) {
    return new DbStorage(process.env.DATABASE_URL);
  }
  const file = process.env.DATA_FILE ?? path.resolve(process.cwd(), "data", "store.json");
  return new MemStorage(file);
}

export const storage = createStorage();
