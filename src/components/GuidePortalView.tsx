import React, { useState } from 'react';
import { Calendar, CheckSquare, Square, LogOut, Phone, MapPin, Globe } from 'lucide-react';
import { Booking, User } from '../types';
import { getRelativeDateString } from '../utils/seed';

interface GuidePortalViewProps {
  bookings: Booking[];
  currentUser: User;
  onToggleGuestCheckin: (bookingRef: string, guestIndex: number, isChecked: boolean) => void;
  onLogout: () => void;
}

export default function GuidePortalView({
  bookings,
  currentUser,
  onToggleGuestCheckin,
  onLogout
}: GuidePortalViewProps) {
  const [guideDate, setGuideDate] = useState(getRelativeDateString(0));

  // Filter bookings for selected date that are Confirmed, and matching the logged-in guide.
  // If the username is "guide", match any booking that has an assigned guide.
  // Otherwise, match bookings where assignedGuide contains the guide's username (case-insensitive).
  const guideFilterName = currentUser.username === 'guide' ? 'all' : currentUser.username;

  const guideBookings = bookings.filter(b => {
    const dateMatch = b.travelDate === guideDate;
    const statusMatch = b.status !== 'Cancelled';
    
    let guideMatch = false;
    if (guideFilterName === 'all') {
      guideMatch = !!b.assignedGuide;
    } else {
      guideMatch = b.assignedGuide.toLowerCase().includes(guideFilterName.toLowerCase());
    }

    return dateMatch && statusMatch && guideMatch;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in p-4 sm:p-6 pb-20 relative z-10">
      {/* Header bar */}
      <div className="flex justify-between items-center bg-white/40 border border-slate-200/80 p-5 rounded-3xl backdrop-blur-3xl shadow-xl shadow-black/[0.01]">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block font-sans">Guide Manifest Portal</span>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1 font-sans">My Tour Schedule</h1>
          <p className="text-slate-500 text-xs font-semibold mt-1">Hello, <span className="font-bold text-indigo-600">{currentUser.username}</span></p>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 px-4 py-2.5 border border-rose-200 hover:border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-xl text-xs tracking-wider uppercase transition cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Log Out</span>
        </button>
      </div>

      {/* Date select picker */}
      <div className="bg-white/40 border border-slate-200/80 p-5 rounded-3xl backdrop-blur-3xl shadow-xl shadow-black/[0.01] flex flex-col gap-2">
        <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Operational Manifest Date</label>
        <div className="relative">
          <input
            type="date"
            value={guideDate}
            onChange={(e) => setGuideDate(e.target.value)}
            className="w-full bg-white/50 border border-slate-200/80 rounded-xl pl-11 pr-4 py-3.5 text-slate-800 text-sm font-semibold outline-none transition duration-300 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10"
          />
          <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
        </div>
      </div>

      {/* Booking Cards list */}
      <div className="space-y-5">
        {guideBookings.length === 0 ? (
          <div className="bg-white/30 border border-slate-200/80 border-dashed rounded-3xl p-12 text-center flex flex-col items-center justify-center gap-3 shadow-xl shadow-black/[0.01]">
            <Globe className="w-12 h-12 text-slate-400" />
            <h3 className="font-extrabold text-slate-800">No Tours Scheduled</h3>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed font-semibold">
              There are no active tour manifests assigned to you on {guideDate}.
            </p>
          </div>
        ) : (
          guideBookings.map(b => (
            <div key={b.bookingRef} className="bg-white/40 border border-slate-200/80 rounded-3xl p-5 sm:p-6 backdrop-blur-3xl space-y-4 shadow-xl shadow-black/[0.01]">
              {/* Tour card header */}
              <div className="flex justify-between items-start gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight font-sans">{b.tourName}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className="text-[10px] font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100">
                      Ref: {b.bookingRef}
                    </span>
                    <span className="text-[10px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded-lg font-bold flex items-center gap-1 border border-slate-100">
                      <Globe className="w-3 h-3 text-indigo-500" /> Language: {b.language}
                    </span>
                  </div>
                </div>
                <span className="bg-gradient-to-tr from-indigo-600 to-emerald-500 text-white font-bold px-3 py-1 rounded-xl text-xs shrink-0 font-mono shadow-md shadow-indigo-600/10 border border-white/20">
                  {b.tourTime}
                </span>
              </div>

              {/* Tour card contact details */}
              <div className="text-xs text-slate-600 space-y-2 font-semibold">
                <div className="flex gap-2 items-start">
                  <MapPin className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span><strong>Meeting Point:</strong> <span className="text-slate-800">{b.meetingPoint || 'Standard location'}</span></span>
                </div>
                <div className="flex gap-2 items-start">
                  <Phone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span><strong>Contact:</strong> <span className="text-slate-800">{b.phone || 'N/A'}</span></span>
                </div>
              </div>

              {/* Passenger table checklists */}
              <div className="space-y-2.5 border-t border-slate-100 pt-4">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Passenger Check-In Checklist</h4>
                <div className="overflow-hidden border border-slate-200/80 rounded-2xl bg-white/50 divide-y divide-slate-100">
                  {b.travelers && b.travelers.length > 0 ? (
                    b.travelers.map((traveler, index) => {
                      const isChecked = b.checkedInGuests && b.checkedInGuests.includes(index);
                      return (
                        <div
                          key={index}
                          onClick={() => onToggleGuestCheckin(b.bookingRef, index, !isChecked)}
                          className={`flex items-center justify-between p-3.5 cursor-pointer transition ${
                            isChecked ? 'bg-emerald-50/50' : 'hover:bg-slate-50/80'
                          }`}
                        >
                          <span className={`text-xs font-bold ${isChecked ? 'text-emerald-600 line-through' : 'text-slate-800'}`}>
                            {traveler}
                          </span>
                          <button className="shrink-0 focus:outline-none">
                            {isChecked ? (
                              <CheckSquare className="w-4.5 h-4.5 text-emerald-500" />
                            ) : (
                              <Square className="w-4.5 h-4.5 text-slate-400 hover:text-slate-500" />
                            )}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="p-4 text-center text-slate-400 text-xs font-semibold">
                      No passengers listed under travelers manifest.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
