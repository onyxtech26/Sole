export type TravellerCard = {
  id: number;
  groupId: number | null;
  sortOrder: number;
  firstName: string;
  lastName: string;
  type: "Adult" | "Child" | "Infant";
  bookingId: number;
  bookingRef: string;
  bookedTime: string;        // HH:MM — what the customer bought
  partySize: number;         // total travellers in this booking
  countInThisGroup: number;  // for split indicator "2 of 8"
  phone: string;
  language: string;
};

export type GroupCard = {
  id: number;
  sortOrder: number;
  productId: number;
  productName: string;
  optionId: number | null;
  optionCode: string | null;
  departureTime: string | null;
  ticketTime: string | null;
  ticketStatus: string;
  guideId: number | null;
  guideName: string | null;
  capacity: number;
  travellers: TravellerCard[];
};

export type BoardData = {
  serviceDate: string;
  groups: GroupCard[];
  unassigned: TravellerCard[];
  guides: { id: number; name: string }[];
  products: { id: number; shortName: string }[];
  options: { id: number; productId: number; code: string; name: string; capacity: number }[];
};
