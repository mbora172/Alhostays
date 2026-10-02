import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Properties table
export const properties = pgTable("properties", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  shortDescription: text("short_description").notNull(),
  address: text("address").notNull(),
  capacity: integer("capacity").notNull(),
  bedrooms: integer("bedrooms").notNull(),
  bathrooms: integer("bathrooms").notNull(),
  nightlyRate: integer("nightly_rate").notNull(),
  cleaningFee: integer("cleaning_fee").notNull(),
  weeklyDiscount: integer("weekly_discount").default(0),
  monthlyDiscount: integer("monthly_discount").default(0),
  amenities: text("amenities").array().notNull(),
  houseRules: jsonb("house_rules").$type<{
    checkIn: string;
    checkOut: string;
    smoking: boolean;
    parties: boolean;
    pets: boolean;
  }>().notNull(),
  images: text("images").array().notNull(),
  nearbyAttractions: jsonb("nearby_attractions").$type<{
    name: string;
    distance: string;
  }[]>().notNull(),
  icalUrl: text("ical_url"),
});

export const insertPropertySchema = createInsertSchema(properties).omit({ id: true });
export type InsertProperty = z.infer<typeof insertPropertySchema>;
export type Property = typeof properties.$inferSelect;

// Bookings table
export const bookings = pgTable("bookings", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  guestName: text("guest_name").notNull(),
  guestEmail: text("guest_email").notNull(),
  guestPhone: text("guest_phone").notNull(),
  guestCountry: text("guest_country"),
  checkIn: text("check_in").notNull(),
  checkOut: text("check_out").notNull(),
  guests: integer("guests").notNull(),
  specialRequests: text("special_requests"),
  nightlyRate: integer("nightly_rate").notNull(),
  nights: integer("nights").notNull(),
  cleaningFee: integer("cleaning_fee").notNull(),
  serviceFee: integer("service_fee").notNull(),
  taxes: integer("taxes").notNull(),
  total: integer("total").notNull(),
  status: text("status").notNull().default("pending"),
  paymentMethod: text("payment_method").notNull(),
  paymentIntentId: text("payment_intent_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertBookingSchema = createInsertSchema(bookings).omit({ id: true, createdAt: true });
export type InsertBooking = z.infer<typeof insertBookingSchema>;
export type Booking = typeof bookings.$inferSelect;

// Blocked date ranges imported from external calendars (Airbnb, VRBO, Booking.com, ...)
// via iCal sync, or added manually. startDate is the first blocked night and
// endDate is the checkout day (exclusive), matching iCal DTSTART/DTEND.
export const blockedDates = pgTable("blocked_dates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  propertyId: varchar("property_id").notNull(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  source: text("source").notNull().default("airbnb"),
  externalUid: text("external_uid"),
  summary: text("summary"),
});

export const insertBlockedDateSchema = createInsertSchema(blockedDates).omit({ id: true });
export type InsertBlockedDate = z.infer<typeof insertBlockedDateSchema>;
export type BlockedDate = typeof blockedDates.$inferSelect;

// Public availability shape returned to the browser (no guest details).
export interface UnavailableRange {
  startDate: string;
  endDate: string;
}

// Inquiries table
export const inquiries = pgTable("inquiries", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  propertyId: varchar("property_id"),
  checkIn: text("check_in"),
  checkOut: text("check_out"),
  message: text("message").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertInquirySchema = createInsertSchema(inquiries).omit({ id: true, createdAt: true });
export type InsertInquiry = z.infer<typeof insertInquirySchema>;
export type Inquiry = typeof inquiries.$inferSelect;

// Testimonials table
export const testimonials = pgTable("testimonials", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  guestName: text("guest_name").notNull(),
  rating: integer("rating").notNull(),
  review: text("review").notNull(),
  propertyId: varchar("property_id"),
  date: text("date").notNull(),
});

export const insertTestimonialSchema = createInsertSchema(testimonials).omit({ id: true });
export type InsertTestimonial = z.infer<typeof insertTestimonialSchema>;
export type Testimonial = typeof testimonials.$inferSelect;

// Users table (kept for compatibility)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Frontend-only types for booking flow
export const bookingFormSchema = z.object({
  guestName: z.string().min(2, "Name is required"),
  guestEmail: z.string().email("Valid email is required"),
  guestPhone: z.string().min(10, "Phone number is required"),
  guestCountry: z.string().optional(),
  specialRequests: z.string().optional(),
  paymentMethod: z.enum(["card", "pay_later"]),
});

export type BookingFormData = z.infer<typeof bookingFormSchema>;
