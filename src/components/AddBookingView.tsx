import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle, AlertTriangle, AlertCircle, Plus, Edit, Sparkles, CheckSquare } from 'lucide-react';
import { Booking, User, GuideProfile } from '../types';
import { ViatorParser } from '../utils/parser';
import { computeNamesComplete } from '../utils/viatorImport';
import CustomDatePicker from './CustomDatePicker';
import { usePersistentValue } from '../utils/storage';
import { SEED_GUIDES } from '../utils/seed';
import { DEFAULT_PRODUCTS, PRODUCTS_STORAGE_KEY, Product } from './ProductsView';
import { GUIDES_STORAGE_KEY } from './GuidesView';

interface AddBookingViewProps {
  bookings: Booking[];
  currentUser: User;
  editBookingRef: string | null;
  onSaveBooking: (booking: Booking) => void;
  onCancel: () => void;
}

const TOUR_OPTIONS = [
  "Private guided Tour of Colosseum, Roman Forum & Palatine Hill",
  "Guided Tour of Colosseum, Roman Forum & Palatine Hill in Rome",
  "Private Guided Walking Tour of Rome's City Highlights",
  "Rome Photo Shoot in Rome with Professional Photographer",
  "Discover North Cyprus: Private Famagusta Tour",
  "Guided Tour for Vatican Museum and Sistin Chapel",
  "Rome Highlights by Golf Cart Tour"
];

