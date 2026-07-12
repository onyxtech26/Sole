import { Booking, Vehicle, GuideProfile, Expense, Customer, Notification } from '../types';

export function getRelativeDateString(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export const DEFAULT_SEED_DATA: Booking[] = [
  {
    bookingRef: 'BR-1414119089',
    tourName: 'Private guided Tour of Colosseum, Roman Forum & Palatine Hill',
    productCode: '5524558P4',
    travelDate: getRelativeDateString(-10), // Past
    tourTime: '09:00',
    leadTraveler: 'Robbie Alberda',
    travelers: ['Robbie Alberda (Adult)', 'Kathy Alberda (Adult)'],
    paxCount: { adults: 2, children: 0 },
    phone: '+1 580-513-2222',
    language: 'English',
    meetingPoint: 'Caffè Roma, Via del Colosseo, 31a, 00184 Rome RM, Italy',
    amount: 320.26,
    currency: 'EUR',
    status: 'Confirmed',
    paymentStatus: 'Paid',
    assignedGuide: 'Alexander Vance',
    assignedVehicle: 'Mercedes S-Class (Rome-A)',
    assignedDriver: 'Marcello Rossi',
    okStatus: true,
    checkedInGuests: [],
    vehicleStatus: 'completed',
    notes: 'VIP customer. Request bottled sparkling water and English-speaking local driver.'
  },
  {
    bookingRef: 'BR-1414119020',
    tourName: 'Guided Tour of Colosseum, Roman Forum & Palatine Hill in Rome',
    productCode: '5524558P1',
    travelDate: getRelativeDateString(0), // Today
    tourTime: '14:00',
    leadTraveler: 'Vihana Gupta',
    travelers: ['Vihana Gupta (Adult)', 'Suresh Chand Gupta (Adult)'],
    paxCount: { adults: 2, children: 0 },
    phone: '+91 98765-43210',
    language: 'English',
    meetingPoint: 'Colosseum entrance',
    amount: 115.34,
    currency: 'EUR',
    status: 'Confirmed',
    paymentStatus: 'Paid',
    assignedGuide: 'Colosseo guide',
    assignedVehicle: 'Mercedes V-Class (Rome-B)',
    assignedDriver: 'Giovanni Silva',
    okStatus: true,
    checkedInGuests: [],
    vehicleStatus: 'en_route',
    notes: 'First time visiting Rome.'
  },
  {
    bookingRef: 'BR-1414119050',
    tourName: 'Private guided Tour of Colosseum, Roman Forum & Palatine Hill',
    productCode: '5524558P4',
    travelDate: getRelativeDateString(0), // Today
    tourTime: '09:00',
    leadTraveler: 'Danielle DiNorscia',
    travelers: [
      'Danielle DiNorscia (Adult)',
      'Michael DiNorscia (Adult)',
      'Jackson DiNorscia (Child)',
      'Mason DiNorscia (Child)',
      'Cruz DiNorscia (Child)'
    ],
    paxCount: { adults: 2, children: 3 },
    phone: '+1 858-829-3931',
    language: 'English',
    meetingPoint: 'Caffè Roma, Via del Colosseo, 31a, 00184 Rome RM, Italy',
    amount: 586.92,
    currency: 'EUR',
    status: 'Confirmed',
    paymentStatus: 'Paid',
    assignedGuide: 'Alexander Vance',
    assignedVehicle: 'Luxury Coach (Rome-F)',
    assignedDriver: 'Fabrizio Moretti',
    okStatus: true,
    checkedInGuests: [],
    vehicleStatus: 'completed',
    notes: 'Requires 3 booster seats for children.'
  },
  {
    bookingRef: 'BR-1414119075',
    tourName: 'Guided Tour of Colosseum, Roman Forum & Palatine Hill in Rome',
    productCode: '5524558P1',
    travelDate: getRelativeDateString(1), // Tomorrow
    tourTime: '09:00',
    leadTraveler: 'Joseph Levi',
    travelers: ['Joseph Levi (Adult)', 'Lana Levi (Child)'],
    paxCount: { adults: 1, children: 1 },
    phone: '+1 646-334-3977',
    language: 'English',
    meetingPoint: 'Colosseum entrance',
    amount: 93.44,
    currency: 'EUR',
    status: 'Confirmed',
    paymentStatus: 'Unpaid',
    assignedGuide: 'Sofia Loren',
    assignedVehicle: 'Mercedes S-Class (Rome-C)',
    assignedDriver: 'Marcello Rossi',
    okStatus: true,
    checkedInGuests: [],
    vehicleStatus: 'not_started'
  },
  {
    bookingRef: 'BR-1414119090',
    tourName: 'Rome Highlights by Golf Cart Tour',
    productCode: '5524558P2',
    travelDate: getRelativeDateString(7), // Next Week
    tourTime: '11:00',
    leadTraveler: 'Jason Roper',
    travelers: ['Jason Roper (Adult)'],
    paxCount: { adults: 1, children: 0 },
    phone: '+1 917-533-1620',
    language: 'English',
    meetingPoint: 'Piazza Barberini',
    amount: 64.97,
    currency: 'EUR',
    status: 'Confirmed',
    paymentStatus: 'Partially Paid',
    assignedGuide: 'Marco Aurelio',
    assignedVehicle: 'Tesla Model X (Rome-E)',
    assignedDriver: 'Gianni Agnelli',
    okStatus: true,
    checkedInGuests: [],
    vehicleStatus: 'not_started'
  },
  {
    bookingRef: 'BR-1414119100',
    tourName: 'Discover North Cyprus: Private Famagusta Tour',
    productCode: '5524558P10',
    travelDate: getRelativeDateString(-1), // Yesterday
    tourTime: '10:00',
    leadTraveler: 'John Doe',
    travelers: ['John Doe (Adult)', 'Jane Doe (Adult)'],
    paxCount: { adults: 2, children: 0 },
    phone: '+44 7700 900077',
    language: 'English',
    meetingPoint: 'Famagusta Port',
    amount: 180.00,
    currency: 'EUR',
    status: 'Cancelled',
    paymentStatus: 'Refunded',
    assignedGuide: 'Famagusta guide',
    assignedVehicle: 'None',
    assignedDriver: 'None',
    okStatus: false,
    checkedInGuests: [],
    vehicleStatus: 'not_started'
  }
];

export const SEED_VEHICLES: Vehicle[] = [
  {
    id: 'V-101',
    name: 'S-Class Black Edition',
    type: 'Mercedes S-Class',
    capacity: 3,
    driverName: 'Marcello Rossi',
    availability: 'Available',
    maintenanceStatus: 'Excellent',
    licensePlate: 'ROM-992-VE',
    image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=300&auto=format&fit=crop&q=60'
  },
  {
    id: 'V-102',
    name: 'V-Class Executive Lounge',
    type: 'Mercedes V-Class',
    capacity: 7,
    driverName: 'Giovanni Silva',
    availability: 'On Tour',
    maintenanceStatus: 'Excellent',
    licensePlate: 'ROM-311-EL',
    image: 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=300&auto=format&fit=crop&q=60'
  },
  {
    id: 'V-103',
    name: 'Range Rover Autobiography',
    type: 'Range Rover',
    capacity: 4,
    driverName: 'Lorenzo Gatti',
    availability: 'Maintenance',
    maintenanceStatus: 'Service Required',
    licensePlate: 'ROM-448-RR',
    image: 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c?w=300&auto=format&fit=crop&q=60'
  },
  {
    id: 'V-104',
    name: 'Tesla Model X Plaid',
    type: 'Tesla Model X',
    capacity: 5,
    driverName: 'Gianni Agnelli',
    availability: 'Resting',
    maintenanceStatus: 'Scheduled',
    licensePlate: 'ROM-888-TS',
    image: 'https://images.unsplash.com/photo-1617788138017-80ad40651399?w=300&auto=format&fit=crop&q=60'
  }
];

export const SEED_GUIDES: GuideProfile[] = [
  {
    id: 'G-201',
    name: 'Alexander Vance',
    languages: ['English', 'German', 'French'],
    skills: ['Art History', 'Archaeology', 'Culinary Tours'],
    performanceRating: 5.0,
    availability: 'Active',
    image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60'
  },
  {
    id: 'G-202',
    name: 'Sofia Loren',
    languages: ['Italian', 'English', 'Spanish'],
    skills: ['Ancient Rome', 'Wine Tasting', 'Vatican Expert'],
    performanceRating: 4.9,
    availability: 'Active',
    image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=60'
  },
  {
    id: 'G-203',
    name: 'Marco Aurelio',
    languages: ['Italian', 'English', 'German', 'Japanese'],
    skills: ['Colosseum Specialist', 'VIP Escort', 'Photography'],
    performanceRating: 4.8,
    availability: 'Active',
    image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=60'
  }
];

export const SEED_EXPENSES: Expense[] = [
  {
    id: 'EXP-501',
    category: 'Fuel',
    amount: 145.00,
    date: getRelativeDateString(-2),
    description: 'Fuel fill for V-Class Tour Rome-Florence',
    status: 'Approved'
  },
  {
    id: 'EXP-502',
    category: 'Catering',
    amount: 320.00,
    date: getRelativeDateString(-1),
    description: 'Michelin-starred picnic box for VIP Colosseum Tour',
    status: 'Approved'
  },
  {
    id: 'EXP-503',
    category: 'Tickets/Fees',
    amount: 680.00,
    date: getRelativeDateString(0),
    description: 'Colosseum Gladiator arena skip-the-line pre-purchased entries',
    status: 'Pending'
  },
  {
    id: 'EXP-504',
    category: 'Vehicle Repair',
    amount: 1200.00,
    date: getRelativeDateString(-5),
    description: 'Range Rover scheduled 30k service & brake pad replacement',
    status: 'Approved'
  }
];

export const SEED_CUSTOMERS: Customer[] = [
  {
    id: 'C-801',
    name: 'Robbie Alberda',
    email: 'robbie.alberda@luxurytravels.com',
    phone: '+1 580-513-2222',
    country: 'United States',
    travelHistoryCount: 4,
    preferences: ['Only Michelin star restaurants', 'Prefers Mercedes S-Class', 'Dietary: Gluten-free'],
    documents: [{ name: 'Passport Copy.pdf', type: 'PDF' }],
    notes: 'Member of elite VIP travel program. Prefers quiet and professional drivers.',
    journey: [
      { date: getRelativeDateString(-10), title: 'Rome Colosseum VIP', description: 'Assigned driver Marcello. Guide Alexander.' },
      { date: getRelativeDateString(-8), title: 'Amalfi Coast Luxury Escape', description: 'Private Yacht booking with skipper.' }
    ]
  },
  {
    id: 'C-802',
    name: 'Vihana Gupta',
    email: 'vihana.g@guptacapital.in',
    phone: '+91 98765-43210',
    country: 'India',
    travelHistoryCount: 2,
    preferences: ['English fluent guide', 'Photography stops', 'Comfort seating'],
    documents: [{ name: 'Vatican Tickets.pdf', type: 'PDF' }],
    notes: 'Requires assistance with stairs.',
    journey: [
      { date: getRelativeDateString(0), title: 'Colosseum Private Guided', description: 'Assigned guide Colosseo guide.' }
    ]
  }
];

export const SEED_NOTIFICATIONS: Notification[] = [
  {
    id: 'N-301',
    title: 'Viator Import Success',
    description: 'Booking BR-1414119050 for Danielle DiNorscia imported successfully.',
    timestamp: getRelativeDateString(0) + ' 08:32',
    category: 'Booking',
    isRead: false
  },
  {
    id: 'N-302',
    title: 'Payment Pending Alert',
    description: 'Booking BR-1414119075 for Joseph Levi travel date tomorrow is still Unpaid.',
    timestamp: getRelativeDateString(0) + ' 09:15',
    category: 'Alert',
    isRead: false
  },
  {
    id: 'N-303',
    title: 'Vehicle Maintenance Overdue',
    description: 'Range Rover Autobiography requires standard servicing.',
    timestamp: getRelativeDateString(0) + ' 07:00',
    category: 'System',
    isRead: true
  }
];


