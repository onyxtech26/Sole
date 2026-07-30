import React, { useState, useEffect } from 'react';
import { Search, ChevronUp, ChevronDown, Edit, Trash2, ShieldAlert, Plus, X, Calendar, Clock, Check } from 'lucide-react';
import { Booking, User } from '../types';
import { getRelativeDateString } from '../utils/seed';
import { countMissingNames } from '../utils/viatorImport';
import { motion, AnimatePresence } from 'motion/react';
import AddBookingView from './AddBookingView';
import { createPortal } from 'react-dom';
import { WORKFLOW_STEPS, wfOf, toggleWf } from '../utils/workflow';

interface BookingsViewProps {
  bookings: Booking[];
  currentUser: User;
  onDeleteBookings: (refs: string[]) => void;
  onUpdateBookingStatus: (ref: string, status: Booking['status']) => void;
  onUpdateBookingPaymentStatus: (ref: string, paymentStatus: Booking['paymentStatus']) => void;
  onUpdateBookingWorkflow: (ref: string, workflow: number[]) => void;
  onSaveBooking: (booking: Booking) => void;
}

type TabType = 'today' | 'upcoming' | 'past' | 'cancelled';
type SortColumn = 'bookingRef' | 'leadTraveler' | 'tourName' | 'travelDate' | 'pax' | 'phone' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

