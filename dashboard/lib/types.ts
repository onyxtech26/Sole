// ─── Shared types for API and frontend ───────────────────

export type Status = "Pending" | "Confirmed" | "Completed" | "Cancelled";
export type TravellerType = "Adult" | "Child" | "Infant";

export type TravellerInput = {
  id?: number;
  firstName: string;
  lastName: string;
  type: TravellerType;
  isLead: boolean;
  dateOfBirth?: string | null;
  nationality?: string;
  grossCents?: number;
  costCents?: number;
};

export type BookingInput = {
  reference: string;
  source: string;
  productId: number;
  productOptionId?: number | null;
  serviceDate: string; // YYYY-MM-DD
  startTime: string;    // HH:MM
  meetingPoint: string;
  phone: string;
  language: string;
  currency: string;
  amountCents: number;
  status: Status;
  receivedDate?: string | null;
  notes?: string;
  travellers: TravellerInput[];
};

// ─── Money + date helpers (integer cents end to end) ─────

export function formatMoney(cents: number, currency = "EUR"): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(cents / 100);
}

export function centsToDecimal(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function decimalToCents(decimal: number | string): number {
  return Math.round(Number(decimal) * 100);
}

export function todayRome(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Rome" });
}

export function fullName(t: { firstName: string; lastName: string }): string {
  return `${t.firstName} ${t.lastName}`.trim();
}
