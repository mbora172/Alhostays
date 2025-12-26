import { 
  type User, 
  type InsertUser,
  type Booking,
  type InsertBooking,
  type Inquiry,
  type InsertInquiry,
  type BlockedDate,
  type InsertBlockedDate
} from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Bookings
  getBookings(): Promise<Booking[]>;
  getBookingById(id: string): Promise<Booking | undefined>;
  getBookingsByPropertyId(propertyId: string): Promise<Booking[]>;
  createBooking(booking: InsertBooking): Promise<Booking>;
  updateBookingStatus(id: string, status: string): Promise<Booking | undefined>;
  
  // Inquiries
  getInquiries(): Promise<Inquiry[]>;
  createInquiry(inquiry: InsertInquiry): Promise<Inquiry>;
  
  // Blocked dates
  getBlockedDates(propertyId: string): Promise<BlockedDate[]>;
  createBlockedDate(blockedDate: InsertBlockedDate): Promise<BlockedDate>;
  clearBlockedDates(propertyId: string, source: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private bookings: Map<string, Booking>;
  private inquiries: Map<string, Inquiry>;
  private blockedDates: Map<string, BlockedDate>;

  constructor() {
    this.users = new Map();
    this.bookings = new Map();
    this.inquiries = new Map();
    this.blockedDates = new Map();
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Bookings
  async getBookings(): Promise<Booking[]> {
    return Array.from(this.bookings.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async getBookingById(id: string): Promise<Booking | undefined> {
    return this.bookings.get(id);
  }

  async getBookingsByPropertyId(propertyId: string): Promise<Booking[]> {
    return Array.from(this.bookings.values()).filter(
      (booking) => booking.propertyId === propertyId
    );
  }

  async createBooking(insertBooking: InsertBooking): Promise<Booking> {
    const id = randomUUID();
    const booking: Booking = { 
      ...insertBooking,
      id,
      status: insertBooking.status || "pending",
      guestCountry: insertBooking.guestCountry || null,
      specialRequests: insertBooking.specialRequests || null,
      paymentIntentId: insertBooking.paymentIntentId || null,
      createdAt: new Date()
    };
    this.bookings.set(id, booking);
    return booking;
  }

  async updateBookingStatus(id: string, status: string): Promise<Booking | undefined> {
    const booking = this.bookings.get(id);
    if (booking) {
      booking.status = status;
      this.bookings.set(id, booking);
      return booking;
    }
    return undefined;
  }

  // Inquiries
  async getInquiries(): Promise<Inquiry[]> {
    return Array.from(this.inquiries.values()).sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  async createInquiry(insertInquiry: InsertInquiry): Promise<Inquiry> {
    const id = randomUUID();
    const inquiry: Inquiry = { 
      ...insertInquiry,
      id,
      phone: insertInquiry.phone || null,
      propertyId: insertInquiry.propertyId || null,
      checkIn: insertInquiry.checkIn || null,
      checkOut: insertInquiry.checkOut || null,
      createdAt: new Date()
    };
    this.inquiries.set(id, inquiry);
    return inquiry;
  }

  // Blocked Dates
  async getBlockedDates(propertyId: string): Promise<BlockedDate[]> {
    return Array.from(this.blockedDates.values()).filter(
      (date) => date.propertyId === propertyId
    );
  }

  async createBlockedDate(insertBlockedDate: InsertBlockedDate): Promise<BlockedDate> {
    const id = randomUUID();
    const blockedDate: BlockedDate = { 
      ...insertBlockedDate, 
      id,
      source: insertBlockedDate.source || "airbnb"
    };
    this.blockedDates.set(id, blockedDate);
    return blockedDate;
  }

  async clearBlockedDates(propertyId: string, source: string): Promise<void> {
    const entriesToDelete: string[] = [];
    this.blockedDates.forEach((date, id) => {
      if (date.propertyId === propertyId && date.source === source) {
        entriesToDelete.push(id);
      }
    });
    entriesToDelete.forEach(id => this.blockedDates.delete(id));
  }
}

export const storage = new MemStorage();
