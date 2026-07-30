import React, { useState, useEffect } from 'react';
import { Search, Mail, Phone, Globe, Star, ShieldCheck, Plus, FileText, CheckCircle2, Award, ClipboardList, Trash2, X, Users, Pencil } from 'lucide-react';
import { Customer } from '../types';
import { SEED_CUSTOMERS } from '../utils/seed';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { writeStore } from '../utils/storage';
import { COUNTRIES, flagOf, countryByIso, countryByName, splitPhone, joinPhone } from '../utils/countries';

const CUSTOMERS_STORAGE_KEY = 'sole_customers';

export default function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // One form drives both onboarding and editing; `editingId` picks the mode.
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPhoneIso, setFormPhoneIso] = useState('US');
  const [formPhoneNumber, setFormPhoneNumber] = useState('');
  const [formCountry, setFormCountry] = useState('United States');
  const [formNotes, setFormNotes] = useState('');
  const [formPrefs, setFormPrefs] = useState('');

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CUSTOMERS_STORAGE_KEY);
    if (stored) {
      try {
        setCustomers(JSON.parse(stored));
      } catch (e) {
        setCustomers(SEED_CUSTOMERS);
      }
    } else {
      setCustomers(SEED_CUSTOMERS);
      writeStore(CUSTOMERS_STORAGE_KEY, SEED_CUSTOMERS);
    }
  }, []);

  const saveCustomers = (list: Customer[]) => {
    setCustomers(list);
    writeStore(CUSTOMERS_STORAGE_KEY, list);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormName('');
    setFormEmail('');
    setFormPhoneIso('US');
    setFormPhoneNumber('');
    setFormCountry('United States');
    setFormNotes('');
    setFormPrefs('');
    setShowForm(true);
  };

  const openEditForm = (c: Customer) => {
    const parsed = splitPhone(c.phone);
    setEditingId(c.id);
    setFormName(c.name);
    setFormEmail(c.email);
    // Fall back to the client's country when the stored number carries no dial
    // code, so an existing local number still gets a sensible flag.
    setFormPhoneIso(parsed.iso || countryByName(c.country)?.iso || '');
    setFormPhoneNumber(parsed.number);
    setFormCountry(c.country || '');
    setFormNotes(c.notes || '');
    setFormPrefs((c.preferences || []).join(', '));
    setShowForm(true);
  };

  // Picking a country fills in the matching dial code, but only while the
  // number is still empty — never overwrite a number someone already typed.
  const handleSelectCountry = (name: string) => {
    setFormCountry(name);
    if (!formPhoneNumber.trim()) {
      const match = countryByName(name);
      if (match) setFormPhoneIso(match.iso);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    const phone = joinPhone(countryByIso(formPhoneIso)?.dial || '', formPhoneNumber);
    const preferences = formPrefs.split(',').map(p => p.trim()).filter(Boolean);

    if (editingId) {
      // Edit: keep journey, documents and travel history untouched.
      saveCustomers(customers.map(c => c.id === editingId ? {
        ...c,
        name: formName.trim(),
        email: formEmail.trim(),
        phone,
        country: formCountry.trim(),
        preferences,
        notes: formNotes,
      } : c));
    } else {
      const newCust: Customer = {
        id: `C-${crypto.randomUUID().slice(0, 8)}`,
        name: formName.trim(),
        email: formEmail.trim(),
        phone,
        country: formCountry.trim(),
        travelHistoryCount: 0,
        preferences,
        documents: [],
        notes: formNotes,
        journey: [
          {
            date: new Date().toISOString().split('T')[0],
            title: 'Account Registered',
            description: 'Client profile initialized in executive CRM portal.'
          }
        ]
      };
      saveCustomers([newCust, ...customers]);
      setSelectedCustomerId(newCust.id);
    }

    setShowForm(false);
    setEditingId(null);
  };

  const executeDeleteCustomer = (id: string) => {
    const updated = customers.filter(c => c.id !== id);
    saveCustomers(updated);

    // If we deleted the currently selected customer, select another
    if (selectedCustomerId === id) {
      if (updated.length > 0) {
        setSelectedCustomerId(updated[0].id);
      } else {
        setSelectedCustomerId(null);
      }
    }
    setDeleteConfirmId(null);
  };

  const handleUpdateNotes = (id: string, notes: string) => {
    const updated = customers.map(c => {
      if (c.id === id) {
        return { ...c, notes };
      }
      return c;
    });
    saveCustomers(updated);
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.phone.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) || filteredCustomers[0];

  useEffect(() => {
    if (filteredCustomers.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(filteredCustomers[0].id);
    }
  }, [filteredCustomers, selectedCustomerId]);

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">Luxury CRM & Client Profiles</h1>
          <p className="text-slate-500 text-sm mt-1 font-semibold">Manage private travelers, luxury expectations, preferences, and historic journals.</p>
        </div>
        <button
          onClick={openCreateForm}
          className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-3 rounded-xl text-sm flex items-center gap-2 transition duration-200 shadow-lg shadow-orange-600/15 cursor-pointer transform hover:-translate-y-0.5"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Onboard Client</span>
        </button>
      </div>

      {/* CRM Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)] lg:h-[calc(100vh-200px)] min-h-[31.25rem] overflow-hidden">
        {/* Left: Customer Directory List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.05, ease: [0.16, 1, 0.3, 1] }} className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col h-full shadow-md overflow-hidden">
          <div className="relative mb-4">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search clients..."
              className="w-full bg-white/50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:border-orange-500 focus:bg-white"
            />
          </div>

          <div className="flex-grow overflow-y-auto space-y-2.5 pr-1">
            {filteredCustomers.length === 0 ? (
              <p className="text-slate-400 text-xs text-center py-8 font-semibold">No matching luxury clients.</p>
            ) : (
              filteredCustomers.map(c => {
                const isSelected = selectedCustomerId === c.id;
                const isVip = c.travelHistoryCount >= 3;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`w-full text-left p-3.5 rounded-xl border flex items-start gap-3 transition-all duration-300 cursor-pointer transform hover:-translate-y-0.5 active:scale-[0.98] ${
                      isSelected
                        ? 'bg-orange-50 border-orange-200 shadow-sm'
                        : 'bg-white/30 border-slate-100 hover:bg-white/80'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-xs shrink-0 ${
                      isVip ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {c.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-grow">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-extrabold text-slate-800 truncate">{c.name}</span>
                        {isVip && (
                          <Star className="w-3.5 h-3.5 text-orange-500 fill-orange-500 shrink-0" />
                        )}
                      </div>
                      <span className="text-[0.625rem] text-slate-500 font-semibold block truncate mt-0.5">{c.email}</span>
                      <div className="flex items-center gap-1.5 mt-2">
                        <span className="text-[0.5625rem] font-mono text-slate-400 font-bold uppercase tracking-wider">{c.id}</span>
                        <span className="text-[0.5625rem] text-slate-300 font-bold">•</span>
                        <span className="text-[0.5625rem] font-bold text-orange-600">{c.travelHistoryCount} journeys</span>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Right: Client Profile Ledger Sheet */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 h-full overflow-y-auto shadow-md">
          <AnimatePresence mode="wait">
            {selectedCustomer ? (
              <motion.div
                key={selectedCustomer.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Profile header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#0b1220] to-orange-500 flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-orange-600/10 border border-white/20">
                      {selectedCustomer.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-extrabold text-slate-900 font-sans">{selectedCustomer.name}</h2>
                        {selectedCustomer.travelHistoryCount >= 3 && (
                          <span className="bg-orange-50 text-orange-600 border border-orange-100 text-[0.5625rem] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg flex items-center gap-1">
                            <Award className="w-3 h-3" />
                            <span>VIP Tier</span>
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-mono text-orange-600 font-bold mt-1 block">Client Account ID: {selectedCustomer.id}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
                    <span className="text-[0.625rem] bg-emerald-50 border border-emerald-100 text-emerald-600 px-2.5 py-1 rounded-lg font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verified HNW</span>
                    </span>
                    <button
                      onClick={() => openEditForm(selectedCustomer)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-100 text-slate-500 hover:text-orange-600 text-xs font-bold transition cursor-pointer active:scale-95"
                      title="Edit Client Profile"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(selectedCustomer.id)}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-600 transition cursor-pointer active:scale-95"
                      title="Delete Client Profile"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Grid details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-white/50 border border-slate-200/60 rounded-xl p-3 flex items-center gap-2.5">
                    <Mail className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-grow">
                      <span className="text-[0.5625rem] text-slate-400 uppercase font-bold tracking-wider">Email</span>
                      <p className="text-xs font-bold text-slate-800 truncate">{selectedCustomer.email}</p>
                    </div>
                  </div>

                  <div className="bg-white/50 border border-slate-200/60 rounded-xl p-3 flex items-center gap-2.5">
                    <Phone className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-grow">
                      <span className="text-[0.5625rem] text-slate-400 uppercase font-bold tracking-wider">Phone</span>
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {selectedCustomer.phone ? (
                          <>
                            {splitPhone(selectedCustomer.phone).iso && (
                              <span className="mr-1">{flagOf(splitPhone(selectedCustomer.phone).iso)}</span>
                            )}
                            {selectedCustomer.phone}
                          </>
                        ) : 'Confidential'}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/50 border border-slate-200/60 rounded-xl p-3 flex items-center gap-2.5">
                    <Globe className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                    <div className="min-w-0 flex-grow">
                      <span className="text-[0.5625rem] text-slate-400 uppercase font-bold tracking-wider">Country</span>
                      <p className="text-xs font-bold text-slate-800 truncate">
                        {countryByName(selectedCustomer.country) && (
                          <span className="mr-1">{flagOf(countryByName(selectedCustomer.country)!.iso)}</span>
                        )}
                        {selectedCustomer.country || 'Not specified'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Preferences */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5 font-sans">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span>Private Travel Preferences</span>
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedCustomer.preferences && selectedCustomer.preferences.length > 0 ? (
                      selectedCustomer.preferences.map((pref, idx) => (
                        <span key={idx} className="bg-orange-50 border border-orange-100 text-orange-600 text-[0.625rem] font-extrabold px-2.5 py-1 rounded-xl">
                          {pref}
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 text-xs font-semibold">No preferences specified.</span>
                    )}
                  </div>
                </div>

                {/* Documents */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5 font-sans">
                    <FileText className="w-4 h-4 text-orange-500" />
                    <span>Confidential Travel Documents</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedCustomer.documents && selectedCustomer.documents.length > 0 ? (
                      selectedCustomer.documents.map((doc, idx) => (
                        <div key={idx} className="bg-white/60 border border-slate-200/80 hover:bg-slate-50 rounded-xl p-3 flex items-center justify-between transition duration-200">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs border border-rose-100">
                              {doc.type}
                            </div>
                            <span className="text-xs font-bold text-slate-800 truncate">{doc.name}</span>
                          </div>
                          <button className="text-[0.625rem] text-orange-600 hover:text-orange-700 font-bold hover:underline">
                            Download
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="bg-white/30 border border-dashed border-slate-200 rounded-xl p-4 text-center sm:col-span-2">
                        <span className="text-slate-400 text-xs font-semibold">No documents uploaded. Securely drag files here.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-widest text-slate-500 flex items-center gap-1.5 font-sans">
                    <ClipboardList className="w-4 h-4 text-emerald-500" />
                    <span>Confidential Guest Relation Notes</span>
                  </h4>
                  <textarea
                    value={selectedCustomer.notes}
                    onChange={e => handleUpdateNotes(selectedCustomer.id, e.target.value)}
                    placeholder="Confidential remarks regarding high net worth travelers..."
                    rows={3}
                    className="w-full bg-white/60 border border-slate-200/80 rounded-xl p-3.5 text-xs text-slate-800 font-semibold focus:outline-none focus:border-orange-500 focus:bg-white leading-relaxed font-sans"
                  />
                </div>

                {/* History Journey Timeline */}
                <div className="space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400">Travel Journey History</h4>
                  <div className="relative pl-6 border-l border-slate-200 space-y-4 ml-2.5">
                    {selectedCustomer.journey && selectedCustomer.journey.map((j, idx) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[1.875rem] top-1.5 w-2 h-2 rounded-full bg-orange-600 ring-4 ring-white shadow" />
                        <div>
                          <span className="text-[0.5625rem] font-mono text-slate-400 font-bold">{j.date}</span>
                          <h5 className="text-xs font-bold text-slate-800 mt-0.5">{j.title}</h5>
                          <p className="text-xs text-slate-500 font-semibold mt-0.5">{j.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            ) : (
              <p className="text-slate-400 text-sm py-16 text-center font-semibold">No luxury traveler selected.</p>
            )}
          </AnimatePresence>
        </motion.div>
      </div>      {/* ─── Onboard Client Modal (Overlay click-to-close & smooth animate) ─── */}
      {createPortal(
        <AnimatePresence>
          {showForm && (
            <div
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-[0.125rem] flex items-center justify-center z-[9999] p-4"
              onClick={() => setShowForm(false)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-2xl max-w-2xl w-full relative max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setShowForm(false)}
                  className="absolute top-5 right-5 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mb-4">
                  {editingId ? <Pencil className="w-5 h-5 text-orange-600" /> : <Users className="w-5 h-5 text-orange-600" />}
                </div>

                <h3 className="text-base font-extrabold text-slate-900 font-sans mb-1">
                  {editingId ? 'Edit Client Profile' : 'Onboard Private Client'}
                </h3>
                <p className="text-slate-450 text-xs font-semibold mb-5">
                  {editingId
                    ? 'Update contact details, preference flags and private logs. Journey history and documents are untouched.'
                    : 'Register a new client profile, set personal preference flags, and save private logs.'}
                </p>

                <form onSubmit={handleSubmitForm} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[0.625rem] font-bold text-slate-500 uppercase">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        placeholder="Lord Sterling Archer"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-orange-500"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[0.625rem] font-bold text-slate-500 uppercase">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={formEmail}
                        onChange={e => setFormEmail(e.target.value)}
                        placeholder="archer@sterlingcorp.co"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Country — drives the dial code below while it is untouched */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[0.625rem] font-bold text-slate-500 uppercase">Country</label>
                      <select
                        value={formCountry}
                        onChange={e => handleSelectCountry(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none cursor-pointer focus:border-orange-500"
                      >
                        <option value="">Not specified</option>
                        {COUNTRIES.map(c => (
                          <option key={c.iso} value={c.name}>{flagOf(c.iso)} {c.name}</option>
                        ))}
                        {/* Keep a legacy free-text country selectable so editing never drops it */}
                        {formCountry && !countryByName(formCountry) && (
                          <option value={formCountry}>{formCountry}</option>
                        )}
                      </select>
                    </div>

                    {/* Phone — dial code picker + national number */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[0.625rem] font-bold text-slate-500 uppercase">Phone Number</label>
                      <div className="flex gap-2">
                        <select
                          value={formPhoneIso}
                          onChange={e => setFormPhoneIso(e.target.value)}
                          aria-label="Phone country code"
                          title={countryByIso(formPhoneIso)?.name || 'No country code'}
                          className="w-24 shrink-0 bg-slate-50 border border-slate-200 rounded-xl px-2 py-2.5 text-xs font-semibold text-slate-855 outline-none cursor-pointer focus:border-orange-500"
                        >
                          <option value="">—</option>
                          {COUNTRIES.map(c => (
                            <option key={c.iso} value={c.iso}>{flagOf(c.iso)} {c.dial}</option>
                          ))}
                        </select>
                        <input
                          type="tel"
                          value={formPhoneNumber}
                          onChange={e => setFormPhoneNumber(e.target.value)}
                          placeholder="331 174 6737"
                          className="flex-1 min-w-0 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-orange-500"
                        />
                      </div>
                      <span className="text-[0.5625rem] font-semibold text-slate-400 mt-0.5">
                        {formPhoneNumber.trim()
                          ? `Saved as ${joinPhone(countryByIso(formPhoneIso)?.dial || '', formPhoneNumber)}`
                          : 'Pick the country code, then type the number.'}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[0.625rem] font-bold text-slate-500 uppercase">Private Preferences (comma separated)</label>
                    <input
                      type="text"
                      value={formPrefs}
                      onChange={e => setFormPrefs(e.target.value)}
                      placeholder="Bentley preferred, Bollinger champagne, Extra pillows"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[0.625rem] font-bold text-slate-500 uppercase">Confidential Notes</label>
                    <textarea
                      value={formNotes}
                      onChange={e => setFormNotes(e.target.value)}
                      placeholder="VIP high net worth client remarks..."
                      rows={3}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer active:scale-95 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-orange-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-orange-700 shadow-md cursor-pointer active:scale-95 transition"
                    >
                      {editingId ? 'Save Changes' : 'Save Client Profile'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Custom Confirm Delete Client Modal (Overlay click-to-close & smooth animate) ─── */}
      {createPortal(
        <AnimatePresence>
          {deleteConfirmId && (
            <div 
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-[0.125rem] flex items-center justify-center z-[9999] p-4"
              onClick={() => setDeleteConfirmId(null)}
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
                <h3 className="font-extrabold text-slate-900 text-base mb-2">Delete Client Profile</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-5">
                  Are you sure you want to delete this client's profile from the central executive CRM logs? This action is permanent.
                </p>
                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => executeDeleteCustomer(deleteConfirmId)}
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
