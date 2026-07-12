import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CustomDatePickerProps {
  value: string; // YYYY-MM-DD for date, YYYY-MM for month, YYYY for year
  onChange: (val: string) => void;
  type?: 'date' | 'month' | 'year';
  placeholder?: string;
  className?: string;
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

// Generates list of years from 2020 to 2035
const YEARS = Array.from({ length: 16 }, (_, i) => 2020 + i);

export default function CustomDatePicker({
  value,
  onChange,
  type = 'date',
  placeholder = 'Select date',
  className = ''
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Split selected value
  const parsedDate = value ? new Date(value) : new Date();
  
  // Current view states (so navigating doesn't immediately change parent selection)
  const [viewYear, setViewYear] = useState(() => {
    if (type === 'year') return value ? parseInt(value, 10) : new Date().getFullYear();
    if (value) {
      const parts = value.split('-');
      return parseInt(parts[0], 10);
    }
    return new Date().getFullYear();
  });
  
  const [viewMonth, setViewMonth] = useState(() => {
    if (value && type !== 'year') {
      const parts = value.split('-');
      return parseInt(parts[1], 10) - 1; // 0-indexed
    }
    return new Date().getMonth();
  });

  // Sync view states when value changes
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      setViewYear(parseInt(parts[0], 10));
      if (parts[1]) {
        setViewMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [value, type]);

  // Click outside listener to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format displaying text on the toggle button
  const getDisplayText = () => {
    if (!value) return placeholder;
    if (type === 'year') return value;
    if (type === 'month') {
      const [y, m] = value.split('-');
      const mIdx = parseInt(m, 10) - 1;
      return `${MONTHS[mIdx]}, ${y}`;
    }
    // Type === 'date'
    try {
      const [y, m, d] = value.split('-');
      const mIdx = parseInt(m, 10) - 1;
      return `${MONTHS[mIdx]} ${parseInt(d, 10)}, ${y}`;
    } catch (e) {
      return value;
    }
  };

  // Navigate months
  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  // Get days in viewed month
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    onChange(`${viewYear}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleSelectMonth = (monthIndex: number) => {
    if (type === 'month') {
      const mm = String(monthIndex + 1).padStart(2, '0');
      onChange(`${viewYear}-${mm}`);
      setIsOpen(false);
    } else {
      setViewMonth(monthIndex);
    }
  };

  const handleSelectYear = (year: number) => {
    if (type === 'year') {
      onChange(String(year));
      setIsOpen(false);
    } else {
      setViewYear(year);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between bg-white/50 hover:bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm text-slate-805 font-semibold outline-none transition duration-200 cursor-pointer shadow-sm focus:border-indigo-500"
      >
        <span className="truncate">{getDisplayText()}</span>
        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
      </button>

      {/* Calendar Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 mt-1.5 w-[310px] bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xl z-55"
          >
            {/* ──── DATE PICKER MODE ──── */}
            {type === 'date' && (
              <div className="space-y-3">
                {/* Header (Prev, Month Select, Year Select, Next) */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-50 border border-slate-200 text-slate-500 cursor-pointer transition active:scale-90"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Month selector */}
                    <select
                      value={viewMonth}
                      onChange={e => setViewMonth(parseInt(e.target.value, 10))}
                      className="bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      {MONTHS.map((m, idx) => (
                        <option key={idx} value={idx}>{m.substring(0, 3)}</option>
                      ))}
                    </select>

                    {/* Year selector */}
                    <select
                      value={viewYear}
                      onChange={e => setViewYear(parseInt(e.target.value, 10))}
                      className="bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      {YEARS.map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg hover:bg-slate-50 border border-slate-200 text-slate-500 cursor-pointer transition active:scale-90"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Weekdays indicator grid */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-slate-450 uppercase">
                  {WEEKDAYS.map(w => (
                    <span key={w} className="py-1">{w}</span>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {/* Empty pads for starting weekday offset */}
                  {Array.from({ length: startDayOfWeek }).map((_, idx) => (
                    <span key={`empty-${idx}`} className="h-8 w-8" />
                  ))}

                  {/* Days listing */}
                  {Array.from({ length: daysInMonth }).map((_, idx) => {
                    const day = idx + 1;
                    const mm = String(viewMonth + 1).padStart(2, '0');
                    const dd = String(day).padStart(2, '0');
                    const dateString = `${viewYear}-${mm}-${dd}`;
                    const isSelected = value === dateString;
                    const isToday = new Date().toISOString().startsWith(dateString);

                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => handleSelectDay(day)}
                        className={`h-8 w-8 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition active:scale-90 ${
                          isSelected 
                            ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' 
                            : isToday 
                              ? 'border border-indigo-400 text-indigo-600 bg-indigo-50/30' 
                              : 'text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {day}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ──── MONTH PICKER MODE ──── */}
            {type === 'month' && (
              <div className="space-y-4">
                {/* Year navigator */}
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <button
                    type="button"
                    onClick={() => setViewYear(prev => prev - 1)}
                    className="p-1.5 rounded-lg hover:bg-slate-50 border border-slate-200 text-slate-500 cursor-pointer transition"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <select
                    value={viewYear}
                    onChange={e => setViewYear(parseInt(e.target.value, 10))}
                    className="bg-slate-50 border border-slate-200/60 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                  >
                    {YEARS.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setViewYear(prev => prev + 1)}
                    className="p-1.5 rounded-lg hover:bg-slate-50 border border-slate-200 text-slate-500 cursor-pointer transition"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* 12 Months selection grid */}
                <div className="grid grid-cols-3 gap-2">
                  {MONTHS.map((m, idx) => {
                    const mm = String(idx + 1).padStart(2, '0');
                    const monthString = `${viewYear}-${mm}`;
                    const isSelected = value === monthString;

                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleSelectMonth(idx)}
                        className={`py-2 px-1 rounded-xl text-xs font-bold transition text-center cursor-pointer active:scale-95 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {m.substring(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ──── YEAR PICKER MODE ──── */}
            {type === 'year' && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Year Dropdown</span>
                <div className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-1">
                  {YEARS.map(y => {
                    const isSelected = value === String(y);
                    return (
                      <button
                        key={y}
                        type="button"
                        onClick={() => handleSelectYear(y)}
                        className={`py-2.5 rounded-xl text-xs font-extrabold transition cursor-pointer text-center active:scale-95 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {y}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
