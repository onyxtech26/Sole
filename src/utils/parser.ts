import { Booking } from '../types';

export interface ParsedBooking extends Omit<Booking, 'checkedInGuests'> {
  checkedInGuests: number[];
}

export const ViatorParser = {
  products: [
    { code: '5524558P19', name: "Private Guided Walking Tour of Rome's City Highlights" },
    { code: '5524558P18', name: "Rome Photo Shoot in Rome with Professional Photographer" },
    { code: '5524558P10', name: "Discover North Cyprus: Private Famagusta Tour" },
    { code: '5524558P4',  name: "Private guided Tour of Colosseum, Roman Forum & Palatine Hill" },
    { code: '5524558P3',  name: "Guided Tour for Vatican Museum and Sistin Chapel" },
    { code: '5524558P2',  name: "Rome Highlights by Golf Cart Tour" },
    { code: '5524558P1',  name: "Guided Tour of Colosseum, Roman Forum & Palatine Hill in Rome" }
  ],

  parse(text: string): ParsedBooking | null {
    if (!text || typeof text !== 'string') return null;

    const result: ParsedBooking = {
      bookingRef: '',
      tourName: '',
      productCode: '',
      travelDate: '',
      tourTime: '',
      leadTraveler: '',
      travelers: [],
      paxCount: { adults: 0, children: 0 },
      phone: '',
      language: 'English',
      meetingPoint: '',
      amount: 0,
      currency: 'EUR',
      status: 'Confirmed',
      paymentStatus: 'Paid',
      assignedGuide: '',
      assignedVehicle: 'None',
      assignedDriver: 'None',
      okStatus: true,
      checkedInGuests: [],
      vehicleStatus: 'not_started'
    };

    // 1. Parse Booking Reference (e.g., BR-1414119089 or BR-123456789)
    const refRegex = /BR-\d+/i;
    const refMatch = text.match(refRegex);
    if (refMatch) {
      result.bookingRef = refMatch[0].toUpperCase();
    }

    // 2. Parse Product Code (e.g. 5524558P4)
    const prodCodeRegex = /Product Code\s*:\s*([A-Z0-9]+)/i;
    const prodCodeMatch = text.match(prodCodeRegex);
    if (prodCodeMatch) {
      result.productCode = prodCodeMatch[1].trim();
    }

    // 3. Parse Tour Name
    let foundProduct = null;
    for (const p of this.products) {
      if (text.toLowerCase().includes(p.name.toLowerCase()) || text.toLowerCase().includes(p.code.toLowerCase())) {
        foundProduct = p;
        break;
      }
    }
    
    if (foundProduct) {
      result.tourName = foundProduct.name;
      result.productCode = foundProduct.code;
    } else {
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      for (let i = 0; i < Math.min(10, lines.length); i++) {
        const line = lines[i];
        if (line.includes('Tour of') || line.includes('Guided Tour') || line.includes('Famagusta') || line.includes('Photo Shoot')) {
          result.tourName = line.replace(/CONFIRMED/i, '').replace(/PENDING/i, '').trim();
          break;
        }
      }
    }

    // 4. Parse Lead Traveler
    const leadRegex = /Lead Traveler\s*:\s*([^\n\r]+)/i;
    const leadMatch = text.match(leadRegex);
    if (leadMatch) {
      result.leadTraveler = leadMatch[1].trim();
    }

    // 5. Parse Phone Number
    const phoneRegex = /phone number\s*:\s*([^\n\r]+)/i;
    const phoneMatch = text.match(phoneRegex);
    if (phoneMatch) {
      let phoneStr = phoneMatch[1].trim();
      phoneStr = phoneStr.replace(/Show/i, '').trim();
      result.phone = phoneStr;
    }

    // 6. Parse Language
    const langRegex = /Tour language\s*:\s*([^\n\r]+)/i;
    const langMatch = text.match(langRegex);
    if (langMatch) {
      result.language = langMatch[1].trim();
    }

    // 7. Parse Meeting Point
    const meetingRegex = /Meeting point\s*:\s*([^\n\r]+)/i;
    const meetingMatch = text.match(meetingRegex);
    if (meetingMatch) {
      result.meetingPoint = meetingMatch[1].trim();
    } else {
      const mtIndex = text.indexOf('Meeting point :');
      if (mtIndex !== -1) {
        const afterMeeting = text.substring(mtIndex + 15).trim();
        const lines = afterMeeting.split('\n');
        if (lines.length > 0) {
          result.meetingPoint = lines[0].trim();
        }
      }
    }

    // 8. Parse Travel Date
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December',
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    
    const dateRegex = new RegExp(`(?:Sun|Mon|Tue|Wed|Thu|Fri|Sat)?,?\\s*(${months.join('|')})\\s+(\\d{1,2}),?\\s*(\\d{4})`, 'i');
    const dateMatch = text.match(dateRegex);
    if (dateMatch) {
      const monthStr = dateMatch[1];
      const day = parseInt(dateMatch[2], 10);
      const year = parseInt(dateMatch[3], 10);
      
      let monthIdx = -1;
      for (let i = 0; i < months.length; i++) {
        if (months[i].toLowerCase() === monthStr.toLowerCase()) {
          monthIdx = i % 12;
          break;
        }
      }
      
      if (monthIdx !== -1) {
        const parsedDate = new Date(year, monthIdx, day);
        const yyyy = parsedDate.getFullYear();
        const mm = String(parsedDate.getMonth() + 1).padStart(2, '0');
        const dd = String(parsedDate.getDate()).padStart(2, '0');
        result.travelDate = `${yyyy}-${mm}-${dd}`;
      }
    }

    // 9. Parse Tour Time
    const timeRegex = /(?:at)?\s*(\d{1,2}):(\d{2})(?:\s*(AM|PM))?/i;
    const timeMatch = text.match(timeRegex);
    if (timeMatch) {
      let hh = parseInt(timeMatch[1], 10);
      const mm = timeMatch[2];
      const ampm = timeMatch[3];
      
      if (ampm) {
        if (ampm.toUpperCase() === 'PM' && hh < 12) hh += 12;
        if (ampm.toUpperCase() === 'AM' && hh === 12) hh = 0;
      }
      result.tourTime = `${String(hh).padStart(2, '0')}:${mm}`;
    }

    // 10. Parse Travelers list and pax count
    const paxCountRegex = /(\d+)\s*adults?/i;
    const paxChildRegex = /(\d+)\s*child(?:ren)?/i;
    
    const paxCountMatch = text.match(paxCountRegex);
    if (paxCountMatch) {
      result.paxCount.adults = parseInt(paxCountMatch[1], 10);
    }
    const paxChildMatch = text.match(paxChildRegex);
    if (paxChildMatch) {
      result.paxCount.children = parseInt(paxChildMatch[1], 10);
    }

    const travelersRegex = /Names of travellers\s*:?\s*([\s\S]+?)(?=Tour language|Inclusions|$)/i;
    const travelersMatch = text.match(travelersRegex);
    if (travelersMatch) {
      const listText = travelersMatch[1].trim();
      const rawTravelers = listText.split(/[\n\r•]+/).map(t => t.trim()).filter(Boolean);
      result.travelers = rawTravelers.map(t => {
        return t.replace(/\(\s*(Adult|Child)\s*\)/i, '($1)');
      });

      if (result.paxCount.adults === 0 && result.paxCount.children === 0) {
        result.travelers.forEach(name => {
          if (name.toLowerCase().includes('child')) {
            result.paxCount.children++;
          } else {
            result.paxCount.adults++;
          }
        });
      }
    }

    // 11. Parse Amount
    const amountRegex = /(?:Amount you will receive|Price|Amount|Total)\s*:?\s*(?:EUR|USD|\$|RM|MYR)?\s*([\d,.]+)\s*(EUR|USD|MYR|RM)?/i;
    const amountMatch = text.match(amountRegex);
    if (amountMatch) {
      const rawAmount = amountMatch[1].replace(/,/g, '');
      result.amount = parseFloat(rawAmount);
      if (amountMatch[2]) {
        result.currency = amountMatch[2].toUpperCase().trim();
        if (result.currency === 'RM') result.currency = 'MYR';
      }
    } else {
      const altAmountRegex = /(?:EUR|€|USD|\$|RM|MYR)\s*([\d,.]+)/i;
      const altMatch = text.match(altAmountRegex);
      if (altMatch) {
        result.amount = parseFloat(altMatch[1].replace(/,/g, ''));
      }
    }

    if (!result.leadTraveler && result.travelers.length > 0) {
      result.leadTraveler = result.travelers[0].replace(/\((Adult|Child)\)/i, '').trim();
    }

    return result;
  }
};
