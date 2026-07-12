import React, { useState, useEffect } from 'react';
import { Car, User, Settings, AlertTriangle, CheckCircle2, ShieldCheck, Plus, Wrench, Search, Users, Edit, Trash2, X } from 'lucide-react';
import { Vehicle } from '../types';
import { SEED_VEHICLES } from '../utils/seed';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';

const VEHICLES_STORAGE_KEY = 'sole_vehicles';

export default function VehiclesView() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal Form State (Dual Add / Edit modes)
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState('');
  const [newCapacity, setNewCapacity] = useState(4);
  const [newDriver, setNewDriver] = useState('');
  const [newPlate, setNewPlate] = useState('');
  const [newImage, setNewImage] = useState('');

  // Delete confirm state
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(VEHICLES_STORAGE_KEY);
    if (stored) {
      try {
        setVehicles(JSON.parse(stored));
      } catch (e) {
        setVehicles(SEED_VEHICLES);
      }
    } else {
      setVehicles(SEED_VEHICLES);
      localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(SEED_VEHICLES));
    }
  }, []);

  const saveVehicles = (list: Vehicle[]) => {
    setVehicles(list);
    localStorage.setItem(VEHICLES_STORAGE_KEY, JSON.stringify(list));
  };

  const handleOpenAddModal = () => {
    setEditingVehicle(null);
    setNewName('');
    setNewType('Mercedes S-Class');
    setNewCapacity(4);
    setNewDriver('');
    setNewPlate('');
    setNewImage('');
    setShowFormModal(true);
  };

  const handleOpenEditModal = (v: Vehicle) => {
    setEditingVehicle(v);
    setNewName(v.name);
    setNewType(v.type);
    setNewCapacity(v.capacity);
    setNewDriver(v.driverName);
    setNewPlate(v.licensePlate);
    setNewImage(v.image);
    setShowFormModal(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPlate || !newType) {
      alert("Please fill in all required fields.");
      return;
    }

    const fallbackImage = 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=300&auto=format&fit=crop&q=60';
    const finalImage = newImage.trim() || fallbackImage;

    if (editingVehicle) {
      // Edit mode
      const updated = vehicles.map(v => {
        if (v.id === editingVehicle.id) {
          return {
            ...v,
            name: newName,
            type: newType as any,
            capacity: newCapacity,
            driverName: newDriver || 'Unassigned Driver',
            licensePlate: newPlate,
            image: finalImage
          };
        }
        return v;
      });
      saveVehicles(updated);
    } else {
      // Add mode
      const newVeh: Vehicle = {
        id: `V-${100 + vehicles.length + 1}`,
        name: newName,
        type: newType as any,
        capacity: newCapacity || 4,
        driverName: newDriver || 'Unassigned Driver',
        availability: 'Available',
        maintenanceStatus: 'Excellent',
        licensePlate: newPlate,
        image: finalImage
      };
      const updated = [...vehicles, newVeh];
      saveVehicles(updated);
    }

    setShowFormModal(false);
    setEditingVehicle(null);
  };

  const executeDeleteVehicle = (id: string) => {
    const updated = vehicles.filter(v => v.id !== id);
    saveVehicles(updated);
    setDeleteConfirmId(null);
  };

  const toggleAvailability = (id: string, nextStatus: Vehicle['availability']) => {
    const updated = vehicles.map(v => {
      if (v.id === id) {
        return { ...v, availability: nextStatus };
      }
      return v;
    });
    saveVehicles(updated);
  };

  const toggleMaintenance = (id: string, nextStatus: Vehicle['maintenanceStatus']) => {
    const updated = vehicles.map(v => {
      if (v.id === id) {
        return { ...v, maintenanceStatus: nextStatus };
      }
      return v;
    });
    saveVehicles(updated);
  };

  const filteredVehicles = vehicles.filter(v => 
    v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.driverName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.licensePlate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fleet Statistics
  const totalFleetCount = vehicles.length;
  const availableCount = vehicles.filter(v => v.availability === 'Available').length;
  const maintenanceCount = vehicles.filter(v => v.availability === 'Maintenance' || v.maintenanceStatus === 'Service Required').length;
  const activeTourCount = vehicles.filter(v => v.availability === 'On Tour').length;

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">VIP Fleet & Vehicles Management</h1>
          <p className="text-slate-500 text-sm mt-1 font-semibold">Dispatch private luxury cars, schedule routine service checks, and manage elite drivers.</p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-5 py-3 rounded-xl text-sm flex items-center gap-2 transition duration-200 shadow-lg shadow-indigo-600/15 cursor-pointer transform hover:-translate-y-0.5"
        >
          <Plus className="w-4.5 h-4.5" />
          <span>Add Fleet Vehicle</span>
        </button>
      </div>

      {/* Fleet Stats Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl shadow-black/[0.01]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block font-sans">Total Active Fleet</span>
          <div className="flex justify-between items-end mt-2">
            <h3 className="text-3xl font-black text-slate-900">{totalFleetCount}</h3>
            <Car className="w-5 h-5 text-indigo-500" />
          </div>
          <span className="text-[10px] text-slate-400 block mt-2 font-semibold">Premium security cleared cars</span>
        </div>

        <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl shadow-black/[0.01]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block font-sans">Ready For Dispatch</span>
          <div className="flex justify-between items-end mt-2">
            <h3 className="text-3xl font-black text-emerald-600">{availableCount}</h3>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <span className="text-[10px] text-slate-400 block mt-2 font-semibold">Valeted, fully fueled, and available</span>
        </div>

        <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl shadow-black/[0.01]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block font-sans">Currently On Tour</span>
          <div className="flex justify-between items-end mt-2">
            <h3 className="text-3xl font-black text-indigo-600">{activeTourCount}</h3>
            <Users className="w-5 h-5 text-indigo-500" />
          </div>
          <span className="text-[10px] text-slate-400 block mt-2 font-semibold">Active VIP transfers in progress</span>
        </div>

        <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-5 backdrop-blur-xl shadow-xl shadow-black/[0.01]">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block font-sans">Maintenance & Repairs</span>
          <div className="flex justify-between items-end mt-2">
            <h3 className="text-3xl font-black text-rose-500">{maintenanceCount}</h3>
            <Wrench className="w-5 h-5 text-rose-500" />
          </div>
          <span className="text-[10px] text-slate-400 block mt-2 font-semibold">Scheduled garage appointments</span>
        </div>
      </div>

      {/* Fleet Search Bar */}
      <div className="bg-white/40 border border-slate-200/80 rounded-2xl p-4 backdrop-blur-xl flex items-center justify-between gap-4 shadow-xl shadow-black/[0.01]">
        <div className="relative flex-grow max-w-md">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search fleet by driver, plate or model..."
            className="w-full bg-white/50 border border-slate-200/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 font-semibold placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white"
          />
        </div>
        <span className="text-[10px] font-mono text-slate-400 uppercase font-extrabold">Secure AVL GPS Tracking Active</span>
      </div>

      {/* Fleet Grid cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredVehicles.map(v => {
          const isAvailable = v.availability === 'Available';
          const isTour = v.availability === 'On Tour';
          const isMaintenance = v.availability === 'Maintenance' || v.maintenanceStatus === 'Service Required';

          return (
            <div key={v.id} className="bg-white/40 border border-slate-200/80 rounded-2xl overflow-hidden backdrop-blur-xl flex flex-col sm:flex-row shadow-xl shadow-black/[0.01] hover:shadow-2xl transition duration-300 relative group">
              {/* Left Side: Vehicle Luxury image */}
              <div className="sm:w-44 h-48 sm:h-auto relative bg-slate-50 flex-shrink-0">
                <img
                  src={v.image}
                  alt={v.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute top-2 left-2 bg-white/85 backdrop-blur-md border border-slate-200/40 px-2 py-0.5 rounded-lg text-[9px] font-mono font-black text-slate-700">
                  {v.id}
                </div>
              </div>

              {/* Right Side: Vehicle metadata */}
              <div className="flex-grow p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-900 font-sans">{v.name}</h4>
                      <span className="text-[11px] text-slate-500 mt-0.5 block font-semibold">{v.type} • {v.capacity} PAX Max</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        onClick={() => handleOpenEditModal(v)}
                        className="p-1 rounded bg-slate-100 hover:bg-indigo-50 border border-slate-200 text-slate-500 hover:text-indigo-600 transition cursor-pointer"
                        title="Edit Vehicle Specs"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(v.id)}
                        className="p-1 rounded bg-slate-100 hover:bg-rose-50 border border-slate-200 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                        title="Delete Vehicle Asset"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Plates and drivers */}
                  <div className="grid grid-cols-2 gap-3.5 mt-4">
                    <div className="bg-white/50 border border-slate-200/60 rounded-xl p-2.5">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">License Plate</span>
                      <span className="text-xs font-mono font-extrabold text-slate-800 mt-0.5 block">{v.licensePlate}</span>
                    </div>
                    <div className="bg-white/50 border border-slate-200/60 rounded-xl p-2.5">
                      <span className="text-[9px] text-slate-400 uppercase font-bold tracking-wider block">Assigned Driver</span>
                      <span className="text-xs font-extrabold text-indigo-600 mt-0.5 block truncate flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{v.driverName}</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lower Action buttons */}
                <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-1.5 font-bold">
                    <span className="text-[10px] text-slate-400 font-extrabold uppercase">Status:</span>
                    <span className={`text-[10px] font-black flex items-center gap-1 ${
                      v.maintenanceStatus === 'Excellent' ? 'text-emerald-600' : 'text-indigo-600'
                    }`}>
                      {v.maintenanceStatus === 'Excellent' ? <ShieldCheck className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5 animate-spin-slow" />}
                      <span>{v.maintenanceStatus}</span>
                    </span>
                  </div>

                  {/* Status controller selectors */}
                  <div className="flex gap-1.5 w-full sm:w-auto">
                    <button
                      onClick={() => toggleAvailability(v.id, 'Available')}
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-1.5 rounded-lg border transition duration-200 cursor-pointer ${
                        isAvailable ? 'bg-emerald-50 border-emerald-200 text-emerald-600 font-bold' : 'bg-slate-50 border-slate-100 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Available
                    </button>
                    <button
                      onClick={() => toggleAvailability(v.id, 'On Tour')}
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-1.5 rounded-lg border transition duration-200 cursor-pointer ${
                        isTour ? 'bg-indigo-50 border-indigo-200 text-indigo-600 font-bold' : 'bg-slate-50 border-slate-100 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      On Tour
                    </button>
                    <button
                      onClick={() => {
                        toggleAvailability(v.id, 'Maintenance');
                        toggleMaintenance(v.id, 'Service Required');
                      }}
                      className={`text-[9px] font-black uppercase tracking-wider px-2 py-1.5 rounded-lg border transition duration-200 cursor-pointer ${
                        isMaintenance ? 'bg-rose-50 border-rose-200 text-rose-600 font-bold' : 'bg-slate-50 border-slate-100 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      Service
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>      {/* ─── Onboard / Edit Vehicle Modal (Overlay click-to-close & smooth animate) ─── */}
      {createPortal(
        <AnimatePresence>
          {showFormModal && (
            <div 
              className="fixed inset-0 bg-slate-955/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
              onClick={() => {
                setShowFormModal(false);
                setEditingVehicle(null);
              }}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-2xl max-w-md w-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <button 
                  onClick={() => {
                    setShowFormModal(false);
                    setEditingVehicle(null);
                  }}
                  className="absolute top-5 right-5 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
                  <Car className="w-5 h-5 text-indigo-600" />
                </div>

                <h3 className="text-base font-extrabold text-slate-900 font-sans mb-1">
                  {editingVehicle ? 'Edit Fleet Luxury Vehicle' : 'Onboard Fleet Luxury Vehicle'}
                </h3>
                <p className="text-slate-450 text-xs font-semibold mb-5">
                  {editingVehicle ? 'Modify registry data and driver pilot assignment details.' : 'Register a new luxury cruiser or van asset in the Sole fleet database.'}
                </p>

                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vehicle Name *</label>
                    <input
                      type="text"
                      required
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                      placeholder="e.g. Rome Ambassador 1"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Class/Type Model *</label>
                      <input
                        type="text"
                        required
                        value={newType}
                        onChange={e => setNewType(e.target.value)}
                        placeholder="e.g. Mercedes V-Class"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">PAX Capacity</label>
                      <input
                        type="number"
                        min={1}
                        value={newCapacity}
                        onChange={e => setNewCapacity(parseInt(e.target.value, 10) || 1)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assigned Driver</label>
                      <input
                        type="text"
                        value={newDriver}
                        onChange={e => setNewDriver(e.target.value)}
                        placeholder="e.g. Marcello Rossi"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">License Plate *</label>
                      <input
                        type="text"
                        required
                        value={newPlate}
                        onChange={e => setNewPlate(e.target.value)}
                        placeholder="e.g. ROM-344-XP"
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-indigo-500 focus:bg-white"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vehicle Image URL</label>
                    <input
                      type="text"
                      value={newImage}
                      onChange={e => setNewImage(e.target.value)}
                      placeholder="https://images.unsplash.com/... or local path"
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-855 outline-none focus:border-indigo-500 focus:bg-white"
                    />
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFormModal(false);
                        setEditingVehicle(null);
                      }}
                      className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer active:scale-95 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md cursor-pointer active:scale-95 transition"
                    >
                      {editingVehicle ? 'Update Vehicle' : 'Register Asset'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Custom Confirm Delete Vehicle Modal (Overlay click-to-close & smooth animate) ─── */}
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
                <h3 className="font-extrabold text-slate-900 text-base mb-2">Delete Vehicle Asset</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-5">
                  Are you sure you want to retire this vehicle asset <span className="font-mono text-indigo-600 font-extrabold">{deleteConfirmId}</span> from your central fleet inventory database?
                </p>
                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="bg-slate-50 border border-slate-200/80 text-slate-605 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => executeDeleteVehicle(deleteConfirmId)}
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
