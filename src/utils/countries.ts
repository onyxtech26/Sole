// Country directory used by the CRM for the country field and the phone
// number's dial-code picker. Kept as plain data (no dependency) so it can be
// reused anywhere a country or an international number is captured.

export interface Country {
  name: string;
  iso: string; // ISO 3166-1 alpha-2
  dial: string; // e.g. "+39"
}

/** Flag emoji from an ISO code — two regional-indicator symbols. */
export const flagOf = (iso: string): string =>
  iso.toUpperCase().replace(/./g, c => String.fromCodePoint(127397 + c.charCodeAt(0)));

// Ordered alphabetically; the operator's own markets (Italy, Cyprus, Türkiye)
// and the biggest inbound source markets are all present.
export const COUNTRIES: Country[] = [
  { name: 'Afghanistan', iso: 'AF', dial: '+93' },
  { name: 'Albania', iso: 'AL', dial: '+355' },
  { name: 'Algeria', iso: 'DZ', dial: '+213' },
  { name: 'Argentina', iso: 'AR', dial: '+54' },
  { name: 'Armenia', iso: 'AM', dial: '+374' },
  { name: 'Australia', iso: 'AU', dial: '+61' },
  { name: 'Austria', iso: 'AT', dial: '+43' },
  { name: 'Azerbaijan', iso: 'AZ', dial: '+994' },
  { name: 'Bahrain', iso: 'BH', dial: '+973' },
  { name: 'Bangladesh', iso: 'BD', dial: '+880' },
  { name: 'Belarus', iso: 'BY', dial: '+375' },
  { name: 'Belgium', iso: 'BE', dial: '+32' },
  { name: 'Bolivia', iso: 'BO', dial: '+591' },
  { name: 'Bosnia and Herzegovina', iso: 'BA', dial: '+387' },
  { name: 'Brazil', iso: 'BR', dial: '+55' },
  { name: 'Bulgaria', iso: 'BG', dial: '+359' },
  { name: 'Cambodia', iso: 'KH', dial: '+855' },
  { name: 'Canada', iso: 'CA', dial: '+1' },
  { name: 'Chile', iso: 'CL', dial: '+56' },
  { name: 'China', iso: 'CN', dial: '+86' },
  { name: 'Colombia', iso: 'CO', dial: '+57' },
  { name: 'Costa Rica', iso: 'CR', dial: '+506' },
  { name: 'Croatia', iso: 'HR', dial: '+385' },
  { name: 'Cyprus', iso: 'CY', dial: '+357' },
  { name: 'Czechia', iso: 'CZ', dial: '+420' },
  { name: 'Denmark', iso: 'DK', dial: '+45' },
  { name: 'Dominican Republic', iso: 'DO', dial: '+1809' },
  { name: 'Ecuador', iso: 'EC', dial: '+593' },
  { name: 'Egypt', iso: 'EG', dial: '+20' },
  { name: 'Estonia', iso: 'EE', dial: '+372' },
  { name: 'Finland', iso: 'FI', dial: '+358' },
  { name: 'France', iso: 'FR', dial: '+33' },
  { name: 'Georgia', iso: 'GE', dial: '+995' },
  { name: 'Germany', iso: 'DE', dial: '+49' },
  { name: 'Ghana', iso: 'GH', dial: '+233' },
  { name: 'Greece', iso: 'GR', dial: '+30' },
  { name: 'Hong Kong', iso: 'HK', dial: '+852' },
  { name: 'Hungary', iso: 'HU', dial: '+36' },
  { name: 'Iceland', iso: 'IS', dial: '+354' },
  { name: 'India', iso: 'IN', dial: '+91' },
  { name: 'Indonesia', iso: 'ID', dial: '+62' },
  { name: 'Iraq', iso: 'IQ', dial: '+964' },
  { name: 'Ireland', iso: 'IE', dial: '+353' },
  { name: 'Israel', iso: 'IL', dial: '+972' },
  { name: 'Italy', iso: 'IT', dial: '+39' },
  { name: 'Japan', iso: 'JP', dial: '+81' },
  { name: 'Jordan', iso: 'JO', dial: '+962' },
  { name: 'Kazakhstan', iso: 'KZ', dial: '+7' },
  { name: 'Kenya', iso: 'KE', dial: '+254' },
  { name: 'Kuwait', iso: 'KW', dial: '+965' },
  { name: 'Latvia', iso: 'LV', dial: '+371' },
  { name: 'Lebanon', iso: 'LB', dial: '+961' },
  { name: 'Lithuania', iso: 'LT', dial: '+370' },
  { name: 'Luxembourg', iso: 'LU', dial: '+352' },
  { name: 'Malaysia', iso: 'MY', dial: '+60' },
  { name: 'Malta', iso: 'MT', dial: '+356' },
  { name: 'Mexico', iso: 'MX', dial: '+52' },
  { name: 'Moldova', iso: 'MD', dial: '+373' },
  { name: 'Monaco', iso: 'MC', dial: '+377' },
  { name: 'Montenegro', iso: 'ME', dial: '+382' },
  { name: 'Morocco', iso: 'MA', dial: '+212' },
  { name: 'Netherlands', iso: 'NL', dial: '+31' },
  { name: 'New Zealand', iso: 'NZ', dial: '+64' },
  { name: 'Nigeria', iso: 'NG', dial: '+234' },
  { name: 'North Macedonia', iso: 'MK', dial: '+389' },
  { name: 'Norway', iso: 'NO', dial: '+47' },
  { name: 'Oman', iso: 'OM', dial: '+968' },
  { name: 'Pakistan', iso: 'PK', dial: '+92' },
  { name: 'Panama', iso: 'PA', dial: '+507' },
  { name: 'Peru', iso: 'PE', dial: '+51' },
  { name: 'Philippines', iso: 'PH', dial: '+63' },
  { name: 'Poland', iso: 'PL', dial: '+48' },
  { name: 'Portugal', iso: 'PT', dial: '+351' },
  { name: 'Qatar', iso: 'QA', dial: '+974' },
  { name: 'Romania', iso: 'RO', dial: '+40' },
  { name: 'Russia', iso: 'RU', dial: '+7' },
  { name: 'Saudi Arabia', iso: 'SA', dial: '+966' },
  { name: 'Serbia', iso: 'RS', dial: '+381' },
  { name: 'Singapore', iso: 'SG', dial: '+65' },
  { name: 'Slovakia', iso: 'SK', dial: '+421' },
  { name: 'Slovenia', iso: 'SI', dial: '+386' },
  { name: 'South Africa', iso: 'ZA', dial: '+27' },
  { name: 'South Korea', iso: 'KR', dial: '+82' },
  { name: 'Spain', iso: 'ES', dial: '+34' },
  { name: 'Sri Lanka', iso: 'LK', dial: '+94' },
  { name: 'Sweden', iso: 'SE', dial: '+46' },
  { name: 'Switzerland', iso: 'CH', dial: '+41' },
  { name: 'Taiwan', iso: 'TW', dial: '+886' },
  { name: 'Thailand', iso: 'TH', dial: '+66' },
  { name: 'Tunisia', iso: 'TN', dial: '+216' },
  { name: 'Türkiye', iso: 'TR', dial: '+90' },
  { name: 'Ukraine', iso: 'UA', dial: '+380' },
  { name: 'United Arab Emirates', iso: 'AE', dial: '+971' },
  { name: 'United Kingdom', iso: 'GB', dial: '+44' },
  { name: 'United States', iso: 'US', dial: '+1' },
  { name: 'Uruguay', iso: 'UY', dial: '+598' },
  { name: 'Uzbekistan', iso: 'UZ', dial: '+998' },
  { name: 'Venezuela', iso: 'VE', dial: '+58' },
  { name: 'Vietnam', iso: 'VN', dial: '+84' },
];

