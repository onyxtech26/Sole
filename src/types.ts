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
  status: 'Confirmed' | 'Pending' | 'Cancelled';
  paymentStatus: 'Paid' | 'Partially Paid' | 'Unpaid' | 'Refunded';
  assignedGuide: string;
  assignedVehicle: string;
  assignedDriver: string;
  okStatus: boolean;
  checkedInGuests: number[]; // indices of travelers checked in
  serviceLineItems?: { description: string; qty: number; unitPrice: number; total: number }[];
  notes?: string;
  vehicleStatus?: 'dispatched' | 'en_route' | 'completed' | 'not_started';
}

export interface User {
  username: string;
  role: 'manager' | 'staff' | 'guide';
}

export interface Vehicle {
  id: string;
  name: string;
  type: 'Mercedes S-Class' | 'Mercedes V-Class' | 'Range Rover' | 'Luxury Coach' | 'Tesla Model X';
  capacity: number;
  driverName: string;
  availability: 'Available' | 'On Tour' | 'Maintenance' | 'Resting';
  maintenanceStatus: 'Excellent' | 'Service Required' | 'Scheduled';
  licensePlate: string;
  image: string;
}

export interface GuideProfile {
  id: string;
  name: string;
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

export interface Expense {
  id: string;
  category: 'Fuel' | 'Catering' | 'Tickets/Fees' | 'Guide Fees' | 'Vehicle Repair' | 'Marketing' | 'Others';
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
