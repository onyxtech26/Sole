import React, { useState, useEffect } from 'react';
import { Star, Shield, Award, Sparkles, Phone, Globe, AlertCircle, Plus, Search, HelpCircle, Edit, Trash2, X, Users } from 'lucide-react';
import { GuideProfile } from '../types';
import { SEED_GUIDES } from '../utils/seed';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

const GUIDES_STORAGE_KEY = 'sole_guides';

export default function GuidesView() {
  const [guides, setGuides] = useState<GuideProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal Form State (Dual Add / Edit modes)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGuide, setEditingGuide] = useState<GuideProfile | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newLanguages, setNewLanguages] = useState('');
  const [newSkills, setNewSkills] = useState('');
  const [newRating, setNewRating] = useState(5.0);
  const [newImage, setNewImage] = useState('');

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(GUIDES_STORAGE_KEY);
    if (stored) {
      try {
        setGuides(JSON.parse(stored));
      } catch (e) {
        setGuides(SEED_GUIDES);
      }
    } else {
      setGuides(SEED_GUIDES);
      saveGuides(SEED_GUIDES);
    }
  }, []);

  const saveGuides = (list: GuideProfile[]) => {
    setGuides(list);
    localStorage.setItem(GUIDES_STORAGE_KEY, JSON.stringify(list));
  };

  const handleOpenAddModal = () => {
    setEditingGuide(null);
    setNewName('');
    setNewLanguages('English, Italian');
    setNewSkills('Colosseum, Vatican');
    setNewRating(5.0);
    setNewImage('');
    setShowFormModal(true);
  };

  const handleOpenEditModal = (g: GuideProfile) => {
    setEditingGuide(g);
    setNewName(g.name);
    setNewLanguages(g.languages.join(', '));
    setNewSkills(g.skills.join(', '));
    setNewRating(g.performanceRating);
    setNewImage(g.image);
    setShowFormModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const fallbackImage = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=60';
    const finalImage = newImage.trim() || fallbackImage;

    if (editingGuide) {
      // Edit mode
      const updated = guides.map(g => {
        if (g.id === editingGuide.id) {
          return {
            ...g,
            name: newName,
            languages: newLanguages.split(',').map(l => l.trim()).filter(Boolean),
            skills: newSkills.split(',').map(s => s.trim()).filter(Boolean),
            performanceRating: Number(newRating) || 5.0,
            image: finalImage
          };
        }
        return g;
      });
      saveGuides(updated);
    } else {
      // Add mode
      const newG: GuideProfile = {
        id: `G-${200 + guides.length + 1}`,
        name: newName,
        languages: newLanguages.split(',').map(l => l.trim()).filter(Boolean),
        skills: newSkills.split(',').map(s => s.trim()).filter(Boolean),
        performanceRating: Number(newRating) || 5.0,
        availability: 'Active',
        image: finalImage
      };
      const updated = [...guides, newG];
      saveGuides(updated);
    }

    setShowFormModal(false);
    setEditingGuide(null);
  };

  const executeDeleteGuide = (id: string) => {
    const updated = guides.filter(g => g.id !== id);
    saveGuides(updated);
    setDeleteConfirmId(null);
  };

  const toggleAvailability = (id: string, availability: GuideProfile['availability']) => {
    const updated = guides.map(g => {
      if (g.id === id) {
        return { ...g, availability };
      }
      return g;
    });
    saveGuides(updated);
  };

  const filteredGuides = guides.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.languages.some(l => l.toLowerCase().includes(searchQuery.toLowerCase())) ||
    g.skills.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">Luxury Guides & Staff Directory</h1>
          <p className="text-slate-500 text-sm mt-1 font-semibold">Onboard high-end multilingual lecturers, schedule VIP escorts, and track guest ratings.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm flex items-center gap-2 transition duration-200 shadow-lg shadow-indigo-600/15 cursor-pointer transform hover:-translate-y-0.5"
        >
          <Plus className="w-4 h-4" />
          <span>Onboard VIP Guide</span>
        </button>
      </div>

      {/* Guide Filtering Controls */}
      <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-4 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl shadow-black/[0.01]">
        <div className="relative flex-grow w-full md:max-w-md">
          <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, languages, or specialized skills..."
            className="w-full bg-white/50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-3 text-sm text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
        <div className="text-[10px] bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg border border-indigo-100 font-bold uppercase flex items-center gap-1.5 select-none shrink-0 self-start md:self-auto">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Lecturers verified with Academic degrees</span>
        </div>
      </div>

      {/* Guide Cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGuides.map(g => {
          const isActive = g.availability === 'Active';
          const isBreak = g.availability === 'On Break';

          return (
            <div key={g.id} className="relative group overflow-hidden bg-white/40 border border-slate-200/80 hover:border-indigo-500/30 rounded-2xl p-5 backdrop-blur-xl flex flex-col justify-between transition-all duration-350 hover:-translate-y-1 hover:shadow-xl">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />

              <div>
                {/* Upper row: Avatar & basic metadata */}
                <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                    <img
                      src={g.image}
                      alt={g.name}
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400">{g.id}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditModal(g)}
                          className="p-1 rounded bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                          title="Edit Guide Details"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(g.id)}
                          className="p-1 rounded bg-slate-100 hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                          title="Remove Guide Profile"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 truncate mt-0.5 font-sans">{g.name}</h4>
                  </div>
                </div>

                {/* Rating & Languages */}
                <div className="mt-4 space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-500 font-semibold">
                    <span className="font-bold uppercase tracking-wider text-[9px] text-slate-400 font-sans">Rating Scale</span>
                    <div className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                      <span className="font-bold text-slate-700">{g.performanceRating.toFixed(1)}</span>
                      <span className="text-slate-400 font-medium">/ 5.0</span>
                    </div>
                  </div>

                  <div>
                    <span className="font-bold uppercase tracking-wider text-[9px] text-slate-400 block mb-1.5 font-sans">Fluent Languages</span>
                    <div className="flex flex-wrap gap-1.5">
                      {g.languages.map((lang, idx) => (
                        <span key={idx} className="bg-white text-slate-600 border border-slate-200/80 text-[9px] font-bold px-2 py-0.5 rounded">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <span className="font-bold uppercase tracking-wider text-[9px] text-slate-400 block mb-1.5 font-sans">Expert Specialty / Skills</span>
                    <div className="flex flex-wrap gap-1.5">
                      {g.skills.map((skill, idx) => (
                        <span key={idx} className="bg-indigo-50 text-indigo-600 text-[9px] font-bold px-2 py-0.5 rounded border border-indigo-100">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Lower Actions panel */}
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
                <span className="text-[9px] text-slate-400 font-black tracking-wider font-sans">AVAILABILITY</span>
                <div className="flex gap-1">
                  <button
                    onClick={() => toggleAvailability(g.id, 'Active')}
                    className={`text-[8px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg border transition duration-200 cursor-pointer ${
                      isActive ? 'bg-emerald-50 border-emerald-200 text-emerald-600 font-bold' : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-805'
                    }`}
                  >
                    Active
                  </button>
                  <button
                    onClick={() => toggleAvailability(g.id, 'On Break')}
                    className={`text-[8px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg border transition duration-200 cursor-pointer ${
                      isBreak ? 'bg-amber-50 border-amber-200 text-amber-600 font-bold' : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-805'
                    }`}
                  >
                    Break
                  </button>
                  <button
                    onClick={() => toggleAvailability(g.id, 'Unavailable')}
                    className={`text-[8px] font-black uppercase tracking-widest px-2 py-1.5 rounded-lg border transition duration-200 cursor-pointer ${
                      g.availability === 'Unavailable' ? 'bg-rose-50 border-rose-200 text-rose-600 font-bold' : 'bg-slate-50 border-slate-100 text-slate-400 hover:text-slate-805'
                    }`}
                  >
                    Hold
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Onboard / Edit Guide Modal (Overlay click-to-close & smooth animate) ─── */}
      {createPortal(
        <AnimatePresence>
          {showFormModal && (
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
              onClick={() => {
                setShowFormModal(false);
                setEditingGuide(null);
              }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-2xl max-w-sm w-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => {
                    setShowFormModal(false);
                    setEditingGuide(null);
                  }}
                  className="absolute top-5 right-5 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
                  <Users className="w-5 h-5 text-indigo-600" />
                </div>

                <h3 className="text-base font-extrabold text-slate-900 font-sans mb-1">
                  {editingGuide ? 'Modify Guide Record' : 'Onboard VIP Guide / Staff'}
                </h3>
                <p className="text-slate-450 text-xs font-semibold mb-5">
                  {editingGuide ? 'Modify languages, specialty fields, and review ratings.' : 'Register a new professional tour guide in the Sole directory.'}
                </p>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Guide Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="e.g. Dr. Sofia Loren"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Fluent Languages (comma separated)</label>
                    <input
                      type="text"
                      value={newLanguages}
                      onChange={e => setNewLanguages(e.target.value)}
                      placeholder="Italian, English, Spanish"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Expert Specialty / Skills</label>
                    <input
                      type="text"
                      value={newSkills}
                      onChange={e => setNewSkills(e.target.value)}
                      placeholder="Vatican, Colosseum, Archaeology"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Rating (1-5)</label>
                      <input
                        type="number"
                        step="0.1"
                        min="1"
                        max="5"
                        value={newRating}
                        onChange={e => setNewRating(parseFloat(e.target.value) || 5.0)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Guide Photo URL</label>
                      <input
                        type="text"
                        value={newImage}
                        onChange={e => setNewImage(e.target.value)}
                        placeholder="Paste image URL here"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFormModal(false);
                        setEditingGuide(null);
                      }}
                      className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer active:scale-95 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md cursor-pointer active:scale-95 transition"
                    >
                      {editingGuide ? 'Save Changes' : 'Register Lecturer'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Custom Confirm Delete Guide Modal (Overlay click-to-close & smooth animate) ─── */}
      {createPortal(
        <AnimatePresence>
          {deleteConfirmId && (
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
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
                <h3 className="font-extrabold text-slate-900 text-base mb-2">Delete Guide Profile</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-5">
                  Are you sure you want to remove guide <span className="font-mono text-indigo-600 font-extrabold">{deleteConfirmId}</span> from the active guides directory?
                </p>
                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="bg-slate-50 border border-slate-200/80 text-slate-655 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => executeDeleteGuide(deleteConfirmId)}
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