export default function BookingsView({
  bookings,
  currentUser,
  onDeleteBookings,
  onUpdateBookingStatus,
  onUpdateBookingPaymentStatus,
  onUpdateBookingWorkflow,
  onSaveBooking
}: BookingsViewProps) {
  const [activeTab, setActiveTab] = useState<TabType>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTour, setFilterTour] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortColumn, setSortColumn] = useState<SortColumn>('travelDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  // Modals state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingRef, setEditingRef] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Row selection — ticking a checkbox is what reveals the edit / delete actions.
  const [selectedRefs, setSelectedRefs] = useState<string[]>([]);

  const todayStr = getRelativeDateString(0);

  // Generate unique tours list for filter dropdown
  const uniqueTours = Array.from(new Set(bookings.map(b => b.tourName))).filter(Boolean);

  // Count metrics for tab headers
  const countToday = bookings.filter(b => b.travelDate === todayStr).length;
  const countUpcoming = bookings.filter(b => b.travelDate > todayStr && b.status !== 'Cancelled').length;
  const countPast = bookings.filter(b => b.travelDate < todayStr && b.status !== 'Cancelled').length;
  const countCancelled = bookings.filter(b => b.status === 'Cancelled').length;

  const handleSort = (col: SortColumn) => {
    if (sortColumn === col) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(col);
      setSortDirection('asc');
    }
  };

  // Filter Bookings
  const filteredBookings = bookings.filter(b => {
    // 1. Filter by tabs
    if (activeTab === 'today' && b.travelDate !== todayStr) return false;
    if (activeTab === 'upcoming' && (b.travelDate <= todayStr || b.status === 'Cancelled')) return false;
    if (activeTab === 'past' && (b.travelDate >= todayStr || b.status === 'Cancelled')) return false;
    if (activeTab === 'cancelled' && b.status !== 'Cancelled') return false;

    // 2. Filter by dropdown selects
    if (filterStatus !== 'all' && b.status !== filterStatus) return false;
    if (filterTour !== 'all' && b.tourName !== filterTour) return false;

    // 3. Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchRef = b.bookingRef.toLowerCase().includes(q);
      const matchLead = b.leadTraveler.toLowerCase().includes(q);
      const matchPhone = b.phone && b.phone.toLowerCase().includes(q);
      const matchTour = b.tourName.toLowerCase().includes(q);
      if (!matchRef && !matchLead && !matchPhone && !matchTour) return false;
    }

    return true;
  });

  // Sort Bookings
  filteredBookings.sort((a, b) => {
    let valA: any = a[sortColumn];
    let valB: any = b[sortColumn];

    if (sortColumn === 'pax') {
      valA = a.paxCount.adults + a.paxCount.children;
      valB = b.paxCount.adults + b.paxCount.children;
    }

    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortDirection === 'asc' 
        ? valA.localeCompare(valB) 
        : valB.localeCompare(valA);
    } else {
      return sortDirection === 'asc' 
        ? (valA || 0) - (valB || 0) 
        : (valB || 0) - (valA || 0);
    }
  });

  // ─── Selection ────────────────────────────────────────────────────────────
  const visibleRefs = filteredBookings.map(b => b.bookingRef);
  // Only count selections that are still on screen, so a filter change can never
  // leave an invisible booking armed for deletion.
  const selectedVisible = selectedRefs.filter(r => visibleRefs.includes(r));
  const allVisibleSelected = visibleRefs.length > 0 && selectedVisible.length === visibleRefs.length;

  const toggleRow = (ref: string) => {
    setSelectedRefs(prev => (prev.includes(ref) ? prev.filter(r => r !== ref) : [...prev, ref]));
  };

  const toggleAllVisible = () => {
    setSelectedRefs(allVisibleSelected ? [] : visibleRefs);
  };

  const clearSelection = () => setSelectedRefs([]);

  // Drop selections whenever the visible set changes.
  useEffect(() => {
    setSelectedRefs([]);
  }, [activeTab, searchQuery, filterTour, filterStatus]);

  // ─── Workflow ─────────────────────────────────────────────────────────────
  // Each badge writes straight through — one click, one saved stage.
  const toggleWorkflowStep = (b: Booking, index: number) => {
    onUpdateBookingWorkflow(b.bookingRef, toggleWf(wfOf(b), index));
  };

  const renderSortArrow = (col: SortColumn) => {
    if (sortColumn !== col) return <span className="text-slate-400 ml-1">↕</span>;
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-3.5 h-3.5 text-orange-500 inline-block ml-0.5" />
      : <ChevronDown className="w-3.5 h-3.5 text-orange-500 inline-block ml-0.5" />;
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">Reservations Ledger</h1>
          <p className="text-slate-500 text-sm mt-1 font-semibold">Track, sort, search, and update client logs.</p>
        </div>
        <button
          onClick={() => {
            setEditingRef(null);
            setShowFormModal(true);
          }}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition duration-200 shadow-lg shadow-orange-600/15 cursor-pointer transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Query controls & Filters */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white border border-slate-200 p-5 rounded-2xl shadow-md">
        <div className="relative w-full md:max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search traveler name, ref, or phone..."
            className="w-full bg-white/50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-3 text-slate-800 text-sm font-semibold outline-none transition duration-300 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10"
          />
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
        </div>

        <div className="flex flex-wrap gap-3 w-full md:w-auto items-center">
          <select
            value={filterTour}
            onChange={(e) => setFilterTour(e.target.value)}
            className="bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-slate-800 text-sm font-semibold outline-none cursor-pointer focus:border-orange-500 max-w-xs truncate"
          >
            <option value="all" className="text-slate-800 bg-white font-semibold">All Tours</option>
            {uniqueTours.map((tour, idx) => (
              <option key={idx} value={tour} className="text-slate-800 bg-white font-semibold">{tour.substring(0, 45)}...</option>
            ))}
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white/50 border border-slate-200/80 rounded-xl px-4 py-3 text-slate-800 text-sm font-semibold outline-none cursor-pointer focus:border-orange-500"
          >
            <option value="all" className="text-slate-800 bg-white font-semibold">All Statuses</option>
            <option value="Confirmed" className="text-slate-800 bg-white font-semibold">Confirmed</option>
            <option value="Modified" className="text-slate-800 bg-white font-semibold">Modified</option>
            <option value="Pending" className="text-slate-800 bg-white font-semibold">Pending</option>
            <option value="Cancelled" className="text-slate-800 bg-white font-semibold">Cancelled</option>
          </select>
        </div>
      </motion.div>

      {/* Date Range Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['today', 'upcoming', 'past', 'cancelled'] as TabType[]).map(tab => {
          const label = tab.charAt(0).toUpperCase() + tab.slice(1);
          const count = tab === 'today' ? countToday :
                        tab === 'upcoming' ? countUpcoming :
                        tab === 'past' ? countPast : countCancelled;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-3 text-sm font-bold transition-all relative cursor-pointer ${
                isActive ? 'text-orange-600' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{label}</span>
              <span className={`ml-2 px-2 py-0.5 text-[0.625rem] rounded-full font-bold transition-all ${
                isActive ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-slate-100 text-slate-500'
              }`}>{count}</span>
              {isActive && (
                <motion.div 
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 w-full h-[0.15625rem] bg-orange-600 rounded-t-full shadow-lg shadow-orange-600/30" 
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Bookings Table Container */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[62.5rem]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[0.6875rem] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                <th className="p-4 pl-5 w-10">
                  <button
                    type="button"
                    onClick={toggleAllVisible}
                    disabled={visibleRefs.length === 0}
                    title={allVisibleSelected ? 'Clear selection' : 'Select all shown'}
                    aria-label={allVisibleSelected ? 'Clear selection' : 'Select all shown'}
                    className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                      allVisibleSelected
                        ? 'bg-orange-600 border-orange-600 text-white'
                        : 'bg-white border-slate-300 hover:border-orange-400'
                    }`}
                  >
                    {allVisibleSelected && <Check className="w-3 h-3" strokeWidth={3.5} />}
                  </button>
                </th>
                <th onClick={() => handleSort('bookingRef')} className="p-4 cursor-pointer hover:text-slate-800 transition whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    Reference Code {renderSortArrow('bookingRef')}
                  </div>
                </th>
                <th onClick={() => handleSort('leadTraveler')} className="p-4 cursor-pointer hover:text-slate-800 transition whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    Lead Traveler {renderSortArrow('leadTraveler')}
                  </div>
                </th>
                <th onClick={() => handleSort('tourName')} className="p-4 cursor-pointer hover:text-slate-800 transition whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    Product / Tour {renderSortArrow('tourName')}
                  </div>
                </th>
                <th onClick={() => handleSort('travelDate')} className="p-4 cursor-pointer hover:text-slate-800 transition whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    Date & Time {renderSortArrow('travelDate')}
                  </div>
                </th>
                <th className="p-4 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    Reservation Time
                  </div>
                </th>
                <th onClick={() => handleSort('pax')} className="p-4 cursor-pointer hover:text-slate-800 transition whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    PAX {renderSortArrow('pax')}
                  </div>
                </th>
                <th onClick={() => handleSort('phone')} className="p-4 cursor-pointer hover:text-slate-800 transition whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    Phone {renderSortArrow('phone')}
                  </div>
                </th>
                {currentUser.role === 'manager' && (
                  <th onClick={() => handleSort('amount')} className="p-4 cursor-pointer hover:text-slate-800 transition whitespace-nowrap text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      Payout {renderSortArrow('amount')}
                    </div>
                  </th>
                )}
                <th onClick={() => handleSort('status')} className="p-4 cursor-pointer hover:text-slate-800 transition whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    Status {renderSortArrow('status')}
                  </div>
                </th>
                <th className="p-4 pr-6 text-center whitespace-nowrap">Workflow</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={currentUser.role !== 'manager' ? 10 : 11} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 text-slate-500 max-w-sm mx-auto">
                      <ShieldAlert className="w-10 h-10 text-slate-300" />
                      <h4 className="font-extrabold text-slate-800">No Bookings Found</h4>
                      <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                        No reservations match your filters or selected time frame. Add a new booking or clear filters to search.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBookings.map(b => {
                  const isSelected = selectedRefs.includes(b.bookingRef);
                  const wf = wfOf(b);
                  const doneCount = wf.filter(Boolean).length;
                  const totalPax = b.paxCount.adults + b.paxCount.children;
                  const missingNames = countMissingNames(b);
                  return (
                  <tr
                    key={b.bookingRef}
                    onClick={() => toggleRow(b.bookingRef)}
                    className={`transition cursor-pointer ${
                      isSelected ? 'bg-orange-50/70 hover:bg-orange-50' : 'hover:bg-slate-50/50'
                    }`}
                  >
                    <td className="p-4 pl-5 w-10" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => toggleRow(b.bookingRef)}
                        title={isSelected ? 'Deselect reservation' : 'Select reservation'}
                        aria-label={isSelected ? 'Deselect reservation' : 'Select reservation'}
                        aria-pressed={isSelected}
                        className={`w-4.5 h-4.5 rounded-md border flex items-center justify-center transition cursor-pointer ${
                          isSelected
                            ? 'bg-orange-600 border-orange-600 text-white'
                            : 'bg-white border-slate-300 hover:border-orange-400'
                        }`}
                      >
                        {isSelected && <Check className="w-3 h-3" strokeWidth={3.5} />}
                      </button>
                    </td>

                    <td className="p-4 text-center font-mono font-extrabold text-sm text-orange-600 whitespace-nowrap">
                      {b.bookingRef}
                    </td>

                    {/* Lead name + how many seats still need a passport name.
                        The full manifest is edited in the booking form, not listed here. */}
                    <td className="p-4">
                      <div className="font-extrabold text-slate-800">{b.leadTraveler}</div>
                      {missingNames > 0 ? (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[0.5625rem] font-extrabold text-amber-600 uppercase tracking-wide">
                          ⚠ {missingNames} name{missingNames === 1 ? '' : 's'} pending
                        </span>
                      ) : totalPax > 1 ? (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[0.5625rem] font-extrabold text-emerald-600 uppercase tracking-wide">
                          ✓ All {totalPax} names in
                        </span>
                      ) : null}
                    </td>

                    <td className="p-4 max-w-[12.5rem]">
                      <div className="font-bold text-slate-800 truncate" title={b.tourName}>{b.tourName}</div>
                      <div className="text-[0.625rem] text-slate-500 font-mono font-bold mt-0.5">{b.productCode || 'N/A'}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {b.assignedGuide && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg border border-orange-100 bg-orange-50 text-[0.5625rem] font-bold text-orange-600">
                            👤 {b.assignedGuide}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 text-center whitespace-nowrap font-semibold text-slate-700">
                      <div>{b.travelDate}</div>
                      <div className="text-xs text-slate-500 mt-0.5 font-bold">{b.tourTime}</div>
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-100 text-orange-600 font-extrabold text-xs font-mono">
                        <Clock className="w-3.5 h-3.5" />
                        {b.tourTime || '—'}
                      </span>
                    </td>

                    <td className="p-4 text-center whitespace-nowrap">
                      <span className="font-extrabold text-slate-800">{b.paxCount.adults + b.paxCount.children} PAX </span>
                      <span className="text-[0.625rem] text-slate-500 font-semibold ml-1">({b.paxCount.adults}A/{b.paxCount.children}C)</span>
                    </td>

                    <td className="p-4 text-center whitespace-nowrap font-mono text-xs text-slate-700 font-semibold">
                      {b.phone || 'N/A'}
                    </td>

                    {currentUser.role === 'manager' && (
                      <td className="p-4 text-center whitespace-nowrap font-mono font-extrabold text-slate-800">
                        €{b.amount.toFixed(2)}
                      </td>
                    )}

                    <td className="p-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex flex-col gap-1.5 w-[7.1875rem] mx-auto">
                        <select
                          value={b.status}
                          onChange={(e) => onUpdateBookingStatus(b.bookingRef, e.target.value as Booking['status'])}
                          className={`w-full text-center text-[0.625rem] font-extrabold uppercase tracking-wide border px-2.5 py-1.5 rounded-full bg-white/80 cursor-pointer focus:outline-none focus:ring-4 focus:ring-orange-500/10 ${
                            b.status === 'Confirmed' ? 'border-emerald-200 text-emerald-600 bg-emerald-50/50' :
                            b.status === 'Modified' ? 'border-indigo-200 text-indigo-600 bg-indigo-50/50' :
                            b.status === 'Pending' ? 'border-orange-200 text-orange-600 bg-orange-50/50' :
                            'border-rose-200 text-rose-600 bg-rose-50/50'
                          }`}
                        >
                          <option value="Confirmed" className="bg-white text-emerald-600 font-bold">Confirmed</option>
                          <option value="Modified" className="bg-white text-indigo-600 font-bold">Modified</option>
                          <option value="Pending" className="bg-white text-orange-600 font-bold">Pending</option>
                          <option value="Cancelled" className="bg-white text-rose-600 font-bold">Cancelled</option>
                        </select>
                        <select
                          value={b.paymentStatus || 'Unpaid'}
                          onChange={(e) => onUpdateBookingPaymentStatus(b.bookingRef, e.target.value as Booking['paymentStatus'])}
                          className={`w-full text-center text-[0.625rem] font-extrabold uppercase tracking-wide border px-2.5 py-1.5 rounded-full bg-white/80 cursor-pointer focus:outline-none focus:ring-4 focus:ring-orange-500/10 ${
                            b.paymentStatus === 'Paid' ? 'border-emerald-200 text-emerald-600 bg-emerald-50/50' :
                            b.paymentStatus === 'Partially Paid' ? 'border-orange-200 text-orange-600 bg-orange-50/50' :
                            b.paymentStatus === 'Refunded' ? 'border-slate-200 text-slate-600 bg-slate-50/50' :
                            'border-rose-200 text-rose-600 bg-rose-50/50'
                          }`}
                        >
                          <option value="Paid" className="bg-white text-emerald-600 font-bold">Paid</option>
                          <option value="Partially Paid" className="bg-white text-orange-600 font-bold">Partially Paid</option>
                          <option value="Unpaid" className="bg-white text-rose-600 font-bold">Unpaid</option>
                          <option value="Refunded" className="bg-white text-slate-600 font-bold">Refunded</option>
                        </select>
                      </div>
                    </td>

                    {/* ─── Message workflow: click a badge to mark that stage ─── */}
                    <td className="p-4 pr-6 whitespace-nowrap shrink-0" onClick={(e) => e.stopPropagation()}>
                      <div
                        className="inline-flex gap-1"
                        role="group"
                        aria-label={`Message workflow — ${doneCount} of 4 done`}
                      >
                        {WORKFLOW_STEPS.map((step, i) => (
                          <button
                            key={step.key}
                            type="button"
                            onClick={() => toggleWorkflowStep(b, i)}
                            title={`${step.label} — ${wf[i] ? 'Done' : 'Pending'}. Click to mark ${wf[i] ? 'pending' : 'done'}.`}
                            aria-label={`${step.label}: ${wf[i] ? 'done' : 'pending'}`}
                            aria-pressed={!!wf[i]}
                            className={`w-6 h-6 rounded-md flex items-center justify-center text-[0.625rem] font-black cursor-pointer transition active:scale-90 ${
                              wf[i]
                                ? 'bg-orange-600 text-white shadow-sm shadow-orange-600/25 hover:bg-orange-700'
                                : 'bg-slate-100 text-slate-400 hover:bg-orange-50 hover:text-orange-500'
                            }`}
                          >
                            {step.key}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
      {/* ─── Selection action bar — edit / delete appear only once rows are ticked ─── */}
      {createPortal(
        <AnimatePresence>
          {selectedVisible.length > 0 && !showFormModal && !bulkDeleteConfirm && (
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.96 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] flex items-center gap-3 bg-[#0b1220] text-white rounded-2xl shadow-2xl shadow-black/25 border border-white/10 px-4 py-3"
            >
              <span className="flex items-center gap-2 pr-1">
                <span className="w-6 h-6 rounded-lg bg-orange-600 flex items-center justify-center text-[0.6875rem] font-black shrink-0">
                  {selectedVisible.length}
                </span>
                <span className="text-xs font-bold whitespace-nowrap">
                  reservation{selectedVisible.length === 1 ? '' : 's'} selected
                </span>
              </span>

              <span className="w-px h-6 bg-white/15" />

              <button
                type="button"
                disabled={selectedVisible.length !== 1}
                title={selectedVisible.length === 1 ? 'Edit this reservation' : 'Select exactly one reservation to edit'}
                onClick={() => {
                  setEditingRef(selectedVisible[0]);
                  setShowFormModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 transition cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/10"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>

              <button
                type="button"
                onClick={() => setBulkDeleteConfirm(true)}
                title={`Delete ${selectedVisible.length} reservation${selectedVisible.length === 1 ? '' : 's'}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600/90 hover:bg-rose-600 transition cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>

              <button
                type="button"
                onClick={clearSelection}
                className="text-xs font-bold text-white/55 hover:text-white transition px-2 cursor-pointer"
              >
                Clear
              </button>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Bulk delete confirmation ─── */}
      {createPortal(
        <AnimatePresence>
          {bulkDeleteConfirm && (
            <div
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-[0.125rem] flex items-center justify-center z-[9999] p-4"
              onClick={() => setBulkDeleteConfirm(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-2xl max-w-sm w-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-2">
                  Delete {selectedVisible.length} Reservation{selectedVisible.length === 1 ? '' : 's'}
                </h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-5">
                  {selectedVisible.length === 1
                    ? <>Reservation <span className="font-mono text-orange-600 font-extrabold">{selectedVisible[0]}</span> will be removed from the shared database.</>
                    : <>All {selectedVisible.length} selected reservations will be removed from the shared database.</>}
                  {' '}This action is permanent and cannot be undone.
                </p>
                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setBulkDeleteConfirm(false)}
                    className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteBookings(selectedVisible);
                      clearSelection();
                      setBulkDeleteConfirm(false);
                    }}
                    className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-700 shadow-md cursor-pointer transition active:scale-95"
                  >
                    Confirm Delete
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Add/Edit Booking Modal (Fills entire screen, beautiful glassmorphism blur) ─── */}
      {createPortal(
        <AnimatePresence>
          {showFormModal && (
            <div 
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-[0.125rem] flex items-center justify-center z-[9999] p-4"
              onClick={() => {
                setShowFormModal(false);
                setEditingRef(null);
              }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-slate-100 rounded-3xl w-full max-w-4xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh] relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => {
                    setShowFormModal(false);
                    setEditingRef(null);
                  }}
                  className="absolute top-5 right-5 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mb-4 shrink-0">
                  <Calendar className="w-5 h-5 text-orange-600" />
                </div>
                
                <h3 className="text-base font-extrabold text-slate-900 font-sans mb-1">
                  {editingRef ? 'Edit Reservation Booking' : 'Add Reservation Booking'}
                </h3>
                <p className="text-slate-455 text-xs font-semibold mb-5">
                  {editingRef ? 'Modify traveler information and tour parameters.' : 'Create a new client booking record for Sole Travels.'}
                </p>
                
                <AddBookingView
                  bookings={bookings}
                  currentUser={currentUser}
                  editBookingRef={editingRef}
                  onSaveBooking={(booking) => {
                    onSaveBooking(booking);
                    setShowFormModal(false);
                    setEditingRef(null);
                  }}
                  onCancel={() => {
                    setShowFormModal(false);
                    setEditingRef(null);
                  }}
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}