export const countryByIso = (iso: string): Country | undefined =>
  COUNTRIES.find(c => c.iso === iso);

export const countryByName = (name: string): Country | undefined => {
  const n = (name || '').trim().toLowerCase();
  return n ? COUNTRIES.find(c => c.name.toLowerCase() === n) : undefined;
};

// Some dial codes are shared (+1 US/Canada, +7 Russia/Kazakhstan). When we have
// to guess which country a stored number belongs to, prefer the larger market
// so the flag shown next to a number is right far more often than not.
const DIAL_PRIMARY: Record<string, string> = { '+1': 'US', '+7': 'RU' };

// Longest dial code first, so "+1809" (Dominican Republic) is matched before
// "+1"; ties resolved by the primary-market preference above.
const BY_DIAL_LENGTH = [...COUNTRIES].sort((a, b) => {
  if (b.dial.length !== a.dial.length) return b.dial.length - a.dial.length;
  const primary = DIAL_PRIMARY[a.dial];
  if (primary === a.iso) return -1;
  if (primary === b.iso) return 1;
  return 0;
});

/**
 * Split a stored phone string into its dial code and national number.
 * "+39 331 174 6737" -> { iso: 'IT', dial: '+39', number: '331 174 6737' }
 * A number with no recognisable dial code comes back with iso/dial empty and
 * the whole value as `number`, so nothing the team already typed is lost.
 */
export function splitPhone(phone: string): { iso: string; dial: string; number: string } {
  const raw = (phone || '').trim();
  if (!raw) return { iso: '', dial: '', number: '' };
  if (raw.startsWith('+')) {
    // Try a direct prefix match first so the operator's own spacing survives an
    // edit round-trip; only fall back to a separator-stripped compare.
    const direct = BY_DIAL_LENGTH.find(c => raw.startsWith(c.dial));
    if (direct) {
      return {
        iso: direct.iso,
        dial: direct.dial,
        number: raw.slice(direct.dial.length).replace(/^[\s\-().]+/, ''),
      };
    }
    const compact = raw.replace(/[\s\-().]/g, '');
    const match = BY_DIAL_LENGTH.find(c => compact.startsWith(c.dial));
    if (match) {
      return { iso: match.iso, dial: match.dial, number: compact.slice(match.dial.length) };
    }
  }
  return { iso: '', dial: '', number: raw };
}

/** Recombine a dial code and national number into one stored value. */
export function joinPhone(dial: string, number: string): string {
  const n = (number || '').trim();
  if (!n) return '';
  const d = (dial || '').trim();
  return d ? `${d} ${n}` : n;
}
