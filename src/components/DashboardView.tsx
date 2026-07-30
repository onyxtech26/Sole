import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Calendar, Users, CheckCircle, Coins, ArrowRight } from 'lucide-react';
import { Booking, User } from '../types';
import { DateRange, makeRange, inRange } from '../utils/dateFilter';
import DateRangeFilter from './DateRangeFilter';
import RollingNumber from './RollingNumber';
import ViatorImportCard from './ViatorImportCard';

interface DashboardViewProps {
  bookings: Booking[];
  currentUser: User;
  onAddBookings: (newBookings: Booking[]) => void;
  onNavigate: (view: string) => void;
}

export default function DashboardView({ bookings, currentUser, onAddBookings, onNavigate }: DashboardViewProps) {
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
  const modifiedCount = bookings.filter(b => b.status === 'Modified').length;
  const pendingCount = bookings.filter(b => b.status === 'Pending').length;
  const cancelledCount = bookings.filter(b => b.status === 'Cancelled').length;
  const totalCount = bookings.length;

  const activePct = totalCount > 0 ? (activeCount / totalCount) * 100 : 0;
  const modifiedPct = totalCount > 0 ? (modifiedCount / totalCount) * 100 : 0;
  const pendingPct = totalCount > 0 ? (pendingCount / totalCount) * 100 : 0;
  const cancelledPct = totalCount > 0 ? (cancelledCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Welcome header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-end relative z-30">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-theme-text tracking-tight font-sans">Operational Dashboard</h1>
          <p className="text-theme-muted text-sm mt-1">Real-time booking intelligence and daily manifest controls.</p>
        </div>
        <DateRangeFilter onChange={setRange} className="lg:items-end" />
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05 }} className="relative group overflow-hidden bg-theme-panel backdrop-blur-xl border border-theme-border hover:border-theme-accent-border rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/[0.02] transition-all duration-300 hover:-translate-y-1">
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
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1 }} className="relative group overflow-hidden bg-theme-panel backdrop-blur-xl border border-theme-border hover:border-theme-accent-border rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/[0.02] transition-all duration-300 hover:-translate-y-1">
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
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.15 }} className="relative group overflow-hidden bg-theme-panel backdrop-blur-xl border border-theme-border hover:border-theme-accent-border rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/[0.02] transition-all duration-300 hover:-translate-y-1">
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
        </motion.div>

        {currentUser.role === 'manager' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.2 }} className="relative group overflow-hidden bg-theme-panel backdrop-blur-xl border border-theme-border hover:border-theme-accent-border rounded-2xl p-5 sm:p-6 shadow-xl shadow-black/[0.02] transition-all duration-300 hover:-translate-y-1">
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
          </motion.div>
        )}
      </div>

      {/* Grid of details: Recent Activity + Status Summary Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Bookings */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.25 }} className="lg:col-span-2 bg-theme-panel backdrop-blur-xl border border-theme-border rounded-2xl p-6 shadow-xl shadow-black/[0.01]">
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
                      <span className="font-mono text-[0.625rem] text-orange-600 font-bold">{b.bookingRef}</span>
                      <span className="text-[0.625rem] text-theme-muted/50">•</span>
                      <span className="text-[0.625rem] text-theme-muted font-medium">{b.travelDate}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    {currentUser.role === 'manager' && (
                      <p className="text-sm font-black text-theme-text mb-1">€{b.amount.toFixed(2)}</p>
                    )}
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[0.625rem] font-extrabold uppercase tracking-wider border ${
                      b.status === 'Confirmed' ? 'bg-emerald-600 border-transparent text-white' :
                      b.status === 'Modified' ? 'bg-indigo-600 border-transparent text-white' :
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
        </motion.div>

        {/* Status Summary Chart */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.3 }} className="bg-theme-panel backdrop-blur-xl border border-theme-border rounded-2xl p-6 shadow-xl shadow-black/[0.01] flex flex-col">
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
                      strokeDashoffset={`-${activePct + modifiedPct}`}
                      className="transition-all duration-500"
                    />
                    {/* Modified Segment (Indigo) */}
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="3.2"
                      strokeDasharray={`${modifiedPct} ${100 - modifiedPct}`}
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
                      strokeDashoffset={`-${activePct + modifiedPct + pendingPct}`}
                      className="transition-all duration-500"
                    />
                  </>
                ) : null}
              </svg>
              {/* Inner Hole text */}
              <div className="absolute inset-0 flex flex-col justify-center items-center text-center">
                <span className="text-2xl font-black text-theme-text leading-none">{totalCount}</span>
                <span className="text-[0.5625rem] font-bold text-theme-muted uppercase tracking-widest mt-1">Total</span>
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
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Modified</span>
                </div>
                <span className="font-bold text-theme-text">{modifiedCount}</span>
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
        </motion.div>
      </div>

      {/* Viator daily report importer — available to booking managers (manager + operations) */}
      {(currentUser.role === 'manager' || currentUser.role === 'operations') && (
        <ViatorImportCard bookings={bookings} currentUser={currentUser} onAddBookings={onAddBookings} />
      )}
    </div>
  );
}