export default function AddBookingView({
  bookings,
  currentUser,
  editBookingRef,
  onSaveBooking,
  onCancel
}: AddBookingViewProps) {
  // Form State
  const [bookingRef, setBookingRef] = useState('');
  const [assignedGuide, setAssignedGuide] = useState('');
  const [tourName, setTourName] = useState('');
  const [productCode, setProductCode] = useState('');
  const [travelDate, setTravelDate] = useState('');
  const [tourTime, setTourTime] = useState('');
  const [leadTraveler, setLeadTraveler] = useState('');
  const [phone, setPhone] = useState('');
  const [paxAdults, setPaxAdults] = useState(1);
  const [paxChildren, setPaxChildren] = useState(0);
  const [amount, setAmount] = useState(0);
  const [language, setLanguage] = useState('English');
  const [meetingPoint, setMeetingPoint] = useState('');
  const [status, setStatus] = useState<Booking['status']>('Confirmed');
  const [travelersText, setTravelersText] = useState('');

  // Live directories — read from the shared store so guides/products added in
  // their own views (or another tab) appear here immediately.
  const guides = usePersistentValue<GuideProfile[]>(GUIDES_STORAGE_KEY, SEED_GUIDES);
  const products = usePersistentValue<Product[]>(PRODUCTS_STORAGE_KEY, DEFAULT_PRODUCTS);
  const guideOptions = guides.map(g => g.name).filter(Boolean);
  const tourOptions = Array.from(
    new Set([...products.map(p => p.label), ...products.map(p => p.name), ...TOUR_OPTIONS].filter(Boolean))
  );

  // Pick a tour and auto-fill its product code when it maps to a catalog product.
  const handleSelectTour = (value: string) => {
    setTourName(value);
    const match = products.find(p => p.label === value || p.name === value);
    if (match) setProductCode(match.code);
  };

  // Paste Area State
  const [pasteText, setPasteText] = useState('');
  const [parserStatus, setParserStatus] = useState<{ type: 'loading' | 'success' | 'error'; message: string } | null>(null);
  const [glowState, setGlowState] = useState(false);

  // Guide Conflict Warning State
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Effect to load existing booking details if editBookingRef is set
  useEffect(() => {
    if (editBookingRef) {
      const existing = bookings.find(b => b.bookingRef === editBookingRef);
      if (existing) {
        setBookingRef(existing.bookingRef);
        setAssignedGuide(existing.assignedGuide || '');
        setTourName(existing.tourName || '');
        setProductCode(existing.productCode || '');
        setTravelDate(existing.travelDate || '');
        setTourTime(existing.tourTime || '');
        setLeadTraveler(existing.leadTraveler || '');
        setPhone(existing.phone || '');
        setPaxAdults(existing.paxCount.adults || 1);
        setPaxChildren(existing.paxCount.children || 0);
        setAmount(existing.amount || 0);
        setLanguage(existing.language || 'English');
        setMeetingPoint(existing.meetingPoint || '');
        setStatus(existing.status || 'Confirmed');
        setTravelersText(existing.travelers ? existing.travelers.join('\n') : '');
      }
    } else {
      // Set empty defaults
      resetForm();
    }
  }, [editBookingRef, bookings]);

  // Handle automatic conflict checking
  useEffect(() => {
    if (!assignedGuide || !travelDate || !tourTime) {
      setConflictWarning(null);
      return;
    }

    const conflict = bookings.find(b => 
      b.bookingRef !== bookingRef &&
      b.assignedGuide === assignedGuide &&
      b.travelDate === travelDate &&
      b.tourTime === tourTime &&
      b.status !== 'Cancelled'
    );

    if (conflict) {
      setConflictWarning(
        `👤 Guide "${assignedGuide}" is already assigned to "${conflict.tourName}" at ${conflict.tourTime} on this date.`
      );
    } else {
      setConflictWarning(null);
    }
  }, [assignedGuide, travelDate, tourTime, bookingRef, bookings]);

  const resetForm = () => {
    setBookingRef('');
    setAssignedGuide('');
    setTourName('');
    setProductCode('');
    setTravelDate('');
    setTourTime('');
    setLeadTraveler('');
    setPhone('');
    setPaxAdults(1);
    setPaxChildren(0);
    setAmount(0);
    setLanguage('English');
    setMeetingPoint('');
    setStatus('Confirmed');
    setTravelersText('');
    setPasteText('');
    setParserStatus(null);
    setGlowState(false);
    setConflictWarning(null);
  };

  // Viator auto-parser trigger on pasting details
  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setPasteText(text);

    if (!text.trim()) {
      setParserStatus(null);
      return;
    }

    // Show simulated AI loader feedback
    setParserStatus({
      type: 'loading',
      message: 'Analyzing text blocks & identifying Viator schemas...'
    });

    setTimeout(() => {
      try {
        const parsed = ViatorParser.parse(text);
        if (parsed) {
          if (parsed.bookingRef) setBookingRef(parsed.bookingRef);
          if (parsed.tourName) {
            // Find matched or similar option, otherwise default
            const match = TOUR_OPTIONS.find(o => o.toLowerCase().includes(parsed.tourName.toLowerCase())) || parsed.tourName;
            setTourName(match);
          }
          if (parsed.productCode) setProductCode(parsed.productCode);
          if (parsed.travelDate) setTravelDate(parsed.travelDate);
          if (parsed.tourTime) setTourTime(parsed.tourTime);
          if (parsed.leadTraveler) setLeadTraveler(parsed.leadTraveler);
          
          setPaxAdults(parsed.paxCount.adults || 1);
          setPaxChildren(parsed.paxCount.children || 0);
          
          if (parsed.phone) setPhone(parsed.phone);
          if (parsed.language) setLanguage(parsed.language);
          if (parsed.meetingPoint) setMeetingPoint(parsed.meetingPoint);
          if (parsed.amount) setAmount(parsed.amount);
          
          if (parsed.travelers && parsed.travelers.length > 0) {
            setTravelersText(parsed.travelers.join('\n'));
          }

          setParserStatus({
            type: 'success',
            message: `⭐ AI Parsing Successful! Mapped booking reference "${parsed.bookingRef || 'N/A'}". Form values updated.`
          });

          // Trigger form glow outline feedback effect
          setGlowState(true);
          setTimeout(() => setGlowState(false), 2000);

        } else {
          throw new Error("Unable to identify standard booking reference or traveler details.");
        }
      } catch (err: any) {
        setParserStatus({
          type: 'error',
          message: `❌ AI Parsing Error: ${err.message || 'The pasted layout did not match a standard Viator confirmation format.'}`
        });
      }
    }, 850);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!bookingRef.trim()) {
      alert("Please provide a Booking Reference.");
      return;
    }

    if (!tourName) {
      alert("Please select a Tour / Product.");
      return;
    }

    if (!travelDate) {
      alert("Please provide a Travel Date.");
      return;
    }

    if (!tourTime) {
      alert("Please provide a Tour Time.");
      return;
    }

    // Ensure booking reference uniqueness if NOT in edit mode
    if (!editBookingRef && bookings.some(b => b.bookingRef === bookingRef.trim())) {
      alert(`❌ Reference code "${bookingRef.trim()}" is already registered. Please provide a unique reference code.`);
      return;
    }

    const travelers = travelersText
      .split('\n')
      .map(t => t.trim())
      .filter(Boolean);

    // Track whether all passenger names have been filled in (no placeholders),
    // so the schedule board's name-lock radar can stop flagging this booking.
    const namesComplete = computeNamesComplete(travelers);

    // When editing, spread the existing record first so fields the form does not
    // expose (notes, serviceLineItems, namesLocked, currency, driver, etc.) are
    // preserved instead of being silently wiped.
    const existing = editBookingRef
      ? bookings.find(b => b.bookingRef === editBookingRef)
      : undefined;

    const updatedBooking: Booking = {
      ...(existing || {}),
      bookingRef: bookingRef.trim(),
      tourName,
      productCode: productCode.trim(),
      travelDate,
      tourTime,
      leadTraveler: leadTraveler.trim(),
      travelers,
      paxCount: { adults: paxAdults, children: paxChildren },
      phone: phone.trim(),
      language,
      meetingPoint: meetingPoint.trim(),
      amount,
      currency: existing?.currency || 'EUR',
      status,
      paymentStatus: existing?.paymentStatus || 'Unpaid',
      assignedGuide,
      assignedDriver: existing?.assignedDriver || 'None',
      okStatus: status === 'Confirmed',
      checkedInGuests: existing?.checkedInGuests || [],
      namesComplete,
    };

    onSaveBooking(updatedBooking);
    resetForm();
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans text-center">
          {editBookingRef ? 'Edit Reservation Details' : 'Manual Reservation Entry'}
        </h1>
        <p className="text-slate-500 text-sm mt-1 font-semibold text-center">
          Input reservation details manually.
        </p>
      </div>

      {/* AI Paste & Fill Accelerator */}
      {!editBookingRef && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-md space-y-4">
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-4.5 h-4.5 text-orange-600 animate-[pulse_2s_infinite]" />
              <span>AI Paste & Fill Accelerator</span>
            </h3>
            <p className="text-slate-500 text-xs mt-0.5 font-medium">
              Copy the entire Viator booking confirmation webpage (Ctrl+A then Ctrl+C) and paste it below. The system will auto-populate all guest records, amounts, and dates.
            </p>
          </div>

          <div className="space-y-3">
            <textarea
              value={pasteText}
              onChange={handlePasteChange}
              placeholder="Paste Viator confirmation details here..."
              rows={3}
              className="w-full bg-white/60 border border-slate-200 rounded-xl p-3.5 text-xs font-semibold outline-none transition focus:border-orange-500"
            />

            {parserStatus && (
              <div className={`p-3 rounded-xl text-xs flex items-center gap-2 border ${
                parserStatus.type === 'loading' ? 'bg-slate-50 border-slate-200 text-slate-500 animate-pulse' :
                parserStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 font-bold' :
                'bg-rose-50 border-rose-200 text-rose-700 font-bold'
              }`}>
                {parserStatus.type === 'loading' ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> :
                 parserStatus.type === 'success' ? <CheckSquare className="w-4 h-4 text-emerald-500" /> :
                 <AlertCircle className="w-4 h-4 text-rose-500" />}
                <span>{parserStatus.message}</span>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="w-full">
        {/* Main Form Container */}
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-md">
          {/* Conflict warning alert */}
          {conflictWarning && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex gap-2.5 items-start border-l-4 border-l-rose-500 font-bold">
              <AlertTriangle className="w-4.5 h-4.5 shrink-0 text-rose-500" />
              <span>{conflictWarning}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Reference */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Booking Reference</label>
                <input
                  type="text"
                  required
                  readOnly={!!editBookingRef}
                  value={bookingRef}
                  onChange={(e) => setBookingRef(e.target.value)}
                  placeholder="BR-XXXXXXXXXX"
                  className={`w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 ${
                    editBookingRef ? 'opacity-65 cursor-not-allowed bg-slate-100 font-bold' : ''
                  } ${glowState ? 'ring-2 ring-emerald-500 border-emerald-500' : ''}`}
                />
              </div>

              {/* Guide */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Assigned Guide</label>
                <select
                  value={assignedGuide}
                  onChange={(e) => setAssignedGuide(e.target.value)}
                  className={`w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold outline-none cursor-pointer focus:border-orange-500 focus:bg-white ${
                    glowState ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                  }`}
                >
                  <option value="">No Guide Assigned</option>
                  {guideOptions.map((g, idx) => (
                    <option key={idx} value={g}>{g}</option>
                  ))}
                  {assignedGuide && !guideOptions.includes(assignedGuide) && (
                    <option value={assignedGuide}>{assignedGuide}</option>
                  )}
                </select>
              </div>

              {/* Tour select dropdown */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tour / Product Name</label>
                <select
                  required
                  value={tourName}
                  onChange={(e) => handleSelectTour(e.target.value)}
                  className={`w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold outline-none cursor-pointer focus:border-orange-500 focus:bg-white ${
                    glowState ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                  }`}
                >
                  <option value="">Select Tour</option>
                  {tourOptions.map((t, idx) => (
                    <option key={idx} value={t}>{t}</option>
                  ))}
                  {tourName && !tourOptions.includes(tourName) && (
                    <option value={tourName}>{tourName}</option>
                  )}
                </select>
              </div>

              {/* Product Code */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Product Code</label>
                <input
                  type="text"
                  value={productCode}
                  onChange={(e) => setProductCode(e.target.value)}
                  placeholder="e.g. 5524558P4"
                  className={`w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 ${
                    glowState ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                  }`}
                />
              </div>

              {/* Travel Date */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Travel Date</label>
                <CustomDatePicker
                  value={travelDate}
                  onChange={setTravelDate}
                  type="date"
                />
              </div>

              {/* Tour Time */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tour Time</label>
                <input
                  type="time"
                  required
                  value={tourTime}
                  onChange={(e) => setTourTime(e.target.value)}
                  className={`w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 ${
                    glowState ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                  }`}
                />
              </div>

              {/* Lead Traveler */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lead Traveler Name</label>
                <input
                  type="text"
                  required
                  value={leadTraveler}
                  onChange={(e) => setLeadTraveler(e.target.value)}
                  placeholder="Lead Guest Name"
                  className={`w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 ${
                    glowState ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                  }`}
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +1 555-555-5555"
                  className={`w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 ${
                    glowState ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                  }`}
                />
              </div>

              {/* Adults Pax */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Adult PAX</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={paxAdults}
                  onChange={(e) => setPaxAdults(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  className={`w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 ${
                    glowState ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                  }`}
                />
              </div>

              {/* Children Pax */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Child PAX</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={paxChildren}
                  onChange={(e) => setPaxChildren(Math.max(0, parseInt(e.target.value, 10) || 0))}
                  className={`w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 ${
                    glowState ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                  }`}
                />
              </div>

              {/* Amount - payout */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Payout Amount (€)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  min={0}
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className={`w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 ${
                    glowState ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                  }`}
                />
              </div>

              {/* Language */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className={`w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold outline-none cursor-pointer focus:border-orange-500 focus:bg-white ${
                    glowState ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                  }`}
                >
                  <option value="English">English</option>
                  <option value="Italian">Italian</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
              </div>

              {/* Status */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Booking Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Booking['status'])}
                  className={`w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold outline-none cursor-pointer focus:border-orange-500 focus:bg-white ${
                    glowState ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                  }`}
                >
                  <option value="Confirmed">Confirmed</option>
                  <option value="Modified">Modified</option>
                  <option value="Pending">Pending</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>

              {/* Meeting Point Address */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Meeting Point Address</label>
                <input
                  type="text"
                  value={meetingPoint}
                  onChange={(e) => setMeetingPoint(e.target.value)}
                  placeholder="Meeting Point details"
                  className={`w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 ${
                    glowState ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                  }`}
                />
              </div>

              {/* Full Travelers Manifest list text */}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Full Travelers Manifest (Names with brackets: Adult/Child)
                </label>
                <p className="text-[11px] text-slate-400 font-medium -mt-1">
                  Viator only provides the lead passenger. Replace placeholders like <span className="font-mono text-orange-600">Guest 2 (Adult)</span> / <span className="font-mono text-orange-600">Child 1 (Child)</span> with the real passport names — one per line.
                </p>
                <textarea
                  value={travelersText}
                  onChange={(e) => setTravelersText(e.target.value)}
                  placeholder="John Doe (Adult)&#10;Jane Doe (Adult)&#10;Jack Doe (Child)"
                  rows={4}
                  className={`w-full bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-sm text-slate-800 font-semibold outline-none transition focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 ${
                    glowState ? 'ring-2 ring-emerald-500 border-emerald-500' : ''
                  }`}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100">
              <button
                type="button"
                onClick={onCancel}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/80 font-bold px-5 py-3 rounded-xl text-sm transition shadow-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3 rounded-xl text-sm shadow-lg shadow-orange-600/15 transition flex items-center gap-2"
              >
                {editBookingRef ? <Edit className="w-4.5 h-4.5" /> : <Plus className="w-4.5 h-4.5" />}
                <span>{editBookingRef ? 'Update Booking' : 'Save Reservation'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
