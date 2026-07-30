import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, ChevronDown, X } from 'lucide-react';
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

// 101 years, from 2000 to 2100
const YEARS = Array.from({ length: 101 }, (_, i) => 2000 + i);

export default function CustomDatePicker({
  value,
  onChange,
  type = 'date',
  placeholder = 'Select date',
  className = ''
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Month & Year sub-dropdown states
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const yearScrollRef = useRef<HTMLDivElement>(null);

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

  // Auto-scroll year dropdown to center active year
  useEffect(() => {
    if ((isYearOpen || (isOpen && type === 'year')) && yearScrollRef.current) {
      const activeBtn = yearScrollRef.current.querySelector('[data-active="true"]');
      if (activeBtn) {
        activeBtn.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
      }
    }
  }, [isYearOpen, isOpen, type]);

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

  // Click outside listener to close dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsMonthOpen(false);
        setIsYearOpen(false);
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
    setIsMonthOpen(false);
    setIsYearOpen(false);
  };

  const handleSelectMonth = (monthIndex: number) => {
    if (type === 'month') {
      const mm = String(monthIndex + 1).padStart(2, '0');
      onChange(`${viewYear}-${mm}`);
      setIsOpen(false);
      setIsMonthOpen(false);
      setIsYearOpen(false);
    } else {
      setViewMonth(monthIndex);
    }
  };

  const handleSelectYear = (year: number) => {
    if (type === 'year') {
      onChange(String(year));
      setIsOpen(false);
      setIsMonthOpen(false);
      setIsYearOpen(false);
    } else {
      setViewYear(year);
    }
  };

  const toggleCalendarPopover = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (!nextState) {
      setIsMonthOpen(false);
      setIsYearOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={toggleCalendarPopover}
        className="w-full flex items-center justify-between bg-white/50 hover:bg-white border border-slate-200/80 rounded-xl px-4 py-2.5 text-sm text-slate-805 font-semibold outline-none transition duration-200 cursor-pointer shadow-sm focus:border-orange-500"
      >
        <span className="truncate">{getDisplayText()}</span>
        <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
      </button>

      {/* Calendar Dropdown Panel Centered relative to trigger */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 5, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute left-1/2 -translate-x-1/2 mt-1.5 w-[19.375rem] bg-white border border-slate-200/80 rounded-2xl p-4 shadow-2xl z-55"
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

                  <div className="flex items-center gap-1.5">
                    {/* Custom Month selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => { setIsMonthOpen(!isMonthOpen); setIsYearOpen(false); }}
                        className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <span>{MONTHS[viewMonth].substring(0, 3)}</span>
                        <ChevronDown className="w-3 h-3 text-slate-500" />
                      </button>
                      {isMonthOpen && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-24 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] py-1 max-h-48 overflow-y-auto">
                          {MONTHS.map((m, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setViewMonth(idx);
                                setIsMonthOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs font-bold transition hover:bg-slate-50 ${
                                viewMonth === idx ? 'text-orange-600 bg-orange-50/50' : 'text-slate-700'
                              }`}
                            >
                              {m.substring(0, 3)}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Custom Year selector */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => { setIsYearOpen(!isYearOpen); setIsMonthOpen(false); }}
                        className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-lg px-2 py-1 text-xs font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                      >
                        <span>{viewYear}</span>
                        <ChevronDown className="w-3 h-3 text-slate-500" />
                      </button>
                      {isYearOpen && (
                        <div
                          ref={yearScrollRef}
                          className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-24 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] py-1 max-h-48 overflow-y-auto"
                        >
                          {YEARS.map(y => (
                            <button
                              key={y}
                              type="button"
                              data-active={viewYear === y ? 'true' : 'false'}
                              onClick={() => {
                                setViewYear(y);
                                setIsYearOpen(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs font-bold transition hover:bg-slate-50 ${
                                viewYear === y ? 'text-orange-600 bg-orange-50/50' : 'text-slate-700'
                              }`}
                            >
                              {y}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
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
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[0.625rem] text-slate-450 uppercase">
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
                            ? 'bg-orange-600 text-white shadow-md shadow-orange-600/20' 
                            : isToday 
                              ? 'border border-orange-400 text-orange-600 bg-orange-50/30' 
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

                  {/* Custom Year Selector for Month Mode */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setIsYearOpen(!isYearOpen); }}
                      className="flex items-center gap-1 bg-slate-50 border border-slate-200/60 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                    >
                      <span>{viewYear}</span>
                      <ChevronDown className="w-3 h-3 text-slate-500" />
                    </button>
                    {isYearOpen && (
                      <div
                        ref={yearScrollRef}
                        className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-24 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] py-1 max-h-48 overflow-y-auto"
                      >
                        {YEARS.map(y => (
                          <button
                            key={y}
                            type="button"
                            data-active={viewYear === y ? 'true' : 'false'}
                            onClick={() => {
                              setViewYear(y);
                              setIsYearOpen(false);
                            }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-bold transition hover:bg-slate-50 ${
                              viewYear === y ? 'text-orange-600 bg-orange-50/50' : 'text-slate-700'
                            }`}
                          >
                            {y}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

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
                            ? 'bg-orange-600 text-white shadow-md'
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
                <span className="text-[0.625rem] font-bold text-slate-400 uppercase tracking-wider block mb-1">Select Year</span>
                <div 
                  ref={yearScrollRef}
                  className="bg-white border border-slate-200/80 rounded-xl py-1 max-h-48 overflow-y-auto w-full"
                >
                  {YEARS.map(y => {
                    const isSelected = value === String(y);
                    return (
                      <button
                        key={y}
                        type="button"
                        data-active={value === String(y) ? 'true' : 'false'}
                        onClick={() => handleSelectYear(y)}
                        className={`w-full text-left px-3 py-2.5 text-xs font-bold transition hover:bg-slate-50 ${
                          isSelected
                            ? 'text-orange-600 bg-orange-50/50'
                            : 'text-slate-700'
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
