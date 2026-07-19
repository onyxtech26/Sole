import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Calendar, ChevronDown } from 'lucide-react';
import { FilterMode, DateRange, makeRange, stepAnchor, toDateStr, startOfWeekSunday } from '../utils/dateFilter';

interface DateRangeFilterProps {
  onChange: (range: DateRange) => void;
  // Optionally expose an "All" option (used on the schedule board).
  allowAll?: boolean;
  onAll?: () => void;
  className?: string;
}

const MODES: { key: FilterMode; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' }
];

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
// 101 years, from 2000 to 2100
const YEARS = Array.from({ length: 101 }, (_, i) => 2000 + i);

export default function DateRangeFilter({ onChange, allowAll = false, onAll, className = '' }: DateRangeFilterProps) {
  const [mode, setMode] = useState<FilterMode>('today');
  const [anchor, setAnchor] = useState<Date>(() => new Date());
  const [isAll, setIsAll] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Month & Year sub-dropdown states inside calendar header
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const yearScrollRef = useRef<HTMLDivElement>(null);

  // Calendar viewed month and year
  const [viewMonth, setViewMonth] = useState(() => anchor.getMonth());
  const [viewYear, setViewYear] = useState(() => anchor.getFullYear());

  // Week hover state to highlight entire week in week mode
  const [hoveredWeekStart, setHoveredWeekStart] = useState<Date | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Auto-scroll year dropdown to center active year
  useEffect(() => {
    if ((isYearOpen || (isOpen && mode === 'year')) && yearScrollRef.current) {
      const activeBtn = yearScrollRef.current.querySelector('[data-active="true"]');
      if (activeBtn) {
        activeBtn.scrollIntoView({ block: 'center', behavior: 'instant' as ScrollBehavior });
      }
    }
  }, [isYearOpen, isOpen, mode]);

  // Update calendar view when anchor changes
  useEffect(() => {
    setViewMonth(anchor.getMonth());
    setViewYear(anchor.getFullYear());
  }, [anchor]);

  useEffect(() => {
    if (isAll) return;
    onChangeRef.current(makeRange(mode, anchor));
  }, [mode, anchor, isAll]);

  // Click outside to close custom popovers
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

  const selectMode = (m: FilterMode) => {
    setIsAll(false);
    setMode(m);
    setIsOpen(false);
    setIsMonthOpen(false);
    setIsYearOpen(false);
  };

  const range = makeRange(mode, anchor);

  // Chevron step navigation handler
  const handleStep = (dir: 1 | -1) => {
    setAnchor(stepAnchor(mode, anchor, dir));
  };

  // Monthly calendar calculation helpers
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const startDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();

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

  // Helper to check if a day falls in the selected week range
  const isDayInSelectedWeek = (day: number) => {
    const d = new Date(viewYear, viewMonth, day);
    const selectedWeekStart = startOfWeekSunday(anchor);
    const time = d.getTime();
    
    const start = new Date(selectedWeekStart.getFullYear(), selectedWeekStart.getMonth(), selectedWeekStart.getDate()).getTime();
    const end = start + 6 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000; // end of week
    
    return time >= start && time <= end;
  };

  // Helper to check if a day falls in the hovered week range
  const isDayInHoveredWeek = (day: number) => {
    if (!hoveredWeekStart) return false;
    const d = new Date(viewYear, viewMonth, day);
    const time = d.getTime();
    const start = new Date(hoveredWeekStart.getFullYear(), hoveredWeekStart.getMonth(), hoveredWeekStart.getDate()).getTime();
    const end = start + 6 * 24 * 60 * 60 * 1000 + 12 * 60 * 60 * 1000;
    return time >= start && time <= end;
  };

  const handleDayHover = (day: number | null) => {
    if (day === null) {
      setHoveredWeekStart(null);
    } else {
      const d = new Date(viewYear, viewMonth, day);
      setHoveredWeekStart(startOfWeekSunday(d));
    }
  };

  const renderPopoverContent = () => {
    if (mode === 'today' || mode === 'week') {
      return (
        <div className="space-y-3">
          {/* Calendar Month & Year Navigation Header */}
          <div className="flex justify-between items-center pb-2 border-b border-theme-border">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg hover:bg-slate-105 border border-theme-border text-theme-muted hover:text-theme-text cursor-pointer transition active:scale-90"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5">
              {/* Custom Month Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setIsMonthOpen(!isMonthOpen); setIsYearOpen(false); }}
                  className="flex items-center gap-1 bg-white border border-theme-border rounded-lg px-2 py-1 text-xs font-bold text-theme-text hover:bg-slate-50 transition cursor-pointer"
                >
                  <span>{MONTH_NAMES[viewMonth].substring(0, 3)}</span>
                  <ChevronDown className="w-3 h-3 text-theme-muted" />
                </button>
                {isMonthOpen && (
                  <div className="absolute top-full left-0 mt-1 w-24 bg-white border border-theme-border rounded-xl shadow-xl z-[60] py-1 max-h-48 overflow-y-auto">
                    {MONTH_NAMES.map((m, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setViewMonth(idx);
                          setIsMonthOpen(false);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs font-bold transition hover:bg-slate-50 ${
                          viewMonth === idx ? 'text-orange-600 bg-orange-50/50' : 'text-theme-text'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Custom Year Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setIsYearOpen(!isYearOpen); setIsMonthOpen(false); }}
                  className="flex items-center gap-1 bg-white border border-theme-border rounded-lg px-2 py-1 text-xs font-bold text-theme-text hover:bg-slate-50 transition cursor-pointer"
                >
                  <span>{viewYear}</span>
                  <ChevronDown className="w-3 h-3 text-theme-muted" />
                </button>
                {isYearOpen && (
                  <div
                    ref={yearScrollRef}
                    className="absolute top-full left-0 mt-1 w-24 bg-white border border-theme-border rounded-xl shadow-xl z-[60] py-1 max-h-48 overflow-y-auto"
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
                          viewYear === y ? 'text-orange-600 bg-orange-50/50' : 'text-theme-text'
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
              className="p-1.5 rounded-lg hover:bg-slate-105 border border-theme-border text-theme-muted hover:text-theme-text cursor-pointer transition active:scale-90"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] text-theme-muted uppercase">
            {WEEKDAYS.map(w => (
              <span key={w} className="py-0.5">{w}</span>
            ))}
          </div>

          {/* Days listing grid */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: startDayOfWeek }).map((_, idx) => (
              <span key={`empty-${idx}`} className="h-7 w-7" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, idx) => {
              const day = idx + 1;
              const d = new Date(viewYear, viewMonth, day);
              
              let isSelected = false;
              let isHovered = false;

              if (mode === 'today') {
                isSelected = toDateStr(anchor) === toDateStr(d);
              } else {
                isSelected = isDayInSelectedWeek(day);
                isHovered = isDayInHoveredWeek(day);
              }

              const isTodayDate = toDateStr(new Date()) === toDateStr(d);

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => {
                    setAnchor(d);
                    setIsOpen(false);
                  }}
                  onMouseEnter={() => mode === 'week' && handleDayHover(day)}
                  onMouseLeave={() => mode === 'week' && handleDayHover(null)}
                  className={`h-7 w-7 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition ${
                    isSelected
                      ? 'bg-orange-600 text-white shadow-sm'
                      : isHovered
                        ? 'bg-orange-105 text-orange-600 bg-orange-50'
                        : isTodayDate
                          ? 'border border-orange-400 text-orange-600 bg-orange-50/20'
                          : 'text-theme-text hover:bg-slate-100'
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    if (mode === 'month') {
      return (
        <div className="space-y-3">
          {/* Year select header */}
          <div className="flex justify-between items-center pb-2 border-b border-theme-border">
            <button
              type="button"
              onClick={() => setViewYear(prev => prev - 1)}
              className="p-1.5 rounded-lg hover:bg-slate-100 border border-theme-border text-theme-muted hover:text-theme-text cursor-pointer transition"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setIsYearOpen(!isYearOpen);
                  setIsMonthOpen(false);
                }}
                className="flex items-center gap-1 hover:bg-slate-100 px-3 py-1.5 border border-theme-border rounded-lg text-xs font-bold transition cursor-pointer text-theme-text"
              >
                <span>{viewYear}</span>
                <ChevronDown className="w-3 h-3 text-theme-muted" />
              </button>

              {isYearOpen && (
                <div
                  ref={yearScrollRef}
                  className="absolute top-full left-1/2 -translate-x-1/2 mt-1 w-24 bg-white border border-theme-border rounded-xl shadow-xl z-[60] py-1 max-h-48 overflow-y-auto"
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
                        viewYear === y ? 'text-orange-600 bg-orange-50/50' : 'text-theme-text'
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
              className="p-1.5 rounded-lg hover:bg-slate-100 border border-theme-border text-theme-muted hover:text-theme-text cursor-pointer transition"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Month list grid */}
          <div className="grid grid-cols-3 gap-1.5">
            {MONTH_NAMES.map((m, idx) => {
              const isSelected = anchor.getFullYear() === viewYear && anchor.getMonth() === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setAnchor(new Date(viewYear, idx, 1));
                    setIsOpen(false);
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-bold transition text-center cursor-pointer ${
                    isSelected
                      ? 'bg-orange-600 text-white shadow-sm'
                      : 'bg-slate-50 border border-theme-border text-theme-text hover:bg-slate-105 hover:bg-slate-100'
                  }`}
                >
                  {m.substring(0, 3)}
                </button>
              );
            })}
          </div>
        </div>
      );
    }

    // year mode
    return (
      <div className="space-y-2">
        <span className="text-[10px] font-bold text-theme-muted uppercase tracking-wider block mb-1">Select Year</span>
        <div 
          ref={yearScrollRef}
          className="bg-white border border-theme-border rounded-xl py-1 max-h-48 overflow-y-auto w-full"
        >
          {YEARS.map(y => {
            const isSelected = anchor.getFullYear() === y;
            return (
              <button
                key={y}
                type="button"
                data-active={anchor.getFullYear() === y ? 'true' : 'false'}
                onClick={() => {
                  setAnchor(new Date(y, anchor.getMonth(), 1));
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2 text-xs font-bold transition hover:bg-slate-50 ${
                  isSelected ? 'text-orange-600 bg-orange-50/50' : 'text-theme-text'
                }`}
              >
                {y}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div ref={containerRef} className={`flex flex-col gap-3 relative ${className}`}>
      {/* Mode tabs */}
      <div className="flex items-center gap-1 bg-white/50 border border-theme-border rounded-xl p-1 w-full sm:w-auto overflow-x-auto">
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => selectMode(m.key)}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              !isAll && mode === m.key
                ? 'bg-orange-600 text-white shadow-sm'
                : 'text-theme-muted hover:text-theme-text hover:bg-white/60'
            }`}
          >
            {m.label}
          </button>
        ))}
        {allowAll && (
          <button
            onClick={() => { setIsAll(true); onAll?.(); }}
            className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition cursor-pointer ${
              isAll ? 'bg-[#0b1220] text-white shadow-sm' : 'text-theme-muted hover:text-theme-text hover:bg-white/60'
            }`}
          >
            All
          </button>
        )}
      </div>

      {/* Custom selection + navigation (Merged label & picker, NO Now button, NO orange label) */}
      {!isAll && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => handleStep(-1)}
            className="p-2.5 rounded-xl bg-white/60 border border-theme-border text-theme-muted hover:text-theme-text hover:border-orange-400 transition shrink-0 cursor-pointer"
            aria-label="Previous"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          
          {/* Custom Date Display & Popover Toggle */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2 bg-white/60 hover:bg-white border border-theme-border rounded-xl px-4 py-2.5 text-xs font-bold text-theme-text outline-none focus:border-orange-500 cursor-pointer shadow-sm min-w-[170px] justify-between transition duration-200"
            >
              <Calendar className="w-3.5 h-3.5 text-theme-muted shrink-0" />
              <span className="truncate flex-1 text-left px-1.5">{range.label}</span>
              <ChevronDown className="w-3.5 h-3.5 text-theme-muted shrink-0" />
            </button>

            {/* Custom Popover Centered relative to Toggle Button */}
            {isOpen && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-2 w-[270px] bg-white border border-theme-border rounded-2xl p-3.5 shadow-2xl shadow-[#0b1220]/10 z-50">
                {renderPopoverContent()}
              </div>
            )}
          </div>

          <button
            onClick={() => handleStep(1)}
            className="p-2.5 rounded-xl bg-white/60 border border-theme-border text-theme-muted hover:text-theme-text hover:border-orange-400 transition shrink-0 cursor-pointer"
            aria-label="Next (upcoming)"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
