import React, { useState } from 'react';
import { Printer, Calendar, ShieldAlert } from 'lucide-react';
import { Booking, User } from '../types';
import { getRelativeDateString } from '../utils/seed';
import CustomDatePicker from './CustomDatePicker';

interface ReportsViewProps {
  bookings: Booking[];
  currentUser: User;
}

export default function ReportsView({ bookings, currentUser }: ReportsViewProps) {
  const [reportDate, setReportDate] = useState(getRelativeDateString(0));
 
  // Filter bookings for selected date (Confirmed/Pending, not Cancelled)
  const dayBookings = bookings.filter(b => b.travelDate === reportDate && b.status !== 'Cancelled');
  
  // Sort by tourName and then tourTime
  dayBookings.sort((a, b) => a.tourName.localeCompare(b.tourName) || a.tourTime.localeCompare(b.tourTime));

  const totalToursCount = Array.from(new Set(dayBookings.map(b => b.tourName))).length;
  const totalTravelersCount = dayBookings.reduce((sum, b) => sum + (b.paxCount.adults + b.paxCount.children), 0);
  const totalRevenueSum = dayBookings.reduce((sum, b) => sum + b.amount, 0);

  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateFormatted = new Date(reportDate).toLocaleDateString('en-US', dateOptions);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in print:p-0 print:m-0 print:bg-white print:text-black relative z-10">
      {/* Controls header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-end bg-white/40 border border-slate-200/80 p-5 rounded-2xl backdrop-blur-xl shadow-xl shadow-black/[0.01] print:hidden">
        <div className="flex flex-col gap-1.5 w-full sm:max-w-[200px]">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Operational Date</label>
          <CustomDatePicker value={reportDate} onChange={setReportDate} type="date" />
        </div>

        <button
          onClick={handlePrint}
          className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg shadow-orange-600/15 transition shrink-0 text-sm flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <Printer className="w-4.5 h-4.5" />
          <span>Print Manifest / Export PDF</span>
        </button>
      </div>

      {/* Printable Report Document Card */}
      <div className="bg-white text-slate-950 rounded-2xl p-8 md:p-12 shadow-xl min-h-[700px] border border-slate-200/80 print:border-none print:shadow-none print:p-0 print:bg-white print:text-black">
        {/* Header bar */}
        <div className="border-b-2 border-slate-200 pb-5 mb-8 flex justify-between items-start gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Sole Travels</h2>
            <p className="text-slate-500 text-xs mt-1 uppercase font-semibold tracking-wider">Daily Tour Manifest & Operations Report</p>
          </div>
          <div className="text-right text-xs text-slate-500 space-y-0.5">
            <p><strong>Report Date:</strong> {dateFormatted}</p>
            <p><strong>Printed On:</strong> {new Date().toLocaleDateString('en-US')}</p>
          </div>
        </div>

        {/* Operational KPI summary widgets */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <div className="border border-slate-200 bg-slate-50 p-5 rounded-lg">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Scheduled Tours</p>
            <h3 className="text-2xl font-extrabold text-slate-900">{totalToursCount}</h3>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-5 rounded-lg">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Total Travelers (PAX)</p>
            <h3 className="text-2xl font-extrabold text-slate-900">{totalTravelersCount}</h3>
          </div>

          <div className="border border-slate-200 bg-slate-50 p-5 rounded-lg">
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-1">Est. Daily Revenue</p>
            <h3 className="text-2xl font-extrabold text-slate-900">
              {currentUser.role === 'staff' ? 'REDACTED' : `€${totalRevenueSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
            </h3>
          </div>
        </div>

        {/* Report table */}
        {dayBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <ShieldAlert className="w-12 h-12 text-slate-300" />
            <h3 className="text-lg font-bold text-slate-800">No Tours Scheduled</h3>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              There are no active (confirmed or pending) reservations registered on {dateFormatted}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-700 font-bold whitespace-nowrap">
                  <th className="p-3 pl-4 w-[110px] whitespace-nowrap">Reference</th>
                  <th className="p-3 w-[70px] whitespace-nowrap">Time</th>
                  <th className="p-3 whitespace-nowrap">Tour Details</th>
                  <th className="p-3 whitespace-nowrap">Lead Client</th>
                  <th className="p-3 text-center w-[120px] whitespace-nowrap">PAX</th>
                  <th className="p-3 whitespace-nowrap">Travelers Manifest</th>
                  <th className="p-3 whitespace-nowrap">Phone</th>
                  {currentUser.role !== 'staff' && <th className="p-3 w-[95px] text-right whitespace-nowrap">Payout</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {dayBookings.map((b, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition whitespace-nowrap">
                    <td className="p-3 pl-4 font-mono font-bold text-slate-900 whitespace-nowrap">{b.bookingRef}</td>
                    <td className="p-3 font-semibold text-slate-900 whitespace-nowrap">{b.tourTime}</td>
                    <td className="p-3 whitespace-nowrap truncate max-w-[200px]" title={b.tourName}>
                      <span className="font-bold text-slate-900">{b.tourName}</span>
                      <span className="text-[10px] text-slate-500 ml-1.5">
                        (Guide: {b.assignedGuide || 'Unassigned'})
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-900 whitespace-nowrap">{b.leadTraveler}</td>
                    <td className="p-3 text-center whitespace-nowrap">
                      <span className="font-bold text-slate-950">{b.paxCount.adults + b.paxCount.children} PAX </span>
                      <span className="text-[9px] text-slate-500">({b.paxCount.adults}A/{b.paxCount.children}C)</span>
                    </td>
                    <td className="p-3 text-slate-600 max-w-[180px] truncate whitespace-nowrap" title={b.travelers && b.travelers.length > 0 ? b.travelers.join(', ') : b.leadTraveler}>
                      {b.travelers && b.travelers.length > 0 ? b.travelers.join(', ') : b.leadTraveler}
                    </td>
                    <td className="p-3 font-mono whitespace-nowrap">{b.phone || 'N/A'}</td>
                    {currentUser.role !== 'staff' && (
                      <td className="p-3 font-mono text-right font-bold text-slate-900 whitespace-nowrap">
                        €{b.amount.toFixed(2)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer info stamp */}
        <div className="mt-12 pt-5 border-t border-slate-200 flex justify-between items-center text-[10px] text-slate-400 font-medium">
          <p>© Sole Travels Reservation Dashboard. Internal Operational Manifest.</p>
          <p>Page 1 of 1</p>
        </div>
      </div>
    </div>
  );
}
