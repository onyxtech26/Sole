import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { Compass, LayoutDashboard, CalendarDays, PlusCircle, FileSpreadsheet, Sun, Moon, LogOut, Users, Car, Sparkles, Coins, Trello, Layers } from 'lucide-react';
import { Booking, User } from './types';
import { DEFAULT_SEED_DATA } from './utils/seed';
import LoginScreen from './components/LoginScreen';
import DashboardView from './components/DashboardView';
import BookingsView from './components/BookingsView';
import ReportsView from './components/ReportsView';
import GuidePortalView from './components/GuidePortalView';
import CustomersView from './components/CustomersView';
import VehiclesView from './components/VehiclesView';
import GuidesView from './components/GuidesView';
import FinanceView from './components/FinanceView';
import ScheduleView from './components/ScheduleView';
import ProductsView from './components/ProductsView';

const STORAGE_KEY = 'sole_reservations';
const USER_SESSION_KEY = 'active_user';
const THEME_KEY = 'sole_theme';
const ACTIVE_THEME_KEY = 'sole_active_theme_preset';
const ACTIVE_FONT_KEY = 'sole_active_font';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [editBookingRef, setEditBookingRef] = useState<string | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('light');
  const [activeThemePreset, setActiveThemePreset] = useState<string>('alabaster');
  const [activeFont, setActiveFont] = useState<string>('sans');
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(false);
  const [isSplashing, setIsSplashing] = useState<boolean>(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

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
            setActiveView('guide-portal');
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
      setActiveView('guide-portal');
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
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0 opacity-45">
          <div className="absolute top-[10%] left-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-tr from-indigo-300 to-sky-300 blur-[90px] animate-blob-float-1" />
          <div className="absolute bottom-[15%] right-[10%] w-[350px] h-[350px] rounded-full bg-gradient-to-br from-emerald-200 to-amber-200 blur-[90px] animate-blob-float-2" />
        </div>

        <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-md">
          {/* Animated Compass Icon */}
          <motion.div
            initial={{ scale: 0.7, opacity: 0, rotate: -180 }}
            animate={{ scale: 1, opacity: 1, rotate: 360 }}
            transition={{ type: "spring", stiffness: 60, damping: 15, duration: 1.5 }}
            className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 to-emerald-500 flex items-center justify-center shadow-xl border border-white mb-8"
          >
            <Compass className="w-12 h-12 text-white" />
          </motion.div>

          {/* S U N T O U R Text Animation */}
          <motion.h1
            initial={{ letterSpacing: "0.1em", opacity: 0 }}
            animate={{ letterSpacing: "0.4em", opacity: 1 }}
            transition={{ duration: 1.3, ease: "easeOut" }}
            className="text-4xl font-extrabold tracking-[0.4em] text-slate-900 uppercase font-serif"
          >
            Sole
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="text-xs font-bold tracking-[0.2em] text-slate-500 uppercase mt-4"
          >
            Luxury Travels Operator
          </motion.p>

          {/* Elegant Slim Loading bar */}
          <div className="w-48 h-[3px] bg-slate-200/80 rounded-full overflow-hidden mt-8">
            <motion.div
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.8, ease: "easeInOut" }}
              className="h-full bg-gradient-to-r from-indigo-600 to-emerald-500 rounded-full"
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

  // Guide user is isolated entirely to the guide manifest portal
  if (currentUser.role === 'guide') {
    return (
      <div className="relative min-h-screen bg-white text-slate-800 font-sans overflow-x-hidden">
        <div className="relative z-10">
          <GuidePortalView
            bookings={bookings}
            currentUser={currentUser}
            onToggleGuestCheckin={handleToggleGuestCheckin}
            onLogout={handleLogout}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`relative flex h-screen w-screen overflow-hidden bg-white text-theme-text font-style-${activeFont} transition-all duration-300`}>
      {/* Sidebar Navigation Panel (Auto-expands on hover) */}
      <aside 
        onMouseEnter={() => setIsSidebarExpanded(true)}
        onMouseLeave={() => setIsSidebarExpanded(false)}
        className={`relative z-10 h-full border-r border-theme-border bg-theme-panel/75 backdrop-blur-2xl flex flex-col shrink-0 select-none transition-all duration-500 ease-in-out shadow-2xl shadow-black/5 ${
          isSidebarExpanded ? 'w-64' : 'w-20'
        }`}
      >
        {/* Brand Header Logo */}
        <div className="p-5 flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-theme-gradient-start to-theme-gradient-end flex items-center justify-center shadow-lg shadow-theme-accent-glow border border-white/15 shrink-0">
            <Compass className="w-5.5 h-5.5 text-white animate-[spin_20s_linear_infinite]" />
          </div>
          <div className={`transition-all duration-300 overflow-hidden whitespace-nowrap ${isSidebarExpanded ? 'opacity-100 max-w-[150px]' : 'opacity-0 max-w-0'}`}>
            <h2 className="text-base font-black text-theme-text tracking-wide leading-none">Sole</h2>
            <span className="text-[9px] font-bold tracking-widest text-theme-accent uppercase mt-1 block">Luxury Panel</span>
          </div>
        </div>

        {/* Navigation items list */}
        <nav className="flex-grow px-3.5 space-y-1.5 overflow-y-auto mt-4">
          <button
            onClick={() => {
              setActiveView('dashboard');
              setEditBookingRef(null);
            }}
            className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all ${
              activeView === 'dashboard'
                ? 'bg-theme-accent-glow text-theme-accent border-l-[3px] border-theme-accent shadow-inner'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-accent-glow/30'
            }`}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              Dashboard
            </span>
          </button>
 
          <button
            onClick={() => {
              setActiveView('schedule');
              setEditBookingRef(null);
            }}
            className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeView === 'schedule'
                ? 'bg-theme-accent-glow text-theme-accent border-l-[3px] border-theme-accent shadow-inner'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-accent-glow/30'
            }`}
          >
            <Trello className="w-5 h-5 shrink-0" />
            <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              Schedule Board
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView('bookings');
              setEditBookingRef(null);
            }}
            className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all ${
              activeView === 'bookings'
                ? 'bg-theme-accent-glow text-theme-accent border-l-[3px] border-theme-accent shadow-inner'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-accent-glow/30'
            }`}
          >
            <CalendarDays className="w-5 h-5 shrink-0" />
            <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              Reservations
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView('reports');
              setEditBookingRef(null);
            }}
            className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all ${
              activeView === 'reports'
                ? 'bg-theme-accent-glow text-theme-accent border-l-[3px] border-theme-accent shadow-inner'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-accent-glow/30'
            }`}
          >
            <FileSpreadsheet className="w-5 h-5 shrink-0" />
            <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              Daily Manifests
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView('customers');
              setEditBookingRef(null);
            }}
            className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all ${
              activeView === 'customers'
                ? 'bg-theme-accent-glow text-theme-accent border-l-[3px] border-theme-accent shadow-inner'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-accent-glow/30'
            }`}
          >
            <Users className="w-5 h-5 shrink-0" />
            <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              CRM / Customers
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView('products');
              setEditBookingRef(null);
            }}
            className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all cursor-pointer ${
              activeView === 'products'
                ? 'bg-theme-accent-glow text-theme-accent border-l-[3px] border-theme-accent shadow-inner'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-accent-glow/30'
            }`}
          >
            <Layers className="w-5 h-5 shrink-0" />
            <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              Product Catalog
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView('vehicles');
              setEditBookingRef(null);
            }}
            className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all ${
              activeView === 'vehicles'
                ? 'bg-theme-accent-glow text-theme-accent border-l-[3px] border-theme-accent shadow-inner'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-accent-glow/30'
            }`}
          >
            <Car className="w-5 h-5 shrink-0" />
            <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              VIP Fleet
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView('guides');
              setEditBookingRef(null);
            }}
            className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all ${
              activeView === 'guides'
                ? 'bg-theme-accent-glow text-theme-accent border-l-[3px] border-theme-accent shadow-inner'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-accent-glow/30'
            }`}
          >
            <Sparkles className="w-5 h-5 shrink-0" />
            <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              Guides & Staff
            </span>
          </button>

          <button
            onClick={() => {
              setActiveView('finance');
              setEditBookingRef(null);
            }}
            className={`w-full flex items-center gap-3.5 px-3.5 py-3 text-sm font-bold rounded-xl transition-all ${
              activeView === 'finance'
                ? 'bg-theme-accent-glow text-theme-accent border-l-[3px] border-theme-accent shadow-inner'
                : 'text-theme-muted hover:text-theme-text hover:bg-theme-accent-glow/30'
            }`}
          >
            <Coins className="w-5 h-5 shrink-0" />
            <span className={`transition-all duration-300 overflow-hidden whitespace-nowrap text-left ${isSidebarExpanded ? 'opacity-100 max-w-[200px]' : 'opacity-0 max-w-0 pointer-events-none'}`}>
              Corporate Finance
            </span>
          </button>
        </nav>

        {/* Sidebar Footer - Clean Manager profile card & Logout Trigger */}
        <div className="p-4 border-t border-theme-border shrink-0 bg-transparent">
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`w-full flex items-center justify-between p-2.5 rounded-xl transition-all duration-300 ${
              isSidebarExpanded 
                ? 'bg-theme-accent-glow/50 hover:bg-rose-500/10 border border-theme-border hover:border-rose-500/20 text-theme-text' 
                : 'justify-center text-theme-muted hover:text-rose-400 hover:bg-rose-500/10 border border-transparent'
            }`}
            title="Log Out (Manager)"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="w-7 h-7 rounded-lg bg-gradient-to-tr from-theme-gradient-start to-theme-gradient-end flex items-center justify-center font-extrabold text-xs text-white shrink-0 shadow-md">
                {currentUser.username[0].toUpperCase()}
              </span>
              <span className={`text-xs font-extrabold text-theme-text truncate transition-all duration-300 ${
                isSidebarExpanded ? 'opacity-100 max-w-[100px]' : 'opacity-0 max-w-0 pointer-events-none'
              }`}>
                Manager
              </span>
            </div>
            {isSidebarExpanded && (
              <LogOut className="w-4 h-4 text-theme-muted hover:text-rose-500 transition-colors shrink-0 ml-1" />
            )}
          </button>
        </div>
      </aside>

      {/* Main viewport */}
      <main className="flex-grow h-full overflow-y-auto p-8 sm:p-10 flex flex-col gap-8 relative z-20 bg-transparent">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-grow flex flex-col"
          >
            {activeView === 'dashboard' && (
              <DashboardView
                bookings={bookings}
                currentUser={currentUser}
                onAddBookings={handleAddBookings}
                onNavigate={setActiveView}
              />
            )}

            {activeView === 'schedule' && (
              <ScheduleView
                bookings={bookings}
                currentUser={currentUser}
                onUpdateBookings={saveBookingsState}
              />
            )}

            {activeView === 'bookings' && (
              <BookingsView
                bookings={bookings}
                currentUser={currentUser}
                onDeleteBooking={handleDeleteBooking}
                onUpdateBookingStatus={handleUpdateBookingStatus}
                onUpdateBookingPaymentStatus={handleUpdateBookingPaymentStatus}
                onSaveBooking={handleSaveBooking}
              />
            )}

            {activeView === 'products' && (
              <ProductsView />
            )}

            {activeView === 'reports' && (
              <ReportsView
                bookings={bookings}
                currentUser={currentUser}
              />
            )}

            {activeView === 'customers' && (
              <CustomersView />
            )}

            {activeView === 'vehicles' && (
              <VehiclesView />
            )}

            {activeView === 'guides' && (
              <GuidesView />
            )}

            {activeView === 'finance' && (
              <FinanceView
                bookings={bookings}
                onUpdateBookingPaymentStatus={handleUpdateBookingPaymentStatus}
              />
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
