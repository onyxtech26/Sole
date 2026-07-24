import React, { useState, useEffect, useRef } from 'react';
import { Search, X, CalendarDays, Users, Layers, Sparkles, Coins, LayoutDashboard, Trello, FileSpreadsheet, Command, ArrowRight, ShieldCheck } from 'lucide-react';
import { Booking, User } from '../types';
import { SEED_CUSTOMERS, SEED_GUIDES, SEED_EXPENSES } from '../utils/seed';

interface CommandSearchProps {
  bookings: Booking[];
  currentUser: User;
  onNavigate: (view: string) => void;
  className?: string;
}

interface SearchResult {
  id: string;
  category: 'Page' | 'Reservation' | 'Customer' | 'Product' | 'Guide' | 'Finance';
  title: string;
  subtitle: string;
  badge?: string;
  badgeColor?: string;
  action: () => void;
}

const isViewAllowed = (role: string, view: string) => {
  if (role === 'manager') return true;
  if (role === 'operations') return view !== 'finance';
  if (role === 'staff') {
    return view !== 'guides' && view !== 'finance';
  }
  if (role === 'guide') {
    return view === 'schedule' || view === 'reports' || view === 'customers';
  }
  return false;
};

export default function CommandSearch({ bookings, currentUser, onNavigate, className = '' }: CommandSearchProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results: SearchResult[] = [];
  const q = query.toLowerCase().trim();

  if (q.length > 0) {
    // 1. Search Pages (Navigation) based on role
    const pages = [
      { id: 'dashboard', label: 'Operational Dashboard', desc: 'Real-time booking intelligence and daily controls', icon: LayoutDashboard },
      { id: 'schedule', label: 'Schedule Board', desc: 'Kanban view of tours and guide assignments', icon: Trello },
      { id: 'bookings', label: 'Reservations', desc: 'Manage client bookings and statuses', icon: CalendarDays },
      { id: 'reports', label: 'Daily Manifests', desc: 'Printable daily tour manifests and passenger lists', icon: FileSpreadsheet },
      { id: 'customers', label: 'CRM / Customers', desc: 'Private client profiles and preferences', icon: Users },
      { id: 'products', label: 'Product Catalog', desc: 'Tour packages, pricing, and codes', icon: Layers },
      { id: 'guides', label: 'Guides & Staff', desc: 'Guide roster, languages, and ratings', icon: Sparkles },
      { id: 'finance', label: 'Corporate Finance', desc: 'Revenue, ledger expenses, and accounts', icon: Coins }
    ];

    pages.forEach(p => {
      if (isViewAllowed(currentUser.role, p.id)) {
        if (p.label.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.id.includes(q)) {
          results.push({
            id: `page-${p.id}`,
            category: 'Page',
            title: p.label,
            subtitle: p.desc,
            badge: 'Navigation',
            badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            action: () => {
              onNavigate(p.id);
              setIsOpen(false);
              setQuery('');
            }
          });
        }
      }
    });

    // 2. Search Bookings / Reservations
    bookings.forEach(b => {
      // If guide user, only show bookings assigned to them or allowed
      if (currentUser.role === 'guide' && b.assignedGuide.toLowerCase() !== currentUser.username.toLowerCase()) {
        return;
      }

      const matchRef = b.bookingRef.toLowerCase().includes(q);
      const matchClient = b.leadTraveler.toLowerCase().includes(q);
      const matchTour = b.tourName.toLowerCase().includes(q);
      const matchGuide = b.assignedGuide.toLowerCase().includes(q);
      const matchPhone = b.phone.toLowerCase().includes(q);
      const matchStatus = b.status.toLowerCase().includes(q);

      if (matchRef || matchClient || matchTour || matchGuide || matchPhone || matchStatus) {
        results.push({
          id: `booking-${b.bookingRef}`,
          category: 'Reservation',
          title: `${b.leadTraveler} (${b.bookingRef})`,
          subtitle: `${b.tourName} • ${b.travelDate} @ ${b.tourTime}`,
          badge: b.status,
          badgeColor: b.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : b.status === 'Modified' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : b.status === 'Pending' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-rose-50 text-rose-700 border-rose-200',
          action: () => {
            onNavigate('bookings');
            setIsOpen(false);
            setQuery('');
          }
        });
      }
    });

    // 3. Search Customers (Allowed for manager, staff, guide)
    SEED_CUSTOMERS.forEach(c => {
      const matchName = c.name.toLowerCase().includes(q);
      const matchEmail = c.email.toLowerCase().includes(q);
      const matchPhone = c.phone.toLowerCase().includes(q);
      const matchCountry = c.country.toLowerCase().includes(q);

      if (matchName || matchEmail || matchPhone || matchCountry) {
        results.push({
          id: `customer-${c.id}`,
          category: 'Customer',
          title: c.name,
          subtitle: `${c.email} • ${c.phone} (${c.country})`,
          badge: 'Client CRM',
          badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
          action: () => {
            onNavigate('customers');
            setIsOpen(false);
            setQuery('');
          }
        });
      }
    });

    // 4. Search Products (Allowed for manager, staff)
    if (isViewAllowed(currentUser.role, 'products')) {
      const productsList = [
        { code: '5524558P4', name: 'Private Colosseum, Forum & Palatine Hill' },
        { code: '5524558P1', name: 'Guided Colosseum, Forum & Palatine Hill' },
        { code: '5524558P2', name: 'Rome Highlights by Golf Cart Tour' },
        { code: '5524558P10', name: 'Discover North Cyprus: Famagusta Tour' }
      ];

      productsList.forEach(p => {
        if (p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)) {
          results.push({
            id: `product-${p.code}`,
            category: 'Product',
            title: p.name,
            subtitle: `Product Code: ${p.code}`,
            badge: 'Tour Catalog',
            badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
            action: () => {
              onNavigate('products');
              setIsOpen(false);
              setQuery('');
            }
          });
        }
      });
    }

    // 5. Search Guides & Staff (Allowed ONLY for manager)
    if (isViewAllowed(currentUser.role, 'guides')) {
      SEED_GUIDES.forEach(g => {
        if (g.name.toLowerCase().includes(q) || g.role.toLowerCase().includes(q) || g.languages.some(l => l.toLowerCase().includes(q))) {
          results.push({
            id: `guide-${g.id}`,
            category: 'Guide',
            title: `${g.name} (${g.role})`,
            subtitle: `Languages: ${g.languages.join(', ')} • Rating: ${g.performanceRating}★`,
            badge: g.availability,
            badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
            action: () => {
              onNavigate('guides');
              setIsOpen(false);
              setQuery('');
            }
          });
        }
      });
    }

    // 6. Search Finance & Ledger Expenses (Allowed ONLY for manager)
    if (isViewAllowed(currentUser.role, 'finance')) {
      SEED_EXPENSES.forEach(e => {
        if (e.description.toLowerCase().includes(q) || e.category.toLowerCase().includes(q) || e.id.toLowerCase().includes(q)) {
          results.push({
            id: `expense-${e.id}`,
            category: 'Finance',
            title: `${e.category}: €${e.amount.toFixed(2)}`,
            subtitle: `${e.description} • ${e.date}`,
            badge: e.status,
            badgeColor: e.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
            action: () => {
              onNavigate('finance');
              setIsOpen(false);
              setQuery('');
            }
          });
        }
      });
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Bar beside Day Selection */}
      <div className="relative flex items-center">
        <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center">
          <Search className="w-4 h-4 text-orange-500" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsOpen(true);
          }}
          placeholder={`Search ${currentUser.role} tools & data...`}
          className="w-56 sm:w-72 md:w-80 bg-white/80 hover:bg-white border border-theme-border rounded-xl pl-9 pr-14 py-2 text-xs font-semibold text-slate-800 outline-none transition duration-200 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 placeholder-slate-400 shadow-sm"
        />
        {query ? (
          <button
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="absolute right-2.5 p-1 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : (
          <div className="absolute right-2.5 flex items-center gap-0.5 bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-[9px] font-mono text-slate-400 pointer-events-none">
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </div>
        )}
      </div>

      {/* Floating Role-Aware Search Dropdown Popover */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 md:w-[440px] bg-white border border-slate-200/90 rounded-2xl shadow-2xl z-[100] overflow-hidden animate-fade-in max-h-[460px] flex flex-col">
          {/* Header Role indicator */}
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
              Role: <span className="text-orange-600 font-bold uppercase">{currentUser.role}</span>
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              {results.length} result{results.length === 1 ? '' : 's'}
            </span>
          </div>

          {/* Results List */}
          <div className="overflow-y-auto p-2 space-y-1 flex-grow">
            {query.trim().length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <Search className="w-6 h-6 mx-auto mb-2 opacity-30 text-orange-500" />
                <p className="font-bold text-slate-600">Global Website Search</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Type any keyword to search reservations, clients, catalog, or navigate pages.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs font-semibold">
                No matching items found for "{query}".
              </div>
            ) : (
              results.map((res) => (
                <button
                  key={res.id}
                  onClick={res.action}
                  className="w-full text-left p-3 rounded-xl hover:bg-orange-50/60 border border-transparent hover:border-orange-200 transition duration-150 flex items-center justify-between group cursor-pointer"
                >
                  <div className="min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-xs text-slate-900 group-hover:text-orange-600 transition truncate">
                        {res.title}
                      </span>
                      {res.badge && (
                        <span className={`px-1.5 py-0.5 rounded border text-[9px] font-extrabold uppercase shrink-0 ${res.badgeColor}`}>
                          {res.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate font-medium">{res.subtitle}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 shrink-0 transition group-hover:translate-x-0.5" />
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
