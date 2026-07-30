export interface PaxCount {
  adults: number;
  children: number;
}

export interface Booking {
  bookingRef: string;
  tourName: string;
  productCode: string;
  travelDate: string; // YYYY-MM-DD
  tourTime: string; // HH:MM
  leadTraveler: string;
  travelers: string[];
  paxCount: PaxCount;
  phone: string;
  language: string;
  meetingPoint: string;
  amount: number;
  currency: string;
  status: 'Confirmed' | 'Modified' | 'Pending' | 'Cancelled';
  paymentStatus: 'Paid' | 'Partially Paid' | 'Unpaid' | 'Refunded';
  assignedGuide: string;
  assignedDriver: string;
  okStatus: boolean;
  checkedInGuests: number[]; // indices of travelers checked in
  serviceLineItems?: { description: string; qty: number; unitPrice: number; total: number }[];
  notes?: string;
  namesLocked?: boolean; // passport names verified & locked for ticket issuance
  namesComplete?: boolean; // all traveller names filled in manually (no placeholders left)
  tourGradeCode?: string; // e.g. "TG4" (Viator "Codice livello del tour")
  tourGradeTitle?: string; // e.g. "Semi Private (max 7 people) 14:00"
  source?: 'manual' | 'viator_import';
  // Four message-workflow flags as 0/1, index-aligned with WORKFLOW_STEPS:
  // [name collected, confirmed, time coordination sent, review requested].
  workflow?: number[];
}

/** One Viator report upload, appended to the shared history on every import. */
export interface ImportBatch {
  id: string;
  fileName: string;
  fileSize: number;
  importedAt: string; // ISO timestamp
  importedByName: string;
  rowsTotal: number;
  rowsAdded: number;
  rowsUpdated: number;
  rowsUnchanged: number;
  rowsCancelled: number;
  rowsInvalid: number;
  source: string;
}

export interface User {
  username: string;
  role: 'manager' | 'operations' | 'staff' | 'guide';
  fullName?: string;
  id?: string;
}

export interface GuideProfile {
  id: string;
  name: string;
  role: 'Guide' | 'Staff';
  phone: string;
  languages: string[];
  skills: string[];
  performanceRating: number; // 1-5 stars
  availability: 'Active' | 'On Break' | 'Unavailable';
  image: string;
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  country: string;
  travelHistoryCount: number;
  preferences: string[];
  documents: { name: string; type: string; url?: string }[];
  notes: string;
  journey: { date: string; title: string; description: string }[];
}

export interface Invoice {
  invoiceNo: string;
  bookingRef: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  status: 'Paid' | 'Unpaid' | 'Overdue';
}

export type ExpenseCategory = 'Guide' | 'Ticket' | 'Radio' | 'Staff Salary' | 'Other';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  status: 'Approved' | 'Pending';
  receiptUrl?: string;
  customCategory?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  timestamp: string;
  user: string;
  bookingRef: string;
}

export interface Notification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  category: 'Booking' | 'Payment' | 'Alert' | 'System';
  isRead: boolean;
}
