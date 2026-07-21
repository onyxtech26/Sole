import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { LayoutDashboard, CalendarDays, PlusCircle, FileSpreadsheet, Sun, Moon, LogOut, Users, Sparkles, Coins, Trello, Layers, Menu, X } from 'lucide-react';
import { Booking, User } from './types';
import { DEFAULT_SEED_DATA } from './utils/seed';
import LoginScreen from './components/LoginScreen';
import DashboardView from './components/DashboardView';
import BookingsView from './components/BookingsView';
import ReportsView from './components/ReportsView';
import GuidePortalView from './components/GuidePortalView';
import CustomersView from './components/CustomersView';
import GuidesView from './components/GuidesView';
import FinanceView from './components/FinanceView';
import ScheduleView from './components/ScheduleView';
import ProductsView from './components/ProductsView';

const STORAGE_KEY = 'sole_reservations';
const USER_SESSION_KEY = 'active_user';
const THEME_KEY = 'sole_theme';
const ACTIVE_THEME_KEY = 'sole_active_theme_preset';
const ACTIVE_FONT_KEY = 'sole_active_font';

const isViewAllowed = (role: string, view: string) => {
  if (role === 'manager') return true;
  if (role === 'staff') {
    return view !== 'guides' && view !== 'finance';
  }
  if (role === 'guide') {
    return view === 'schedule' || view === 'reports' || view === 'customers';
  }
  return false;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [editBookingRef, setEditBookingRef] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [activeThemePreset, setActiveThemePreset] = useState<string>('alabaster');
  const [activeFont, setActiveFont] = useState<string>('sans');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);
  const [isSplashing, setIsSplashing] = useState<boolean>(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  const openMobileNav = () => { setMobileNavOpen(true); setIsSidebarExpanded(true); };
  const closeMobileNav = () => { setMobileNavOpen(false); setIsSidebarExpanded(false); };

  // Load bookings & login session & theme on mount
  useEffect(() => {
    // Splash screen timeout
    const splashTimer = setTimeout(() => {
      setIsSplashing(false);
    }, 2200);

    // Bookings
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          // Normalize and verify fields exist (e.g. checkedInGuests)
          const normalized = parsed.map(b => ({
            ...b,
            checkedInGuests: b.checkedInGuests || []
          }));
          setBookings(normalized);
        } else {
          setBookings(DEFAULT_SEED_DATA);
        }
      } catch (e) {
        setBookings(DEFAULT_SEED_DATA);
      }
    } else {
      setBookings(DEFAULT_SEED_DATA);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SEED_DATA));
    }

    // Login session
    const session = sessionStorage.getItem(USER_SESSION_KEY);
    if (session) {
      try {
        const userObj = JSON.parse(session);
        if (userObj && userObj.role) {
          setCurrentUser(userObj);
          if (userObj.role === 'guide') {
            setActiveView('schedule');
          }
        }
      } catch (e) {
        sessionStorage.removeItem(USER_SESSION_KEY);
      }
    }

    // Theme Presets & Fonts (Locked to premium alabaster/light theme for solid white bg)
    const storedThemePreset = 'alabaster';
    setActiveThemePreset('alabaster');
    
    const storedFont = localStorage.getItem(ACTIVE_FONT_KEY) || 'sans';
    setActiveFont(storedFont);

    // Apply classes to documentElement
    const htmlEl = document.documentElement;
    htmlEl.classList.forEach(cls => {
      if (cls.startsWith('theme-')) {
        htmlEl.classList.remove(cls);
      }
    });
    htmlEl.classList.add('theme-alabaster');

    const storedTheme = 'light';
    setTheme('light');
    htmlEl.setAttribute('data-theme', 'light');
    htmlEl.classList.add('light');
    htmlEl.classList.remove('dark');

    return () => clearTimeout(splashTimer);
  }, []);

  const saveBookingsState = (newBookings: Booking[]) => {
    setBookings(newBookings);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newBookings));
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    sessionStorage.setItem(USER_SESSION_KEY, JSON.stringify(user));
    if (user.role === 'guide') {
      setActiveView('schedule');
    } else {
      setActiveView('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem(USER_SESSION_KEY);
    setActiveView('dashboard');
  };

  const handleSelectThemePreset = (presetId: string) => {
    setActiveThemePreset(presetId);
    localStorage.setItem(ACTIVE_THEME_KEY, presetId);
    
    const htmlEl = document.documentElement;
    htmlEl.classList.forEach(cls => {
      if (cls.startsWith('theme-')) {
        htmlEl.classList.remove(cls);
      }
    });
    htmlEl.classList.add(`theme-${presetId}`);
    
    const newTheme = presetId === 'alabaster' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    htmlEl.setAttribute('data-theme', newTheme);
    if (newTheme === 'light') {
      htmlEl.classList.add('light');
      htmlEl.classList.remove('dark');
    } else {
      htmlEl.classList.add('dark');
      htmlEl.classList.remove('light');
    }
  };

  const handleSelectFont = (fontId: string) => {
    setActiveFont(fontId);
    localStorage.setItem(ACTIVE_FONT_KEY, fontId);
  };

  const handleToggleTheme = () => {
    if (activeThemePreset === 'alabaster') {
      handleSelectThemePreset('obsidian');
    } else {
      handleSelectThemePreset('alabaster');
    }
  };

  // Add bulk or single bookings
  const handleAddBookings = (newBookings: Booking[]) => {
    const updated = [...bookings, ...newBookings];
    saveBookingsState(updated);
  };

  // Save single booking (Insert or Update)
  const handleSaveBooking = (booking: Booking) => {
    const index = bookings.findIndex(b => b.bookingRef === booking.bookingRef);
    let updated: Booking[];
    if (index !== -1) {
      updated = [...bookings];
      updated[index] = booking;
    } else {
      updated = [...bookings, booking];
    }
    saveBookingsState(updated);
    setEditBookingRef(null);
    setActiveView('bookings');
  };

  const handleEditBooking = (ref: string) => {
    setEditBookingRef(ref);
    setActiveView('add-booking');
  };

  const handleDeleteBooking = (ref: string) => {
    const updated = bookings.filter(b => b.bookingRef !== ref);
    saveBookingsState(updated);
  };

  const handleUpdateBookingStatus = (ref: string, status: Booking['status']) => {
    const updated = bookings.map(b => {
      if (b.bookingRef === ref) {
        return { ...b, status, okStatus: status === 'Confirmed' };
      }
      return b;
    });
    saveBookingsState(updated);
  };

  const handleUpdateBookingPaymentStatus = (ref: string, paymentStatus: Booking['paymentStatus']) => {
    const updated = bookings.map(b => {
      if (b.bookingRef === ref) {
        return { ...b, paymentStatus };
      }
      return b;
    });
    saveBookingsState(updated);
  };

  const handleToggleGuestCheckin = (ref: string, guestIndex: number, isChecked: boolean) => {
    const updated = bookings.map(b => {
      if (b.bookingRef === ref) {
        let currentChecked = b.checkedInGuests || [];
        if (isChecked) {
          if (!currentChecked.includes(guestIndex)) {
            currentChecked = [...currentChecked, guestIndex];
          }
        } else {
          currentChecked = currentChecked.filter(idx => idx !== guestIndex);
        }
        return { ...b, checkedInGuests: currentChecked };
      }
      return b;
    });
    saveBookingsState(updated);
  };

  // Splash Screen Overlay Animation
  if (isSplashing) {
    return (
      <div className="fixed inset-0 z-50 bg-[#f8fafc] flex flex-col items-center justify-center text-slate-900 overflow-hidden font-sans">
        {/* Abstract floating background circles inside splash */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-25">
          <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-slate-300 to-orange-200 blur-[90px] animate-blob-float-1" />
          <div className="absolute bottom-[15%] right-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-orange-200 to-amber-100 blur-[90px] animate-blob-float-2" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-md">
          {/* Animated Logo mark */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 360 }}
            transition={{ type: "spring", stiffness: 60, damping: 15, duration: 1.5 }}
            className="w-24 h-24 rounded-2xl bg-[#0b1220] flex items-center justify-center shadow-xl border border-white mb-8"
          >
            <img src="/logo-mark.png" alt="SOLE" className="w-12 h-12 object-contain" />
          </motion.div>

          {/* SOLE wordmark */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.3, ease: "easeOut" }}
          >
            <img src="/logo.png" alt="SOLE" className="h-9 w-auto" />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mt-4"
          >
            Smart Operations and Logistics Engine
          </motion.p>

          {/* Elegant Slim Loading bar */}
          <div className="w-48 h-[3px] bg-slate-200/80 rounded-full overflow-hidden mt-8">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-[#0b1220] to-orange-500 rounded-full"
            />
          </div>

          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="text-[9px] font-mono tracking-widest text-slate-400 mt-4 block"
          >
            INITIALIZING CORE OPERATIONS v2.6
          </motion.span>
        </div>
      </div>
    );
  }

  // If not logged in, force Login Screen Overlay
  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }



  return (
    <div className={`relative flex h-screen w-screen overflow-hidden bg-theme-bg text-theme-text font-style-${activeFont} transition-all duration-300`}>
      {/* Abstract floating background circles like the splash screen */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-10">
        <div className="absolute top-[10%] left-[10%] w-[450px] h-[450px] rounded-full bg-gradient-to-tr from-slate-300 to-orange-200 blur-[110px] animate-blob-float-1" />
        <div className="absolute bottom-[15%] right-[10%] w-[450px] h-[450px] rounded-full bg-gradient-to-br from-orange-200 to-amber-100 blur-[110px] animate-blob-float-2" />
      </div>

      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-30 h-16 flex items-center justify-between px-4 bg-theme-panel/90 backdrop-blur-2xl border-b border-theme-border shadow-sm">
        <button
          onClick={openMobileNav}
          className="p-2 rounded-xl text-theme-text hover:bg-theme-accent-glow/40 transition"
          aria-label="Open navigation"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0b1220] flex items-center justify-center shrink-0">
            <img src="/logo-mark.png" alt="SOLE" className="w-4.5 h-4.5 object-contain" />
          </div>
          <span className="text-sm font-black text-theme-text tracking-wide">Sole</span>
        </div>
        <div className="w-10" />
      </div>

      {/* Mobile drawer backdrop */}
      {mobileNavOpen && (
        <div
          onClick={closeMobileNav}
          className="lg:hidden fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-sm"
        />
      )}

      {/* Sidebar Navigation Panel (drawer on mobile, hover-expand on desktop) */}
      <aside
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => { if (!mobileNavOpen) setIsSidebarExpanded(false); }}
        className={`fixed lg:relative inset-y-0 left-0 z-50 lg:z-10 h-full border-r border-white/10 bg-gradient-to-b from-theme-gradient-start to-theme-gradient-end flex flex-col shrink-0 select-none transition-all duration-300 ease-in-out shadow-2xl shadow-black/15 w-64 rounded-r-[2.25rem] overflow-hidden ${
          isSidebarExpanded ? 'lg:w-64' : 'lg:w-20'
        } ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Mobile drawer close button */}
        <button
          onClick={closeMobileNav}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition"
          aria-label="Close navigation"
        >
          <X className="w-5 h-5" />
        </button>
        {/* Brand Header Logo */}
        <div className="p-5 flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center shadow-lg border border-white/15 shrink-0">
            <img src="/logo-mark.png" alt="SOLE" className="w-5.5 h-5.5 object-contain brightness-0 invert" />
          </div>
          <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>
            <h2 className="text-base font-black text-white tracking-wide leading-none">Sole</h2>
            <span className="text-[9px] font-bold tracking-widest text-orange-200 uppercase mt-1 block">Operations Engine</span>
          </div>
        </div>

        {/* Navigation items list */}
        <nav onClick={() => { if (mobileNavOpen) closeMobileNav(); }} className="flex-grow px-3.5 space-y-1.5 overflow-y-auto mt-4 pt-8 lg:pt-0">
          {isViewAllowed(currentUser.role, 'dashboard') && (
            <button
              onClick={() => {
                setActiveView('dashboard');
                setEditBookingRef(null);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all ${
                activeView === 'dashboard'
                  ? 'bg-white/15 text-white border-l-[4px] border-orange-400 shadow-md'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <LayoutDashboard className="w-5 h-5 shrink-0" />
              <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
                Dashboard
              </span>
            </button>
          )}
 
          {isViewAllowed(currentUser.role, 'schedule') && (
            <button
              onClick={() => {
                setActiveView('schedule');
                setEditBookingRef(null);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                activeView === 'schedule'
                  ? 'bg-white/15 text-white border-l-[4px] border-orange-400 shadow-md'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <Trello className="w-5 h-5 shrink-0" />
              <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
                Schedule Board
              </span>
            </button>
          )}

          {isViewAllowed(currentUser.role, 'bookings') && (
            <button
              onClick={() => {
                setActiveView('bookings');
                setEditBookingRef(null);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all ${
                activeView === 'bookings'
                  ? 'bg-white/15 text-white border-l-[4px] border-orange-400 shadow-md'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <CalendarDays className="w-5 h-5 shrink-0" />
              <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
                Reservations
              </span>
            </button>
          )}

          {isViewAllowed(currentUser.role, 'reports') && (
            <button
              onClick={() => {
                setActiveView('reports');
                setEditBookingRef(null);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all ${
                activeView === 'reports'
                  ? 'bg-white/15 text-white border-l-[4px] border-orange-400 shadow-md'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <FileSpreadsheet className="w-5 h-5 shrink-0" />
              <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
                Daily Manifests
              </span>
            </button>
          )}

          {isViewAllowed(currentUser.role, 'customers') && (
            <button
              onClick={() => {
                setActiveView('customers');
                setEditBookingRef(null);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all ${
                activeView === 'customers'
                  ? 'bg-white/15 text-white border-l-[4px] border-orange-400 shadow-md'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <Users className="w-5 h-5 shrink-0" />
              <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
                CRM / Customers
              </span>
            </button>
          )}

          {isViewAllowed(currentUser.role, 'products') && (
            <button
              onClick={() => {
                setActiveView('products');
                setEditBookingRef(null);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all cursor-pointer ${
                activeView === 'products'
                  ? 'bg-white/15 text-white border-l-[4px] border-orange-400 shadow-md'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <Layers className="w-5 h-5 shrink-0" />
              <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
                Product Catalog
              </span>
            </button>
          )}

          {isViewAllowed(currentUser.role, 'guides') && (
            <button
              onClick={() => {
                setActiveView('guides');
                setEditBookingRef(null);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all ${
                activeView === 'guides'
                  ? 'bg-white/15 text-white border-l-[4px] border-orange-400 shadow-md'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <Sparkles className="w-5 h-5 shrink-0" />
              <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
                Guides & Staff
              </span>
            </button>
          )}

          {isViewAllowed(currentUser.role, 'finance') && (
            <button
              onClick={() => {
                setActiveView('finance');
                setEditBookingRef(null);
              }}
              className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all ${
                activeView === 'finance'
                  ? 'bg-white/15 text-white border-l-[4px] border-orange-400 shadow-md'
                  : 'text-white/75 hover:text-white hover:bg-white/10'
              }`}
            >
              <Coins className="w-5 h-5 shrink-0" />
              <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
                Corporate Finance
              </span>
            </button>
          )}
        </nav>

        {/* Sidebar Footer - Clean profile card & Logout Trigger */}
        <div className="p-4 border-t border-white/10 shrink-0 bg-transparent">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-300 ${
              isSidebarExpanded 
                ? 'bg-white/10 hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/30 text-white' 
                : 'justify-center text-white/70 hover:text-rose-400 hover:bg-rose-500/20 border border-transparent'
            }`}
            title={`Log Out (${currentUser.username})`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-white flex items-center justify-center font-black text-xs text-[#0b1220] shrink-0 shadow-md">
                {currentUser.username[0].toUpperCase()}
              </span>
              <span className={`text-xs font-black text-white truncate transition-all duration-300 ${
                isSidebarExpanded ? 'opacity-100 max-w-[120px]' : 'opacity-0 max-w-0 pointer-events-none'
              }`}>
                {currentUser.username}
              </span>
            </div>
            {isSidebarExpanded && (
              <LogOut className="w-4 h-4 text-white/70 hover:text-rose-400 transition-colors shrink-0 ml-1" />
            )}
          </button>
        </div>
      </aside>

      {/* Main viewport */}
      <main className="flex-grow h-full overflow-y-auto p-4 pt-20 sm:p-6 sm:pt-20 lg:p-10 flex flex-col gap-8 relative z-20 bg-transparent">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-grow flex flex-col"
          >
            {activeView === 'dashboard' && isViewAllowed(currentUser.role, 'dashboard') && (
              <DashboardView
                bookings={bookings}
                currentUser={currentUser}
                onAddBookings={handleAddBookings}
                onNavigate={setActiveView}
              />
            )}

            {activeView === 'schedule' && isViewAllowed(currentUser.role, 'schedule') && (
              <ScheduleView
                bookings={bookings}
                currentUser={currentUser}
                onUpdateBookings={saveBookingsState}
              />
            )}

            {activeView === 'bookings' && isViewAllowed(currentUser.role, 'bookings') && (
              <BookingsView
                bookings={bookings}
                currentUser={currentUser}
                onDeleteBooking={handleDeleteBooking}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                onUpdateBookingPaymentStatus={handleUpdateBookingPaymentStatus}
                onSaveBooking={handleSaveBooking}
              />
            )}

            {activeView === 'products' && isViewAllowed(currentUser.role, 'products') && (
              <ProductsView />
            )}

            {activeView === 'reports' && isViewAllowed(currentUser.role, 'reports') && (
              <ReportsView
                bookings={bookings}
                currentUser={currentUser}
              />
            )}

            {activeView === 'customers' && isViewAllowed(currentUser.role, 'customers') && (
              <CustomersView />
            )}

            {activeView === 'guides' && isViewAllowed(currentUser.role, 'guides') && (
              <GuidesView />
            )}

            {activeView === 'finance' && isViewAllowed(currentUser.role, 'finance') && (
              <FinanceView
                bookings={bookings}
                onUpdateBookingPaymentStatus={handleUpdateBookingPaymentStatus}
              />
            )}

            {!isViewAllowed(currentUser.role, activeView) && (
              <div className="flex flex-col items-center justify-center text-center p-8 bg-white/60 border border-theme-border rounded-3xl shadow-sm my-auto">
                <h3 className="text-lg font-bold text-rose-600">Access Denied</h3>
                <p className="text-xs text-theme-muted mt-1">You do not have permission to access this page.</p>
                <button
                  onClick={() => setActiveView(currentUser.role === 'guide' ? 'schedule' : 'dashboard')}
                  className="mt-4 bg-[#0b1220] hover:bg-[#161f33] hover:scale-105 active:scale-95 text-white font-bold px-4 py-2 rounded-xl text-xs transition duration-200 cursor-pointer"
                >
                  Return to Home
                </button>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </main>

      {/* ─── Logout Confirmation Modal ─── */}
      {createPortal(
        <AnimatePresence>
          {showLogoutConfirm && (
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
              onClick={() => setShowLogoutConfirm(false)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-6 md:p-8 border border-slate-105 shadow-2xl max-w-sm w-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mb-4">
                  <LogOut className="w-5 h-5 text-rose-600" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-2">Confirm Logout</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-5">
                  Are you sure you want to log out of Sole Travel Operations Panel?
                </p>
                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowLogoutConfirm(false)}
                    className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleLogout();
                      setShowLogoutConfirm(false);
                    }}
                    className="bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-rose-700 shadow-md cursor-pointer transition active:scale-95"
                  >
                    Log Out
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
