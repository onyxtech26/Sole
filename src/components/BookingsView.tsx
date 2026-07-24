import React, { useState } from 'react';
import { Search, ChevronUp, ChevronDown, Edit, Trash2, ShieldAlert, Plus, X, Calendar, Clock } from 'lucide-react';
import { Booking, User } from '../types';
import { getRelativeDateString } from '../utils/seed';
import { isPlaceholderName } from '../utils/viatorImport';
import { motion, AnimatePresence } from 'motion/react';
import AddBookingView from './AddBookingView';
import { createPortal } from 'react-dom';

interface BookingsViewProps {
  bookings: Booking[];
  currentUser: User;
  onDeleteBooking: (ref: string) => void;
  onUpdateBookingStatus: (ref: string, status: Booking['status']) => void;
  onUpdateBookingPaymentStatus: (ref: string, paymentStatus: Booking['paymentStatus']) => void;
  onSaveBooking: (booking: Booking) => void;
}

type TabType = 'today' | 'upcoming' | 'past' | 'cancelled';
type SortColumn = 'bookingRef' | 'leadTraveler' | 'tourName' | 'travelDate' | 'pax' | 'phone' | 'amount' | 'status';
type SortDirection = 'asc' | 'desc';

export default function BookingsView({
  bookings,
  currentUser,
  onDeleteBooking,
  onUpdateBookingStatus,
  onUpdateBookingPaymentStatus,
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
  const [deleteConfirmRef, setDeleteConfirmRef] = useState<string | null>(null);

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
              <span className={`ml-2 px-2 py-0.5 text-[10px] rounded-full font-bold transition-all ${
                isActive ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-slate-100 text-slate-500'
              }`}>{count}</span>
              {isActive && (
                <motion.div 
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 w-full h-[2.5px] bg-orange-600 rounded-t-full shadow-lg shadow-orange-600/30" 
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Bookings Table Container */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-md">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
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
                <th className="p-4 pr-6 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={currentUser.role !== 'manager' ? 9 : 10} className="p-12 text-center">
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
                filteredBookings.map(b => (
                  <tr key={b.bookingRef} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 text-center font-mono font-extrabold text-sm text-orange-600 whitespace-nowrap">
                      {b.bookingRef}
                    </td>

                    <td className="p-4">
                      <div className="font-extrabold text-slate-800">{b.leadTraveler}</div>
                      {(b.paxCount.adults + b.paxCount.children) > 1 &&
                        (b.namesComplete === false || b.travelers.some(isPlaceholderName)) && (
                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] font-extrabold text-amber-600 uppercase tracking-wide">
                          ⚠ Names pending
                        </span>
                      )}
                      {b.travelers && b.travelers.length > 0 && (
                        <ul className="mt-1 space-y-0.5">
                          {b.travelers.map((t, index) => (
                            <li key={index} className={`text-[10px] font-semibold ${isPlaceholderName(t) ? 'text-amber-500 italic' : 'text-slate-500'}`}>• {t}</li>
                          ))}
                        </ul>
                      )}
                    </td>

                    <td className="p-4 max-w-[200px]">
                      <div className="font-bold text-slate-800 truncate" title={b.tourName}>{b.tourName}</div>
                      <div className="text-[10px] text-slate-500 font-mono font-bold mt-0.5">{b.productCode || 'N/A'}</div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {b.assignedGuide && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-lg border border-orange-100 bg-orange-50 text-[9px] font-bold text-orange-600">
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
                      <span className="text-[10px] text-slate-500 font-semibold ml-1">({b.paxCount.adults}A/{b.paxCount.children}C)</span>
                    </td>

                    <td className="p-4 text-center whitespace-nowrap font-mono text-xs text-slate-700 font-semibold">
                      {b.phone || 'N/A'}
                    </td>

                    {currentUser.role === 'manager' && (
                      <td className="p-4 text-center whitespace-nowrap font-mono font-extrabold text-slate-800">
                        €{b.amount.toFixed(2)}
                      </td>
                    )}

                    <td className="p-4 text-center whitespace-nowrap">
                      <div className="flex flex-col gap-1.5 w-[115px] mx-auto">
                        <select
                          value={b.status}
                          onChange={(e) => onUpdateBookingStatus(b.bookingRef, e.target.value as Booking['status'])}
                          className={`w-full text-center text-[10px] font-extrabold uppercase tracking-wide border px-2.5 py-1.5 rounded-full bg-white/80 cursor-pointer focus:outline-none focus:ring-4 focus:ring-orange-500/10 ${
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
                          className={`w-full text-center text-[10px] font-extrabold uppercase tracking-wide border px-2.5 py-1.5 rounded-full bg-white/80 cursor-pointer focus:outline-none focus:ring-4 focus:ring-orange-500/10 ${
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

                    <td className="p-4 pr-6 text-center whitespace-nowrap shrink-0">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => {
                            setEditingRef(b.bookingRef);
                            setShowFormModal(true);
                          }}
                          title="Edit Booking"
                          className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:text-orange-600 hover:bg-orange-50 hover:border-orange-100 transition duration-200 cursor-pointer transform hover:scale-105"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmRef(b.bookingRef)}
                          title="Delete Booking"
                          className="p-2 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-500 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition duration-200 cursor-pointer transform hover:scale-105"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
      {/* ─── Add/Edit Booking Modal (Fills entire screen, beautiful glassmorphism blur) ─── */}
      {createPortal(
        <AnimatePresence>
          {showFormModal && (
            <div 
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4"
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

      {/* ─── Beautiful Animated Custom Confirm Delete Dialog Modal ─── */}
      {createPortal(
        <AnimatePresence>
          {deleteConfirmRef && (
            <div 
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4"
              onClick={() => setDeleteConfirmRef(null)}
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
                <h3 className="font-extrabold text-slate-900 text-base mb-2">Delete Booking Record</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-5">
                  Are you sure you want to delete reservation <span className="font-mono text-orange-600 font-extrabold">{deleteConfirmRef}</span>? This action is permanent and cannot be undone.
                </p>
                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmRef(null)}
                    className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteBooking(deleteConfirmRef);
                      setDeleteConfirmRef(null);
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
    </div>
  );
}
