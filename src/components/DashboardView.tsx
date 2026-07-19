import React, { useState } from 'react';
import { Calendar, Users, CheckCircle, Coins, ArrowRight, Upload, Info } from 'lucide-react';
import { Booking, User } from '../types';
import { getRelativeDateString } from '../utils/seed';
import { DateRange, makeRange, inRange } from '../utils/dateFilter';
import DateRangeFilter from './DateRangeFilter';
import RollingNumber from './RollingNumber';

interface DashboardViewProps {
  bookings: Booking[];
  currentUser: User;
  onAddBookings: (newBookings: Booking[]) => void;
  onNavigate: (view: string) => void;
}

export default function DashboardView({ bookings, currentUser, onAddBookings, onNavigate }: DashboardViewProps) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  // Date-range filter driving the KPI cards (defaults to Today).
  const [range, setRange] = useState<DateRange>(() => makeRange('today', new Date()));

  // Bookings within the selected range
  const rangeBookings = bookings.filter(b => inRange(b.travelDate, range));
  const rangeBookingsCount = rangeBookings.length;

  // Travelers within the selected range
  const rangeTravelers = rangeBookings.reduce((sum, b) => sum + (b.paxCount.adults + b.paxCount.children), 0);

  // Completed bookings for the selected day/range (Confirmed & travel date passed or today)
  const rangeCompleted = rangeBookings.filter(b => b.status === 'Confirmed');
  const rangeCompletedCount = rangeCompleted.length;

  // Label describing the active range for card subtitles
  const rangeNoun = range.mode === 'today' ? "the day" : range.mode === 'week' ? "the week" : range.mode === 'month' ? "the month" : "the year";

  // Active Revenue (within range)
  const totalRevenue = rangeBookings.filter(b => b.status !== 'Cancelled').reduce((sum, b) => sum + b.amount, 0);

  // Sorted list of 4 most recent bookings (by booking reference code)
  const sortedRecent = [...bookings]
    .sort((a, b) => b.bookingRef.localeCompare(a.bookingRef))
    .slice(0, 4);

  // Donut chart parameters
  const activeCount = bookings.filter(b => b.status === 'Confirmed').length;
  const pendingCount = bookings.filter(b => b.status === 'Pending').length;
  const cancelledCount = bookings.filter(b => b.status === 'Cancelled').length;
  const totalCount = bookings.length;

  const activePct = totalCount > 0 ? (activeCount / totalCount) * 100 : 0;
  const pendingPct = totalCount > 0 ? (pendingCount / totalCount) * 100 : 0;
  const cancelledPct = totalCount > 0 ? (cancelledCount / totalCount) * 100 : 0;

  // CSV Processing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleImportCSV = () => {
    if (!csvFile) {
      setImportStatus({ type: 'error', message: '❌ Please select a CSV file first.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      if (!csvText) {
        setImportStatus({ type: 'error', message: '❌ CSV file is empty or unreadable.' });
        return;
      }

      const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        setImportStatus({ type: 'error', message: '❌ CSV file is empty or missing data rows.' });
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
      const importedList: Booking[] = [];
      let duplicateCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.trim().replace(/['"]/g, ''));
        if (cols.length < headers.length) continue;

        const getVal = (name: string) => {
          const idx = headers.indexOf(name);
          return idx !== -1 ? cols[idx] : '';
        };

        const ref = getVal('reference') || `BR-MIGRATE-${Date.now()}-${i}`;
        
        // Skip duplicates in currently existing bookings
        if (bookings.some(b => b.bookingRef === ref) || importedList.some(b => b.bookingRef === ref)) {
          duplicateCount++;
          continue;
        }

        const adults = parseInt(getVal('adults'), 10) || 1;
        const children = parseInt(getVal('children'), 10) || 0;
        const lead = getVal('client') || 'Migrated Client';
        
        const travelers = [lead];
        for (let a = 1; a < adults; a++) travelers.push(`Traveler ${a + 1} (Adult)`);
        for (let c = 0; c < children; c++) travelers.push(`Traveler ${c + 1} (Child)`);

        const amount = parseFloat(getVal('amount')) || 0;

        const newRecord: Booking = {
          bookingRef: ref,
          tourName: getVal('tour') || 'Private guided Tour of Colosseum...',
          productCode: 'MIGRATED',
          travelDate: getVal('date') || getRelativeDateString(0),
          tourTime: getVal('time') || '09:00',
          leadTraveler: lead,
          travelers: travelers,
          paxCount: { adults, children },
          phone: getVal('phone') || '',
          language: 'English',
          meetingPoint: 'Default Meeting Point',
          amount: amount,
          currency: 'EUR',
          status: (getVal('status') as 'Confirmed' | 'Pending' | 'Cancelled') || 'Confirmed',
          paymentStatus: 'Paid',
          assignedGuide: getVal('guide') || '',
          assignedDriver: 'None',
          okStatus: getVal('status') === 'Confirmed',
          checkedInGuests: []
        };

        importedList.push(newRecord);
      }

      if (importedList.length > 0) {
        onAddBookings(importedList);
        setImportStatus({
          type: 'success',
          message: `⭐ Bulk Import Complete! Imported ${importedList.length} new reservations. (Skipped ${duplicateCount} duplicates).`
        });
      } else {
        setImportStatus({
          type: 'error',
          message: `❌ No new bookings imported. (Skipped ${duplicateCount} duplicates).`
        });
      }
      setCsvFile(null);
    };

    reader.readAsText(csvFile);
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Welcome header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-end">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-theme-text tracking-tight font-sans">Operational Dashboard</h1>
          <p className="text-theme-muted text-sm mt-1">Real-time booking intelligence and daily manifest controls.</p>
        </div>
        <DateRangeFilter onChange={setRange} className="lg:items-end" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="relative group overflow-hidden bg-theme-panel backdrop-blur-xl border border-theme-border hover:border-theme-accent-border rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/[0.02] transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#0b1220] to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-theme-muted">Tours</p>
              <h2 className="text-2xl sm:text-3xl font-black text-theme-text">
                <RollingNumber value={rangeBookingsCount} />
              </h2>
              <p className="text-xs text-theme-muted">scheduled for {rangeNoun}</p>
            </div>
            <div className="p-2 rounded-lg bg-gradient-to-tr from-[#0b1220] to-orange-500 text-white shadow-sm border border-white/20 shrink-0 self-start">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="relative group overflow-hidden bg-theme-panel backdrop-blur-xl border border-theme-border hover:border-theme-accent-border rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/[0.02] transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#0b1220] to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-theme-muted">Travelers</p>
              <h2 className="text-2xl sm:text-3xl font-black text-theme-text">
                <RollingNumber value={rangeTravelers} />
              </h2>
              <p className="text-xs text-theme-muted">total tour PAX</p>
            </div>
            <div className="p-2 rounded-lg bg-gradient-to-tr from-[#0b1220] to-orange-500 text-white shadow-sm border border-white/20 shrink-0 self-start">
              <Users className="w-4 h-4" />
            </div>
          </div>
        </div>

        <div className="relative group overflow-hidden bg-theme-panel backdrop-blur-xl border border-theme-border hover:border-theme-accent-border rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/[0.02] transition-all duration-300 hover:-translate-y-1">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#0b1220] to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-theme-muted">Completed</p>
              <h2 className="text-2xl sm:text-3xl font-black text-theme-text">
                <RollingNumber value={rangeCompletedCount} />
              </h2>
              <p className="text-xs text-theme-muted">bookings for {rangeNoun}</p>
            </div>
            <div className="p-2 rounded-lg bg-gradient-to-tr from-[#0b1220] to-orange-500 text-white shadow-sm border border-white/20 shrink-0 self-start">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {currentUser.role !== 'staff' && (
          <div className="relative group overflow-hidden bg-theme-panel backdrop-blur-xl border border-theme-border hover:border-theme-accent-border rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/[0.02] transition-all duration-300 hover:-translate-y-1">
            <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#0b1220] to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <p className="text-xs font-bold uppercase tracking-wider text-theme-muted">Revenue</p>
                <h2 className="text-2xl sm:text-3xl font-black text-theme-text">
                  <RollingNumber value={totalRevenue} isCurrency={true} />
                </h2>
                <p className="text-xs text-theme-muted">for {rangeNoun}</p>
              </div>
              <div className="p-2 rounded-lg bg-gradient-to-tr from-[#0b1220] to-orange-500 text-white shadow-sm border border-white/20 shrink-0 self-start">
                <Coins className="w-4 h-4" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Grid of details: Recent Activity + Status Summary Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <div className="lg:col-span-2 bg-theme-panel backdrop-blur-xl border border-theme-border rounded-2xl p-6 shadow-xl shadow-black/[0.01]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-extrabold text-theme-text font-sans">Recently Added Bookings</h3>
            <button 
              onClick={() => onNavigate('bookings')}
              className="text-theme-accent hover:underline text-xs font-bold flex items-center gap-1 transition"
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-4">
            {sortedRecent.length === 0 ? (
              <p className="text-theme-muted text-sm py-4 font-medium">No bookings recorded.</p>
            ) : (
              sortedRecent.map(b => (
                <div key={b.bookingRef} className="flex justify-between items-center p-3.5 rounded-xl bg-white/40 hover:bg-white/70 border border-theme-border transition duration-200 shadow-sm shadow-black/[0.01]">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-theme-text truncate">{b.leadTraveler}</h4>
                    <p className="text-xs text-theme-muted truncate max-w-md mt-0.5">{b.tourName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-[10px] text-orange-600 font-bold">{b.bookingRef}</span>
                      <span className="text-[10px] text-theme-muted/50">•</span>
                      <span className="text-[10px] text-theme-muted font-medium">{b.travelDate}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {currentUser.role !== 'staff' && (
                      <p className="text-sm font-black text-theme-text mb-1">€{b.amount.toFixed(2)}</p>
                    )}
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider border ${
                      b.status === 'Confirmed' ? 'bg-emerald-600 border-transparent text-white' :
                      b.status === 'Pending' ? 'bg-orange-600 border-transparent text-white' :
                      'bg-rose-500 border-transparent text-white'
                    }`}>
                      {b.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Status Summary Chart */}
        <div className="bg-theme-panel backdrop-blur-xl border border-theme-border rounded-2xl p-6 shadow-xl shadow-black/[0.01] flex flex-col">
          <h3 className="text-lg font-extrabold text-theme-text font-sans mb-6">Reservation Status Summary</h3>
          
          <div className="flex-grow flex flex-col justify-center items-center gap-6">
            {/* Donut chart */}
            <div className="relative w-40 h-40">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                {/* Background circle */}
                <circle cx="18" cy="18" r="15.915" fill="none" stroke="rgba(15, 23, 42, 0.05)" strokeWidth="3" />
                
                {/* Segments */}
                {totalCount > 0 ? (
                  <>
                    {/* Confirmed Segment */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.2"
                      strokeDasharray={`${activePct} ${100 - activePct}`}
                      strokeDashoffset="0"
                      className="transition-all duration-500"
                    />
                    {/* Pending Segment (Premium Indigo) */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3.2"
                      strokeDasharray={`${pendingPct} ${100 - pendingPct}`}
                      strokeDashoffset={`-${activePct}`}
                      className="transition-all duration-500"
                    />
                    {/* Cancelled Segment */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3.2"
                      strokeDasharray={`${cancelledPct} ${100 - cancelledPct}`}
                      strokeDashoffset={`-${activePct + pendingPct}`}
                      className="transition-all duration-500"
                    />
                  </>
                ) : null}
              </svg>
              {/* Inner Hole text */}
              <div className="absolute inset-0 flex flex-col justify-center items-center text-center">
                <span className="text-2xl font-black text-theme-text leading-none">{totalCount}</span>
                <span className="text-[9px] font-bold text-theme-muted uppercase tracking-widest mt-1">Total</span>
              </div>
            </div>

            {/* Legends */}
            <div className="w-full grid grid-cols-1 gap-2.5 px-2">
              <div className="flex items-center justify-between text-xs text-theme-muted font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Confirmed</span>
                </div>
                <span className="font-bold text-theme-text">{activeCount}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-theme-muted font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Pending</span>
                </div>
                <span className="font-bold text-theme-text">{pendingCount}</span>
              </div>

              <div className="flex items-center justify-between text-xs text-theme-muted font-semibold">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Cancelled</span>
                </div>
                <span className="font-bold text-theme-text">{cancelledCount}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSV Legacy Bulk Importer - ONLY visible to managers */}
      {currentUser.role === 'manager' && (
        <div className="bg-theme-panel backdrop-blur-xl border border-theme-border rounded-2xl p-6 shadow-xl shadow-black/[0.01]">
          <div className="mb-4">
            <h3 className="text-lg font-extrabold text-theme-text font-sans">Database Legacy CSV Import</h3>
            <p className="text-theme-muted text-sm mt-0.5">Select a structured CSV file representing your old reservation log book to bulk-import historical records.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
            <div className="md:col-span-3 border border-dashed border-theme-border bg-white/30 rounded-2xl p-6 flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4 items-center">
                <div className="relative flex-grow w-full">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    id="csv-file-upload-input"
                    className="hidden"
                  />
                  <label
                    htmlFor="csv-file-upload-input"
                    className="flex items-center justify-between gap-4 border border-theme-border bg-white/50 hover:bg-white/80 text-theme-text rounded-xl px-4 py-3.5 cursor-pointer text-sm font-semibold transition"
                  >
                    <span className="truncate max-w-[200px]">{csvFile ? csvFile.name : 'Choose CSV file...'}</span>
                    <Upload className="w-4 h-4 text-theme-muted shrink-0" />
                  </label>
                </div>
                <button
                  onClick={handleImportCSV}
                  className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-orange-600/10 transition shrink-0 text-sm"
                >
                  Process & Import
                </button>
              </div>

              {importStatus && (
                <div className={`p-3.5 rounded-xl text-xs flex items-center gap-2 border ${
                  importStatus.type === 'success' 
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 font-semibold' 
                    : 'bg-rose-500/10 border-rose-500/20 text-rose-600 font-semibold'
                }`}>
                  <Info className="w-4 h-4 shrink-0" />
                  <span>{importStatus.message}</span>
                </div>
              )}
            </div>

            <details className="md:col-span-2 group border border-theme-border bg-white/40 rounded-2xl p-4 cursor-pointer outline-none select-none">
              <summary className="text-sm font-bold text-orange-600 flex items-center justify-between">
                <span>View Sample CSV Format</span>
                <span className="text-theme-muted group-open:rotate-180 transition-transform duration-200">▼</span>
              </summary>
              <div className="mt-3 text-theme-muted text-xs leading-relaxed space-y-2 cursor-text select-text">
                <p>Create a file named <code className="text-theme-text font-mono bg-white/60 px-1 py-0.5 rounded border border-theme-border">logs.csv</code> with this exact header and column content to test bulk operations:</p>
                <pre className="bg-white/60 border border-theme-border rounded p-3 text-[10px] font-mono text-emerald-600 overflow-x-auto whitespace-pre leading-relaxed select-all">
Reference,Client,Tour,Date,Time,Adults,Children,Phone,Guide,Amount,Status
BR-1223400501,Alice Miller,Private guided Tour of Colosseum... ,2026-07-08,09:00,2,0,+15551234,Colosseo guide,320.26,Confirmed
BR-1223400502,Bob Clark,Rome Highlights by Golf Cart Tour,2026-07-08,11:00,1,0,+15555678,Golf Cart guide,64.97,Confirmed
BR-1223400503,Charlie Davis,Guided Tour for Vatican Museum...,2026-07-09,14:00,2,1,+44770090,Joseph guide,150.00,Pending
                </pre>
              </div>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}
