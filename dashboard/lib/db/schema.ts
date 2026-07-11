import {
  pgTable, text, integer, boolean, timestamp, date, time, serial, varchar,
  uniqueIndex, index, jsonb,
} from "drizzle-orm/pg-core";

// ─── Admins (staff logins) ───────────────────────────────
export const admins = pgTable("admins", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Products (Viator tours) ─────────────────────────────
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 500 }).notNull(),          // official Viator name
  shortName: varchar("short_name", { length: 120 }).notNull().default(""), // operational name for board/PDF
  viatorCode: varchar("viator_code", { length: 50 }).notNull(),
  active: boolean("active").default(true).notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Product options (Viator tour grades TG1/TG2/TG3) ────
export const productOptions = pgTable("product_options", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  code: varchar("code", { length: 10 }).notNull(),           // TG1 | TG2 | TG3
  name: varchar("name", { length: 255 }).notNull(),          // "Semi-Private Colosseo"
  capacity: integer("capacity").notNull().default(7),        // group cap for this grade (REQ-21)
  sortOrder: integer("sort_order").notNull().default(0),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("product_option_code_idx").on(t.productId, t.code)]);

// ─── Guides ──────────────────────────────────────────────
export const guides = pgTable("guides", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ─── Bookings ────────────────────────────────────────────
export const bookings = pgTable("bookings", {
  id: serial("id").primaryKey(),
  reference: varchar("reference", { length: 100 }).notNull(),
  source: varchar("source", { length: 50 }).notNull().default("Viator"),
  productId: integer("product_id").notNull().references(() => products.id),
  productOptionId: integer("product_option_id").references(() => productOptions.id),
  serviceDate: date("service_date").notNull(),
  startTime: time("start_time").notNull(),                   // Booking Time — what the customer bought
  meetingPoint: text("meeting_point").notNull().default(""),
  phone: varchar("phone", { length: 50 }).notNull().default(""),
  language: varchar("language", { length: 50 }).notNull().default("English"),
  currency: varchar("currency", { length: 10 }).notNull().default("EUR"),
  amountCents: integer("amount_cents").notNull().default(0), // net payout, whole booking
  status: varchar("status", { length: 20 }).notNull().default("Pending"),
  receivedDate: date("received_date"),
  notes: text("notes").notNull().default(""),
  createdBy: integer("created_by").references(() => admins.id),
  updatedBy: integer("updated_by").references(() => admins.id),
  version: integer("version").notNull().default(1),          // optimistic locking (REQ-09, 3 staff)
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  uniqueIndex("booking_ref_source_idx").on(t.reference, t.source),
  index("booking_service_date_idx").on(t.serviceDate),
]);

// ─── Tour groups (a day's consolidated departure) ────────
export const tourGroups = pgTable("tour_groups", {
  id: serial("id").primaryKey(),
  serviceDate: date("service_date").notNull(),
  productId: integer("product_id").notNull().references(() => products.id),
  productOptionId: integer("product_option_id").references(() => productOptions.id),
  guideId: integer("guide_id").references(() => guides.id),
  departureTime: time("departure_time"),                    // "Time" — actual assigned departure
  ticketTime: time("ticket_time"),                          // entry / ticket time
  capacity: integer("capacity"),                            // null = inherit from option
  ticketStatus: varchar("ticket_status", { length: 120 }).notNull().default(""), // "Ticket done 9:45"
  sortOrder: integer("sort_order").notNull().default(0),
  notes: text("notes").notNull().default(""),
  version: integer("version").notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [index("tour_group_date_idx").on(t.serviceDate)]);

// ─── Travellers ──────────────────────────────────────────
export const travellers = pgTable("travellers", {
  id: serial("id").primaryKey(),
  bookingId: integer("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
  groupId: integer("group_id").references(() => tourGroups.id, { onDelete: "set null" }), // null = Unassigned
  firstName: varchar("first_name", { length: 255 }).notNull().default(""),
  lastName: varchar("last_name", { length: 255 }).notNull().default(""),
  type: varchar("type", { length: 20 }).notNull().default("Adult"), // Adult | Child | Infant
  dateOfBirth: date("date_of_birth"),                        // Colosseum entry (REQ-33)
  nationality: varchar("nationality", { length: 80 }).notNull().default(""),
  isLead: boolean("is_lead").notNull().default(false),
  grossCents: integer("gross_cents").notNull().default(0),   // per-traveller (REQ-26)
  costCents: integer("cost_cents").notNull().default(0),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [
  index("traveller_booking_idx").on(t.bookingId),
  index("traveller_group_idx").on(t.groupId),
]);

// ─── Audit log (append-only) ─────────────────────────────
export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  entity: varchar("entity", { length: 40 }).notNull(),
  entityId: integer("entity_id").notNull(),
  action: varchar("action", { length: 40 }).notNull(),
  changedBy: integer("changed_by").references(() => admins.id),
  diff: jsonb("diff"),
  at: timestamp("at", { withTimezone: true }).defaultNow().notNull(),
});
