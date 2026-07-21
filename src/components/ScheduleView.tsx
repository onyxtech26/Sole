import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Users, Plus, Trash2, Edit, Send, Printer, ShieldAlert, Sparkles, CheckSquare, Search, MessageSquare, AlertTriangle, AlertCircle, Clock, ChevronRight, X } from 'lucide-react';
import { Booking, User, GuideProfile } from '../types';
import { getRelativeDateString } from '../utils/seed';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import DateRangeFilter from './DateRangeFilter';
import { DateRange, makeRange, inRange, toDateStr } from '../utils/dateFilter';
import { loadWhatsappTemplates, saveWhatsappTemplates, fillTemplate, WhatsappTemplate } from '../utils/whatsappTemplates';
import WhatsappTemplateManager from './WhatsappTemplateManager';
import { createPortal } from 'react-dom';

interface ScheduleViewProps {
  bookings: Booking[];
  currentUser: User;
  onUpdateBookings: (newBookings: Booking[]) => void;
}

interface TourGroup {
  id: string;
  serviceDate: string; // YYYY-MM-DD
  tourName: string;
  productCode: string;
  productOptionCode: string; // TG1 | TG2 | TG3
  departureTime: string; // HH:MM
  ticketTime: string; // HH:MM
  ticketStatus: string; // e.g. "Ticket done 9:45"
  guideName: string | null;
  capacity: number;
  notes: string;
  travelerIds: string[]; // List of traveler IDs assigned: "${bookingRef}-${index}"
}

const TOUR_PRODUCTS = [
  { code: '5524558P4', name: "Private Colosseo", defaultCap: 7, label: "Private Colosseum Tour" },
  { code: '5524558P1', name: "Colosseo guide", defaultCap: 24, label: "Group Colosseum Tour" },
  { code: '5524558P19', name: "Walking Highlights", defaultCap: 7, label: "Walking Tour" },
  { code: '5524558P2', name: "Golf Cart Rome", defaultCap: 7, label: "Golf Cart Tour" },
  { code: '5524558P10', name: "Famagusta Tour", defaultCap: 7, label: "Private Cyprus Tour" },
  { code: '5524558P18', name: "Rome Photo Shoot", defaultCap: 5, label: "Professional Photo Shoot" },
  { code: '5524558P3', name: "Vatican Museum", defaultCap: 24, label: "Vatican Tour" }
];

// Flattened per-guest row used across the dispatch board and traveler cards.
interface DayTraveler {
  id: string; // "${bookingRef}-${index}"
  name: string;
  bookingRef: string;
  leadTraveler: string;
  tourTime: string;
  travelDate: string;
  phone: string;
  language: string;
  tourName: string;
  productCode: string;
  notes: string;
  isLead: boolean;
  paxCount: Booking['paxCount'];
}

export default function ScheduleView({ bookings, currentUser, onUpdateBookings }: ScheduleViewProps) {
  // 1. Initial State
  // Date scope for the board: Today / Week / Month / Year (+ All). Defaults to Today.
  const [range, setRange] = useState<DateRange>(() => makeRange('today', new Date()));
  const [showAll, setShowAll] = useState(false);

  // Concrete anchor date used when creating brand-new groups / naming exports.
  const anchorDateStr = toDateStr(range.start);
  const matchesScope = (dateStr: string) => showAll || inRange(dateStr, range);

  // Editable WhatsApp templates (persisted).
  const [templates, setTemplates] = useState<WhatsappTemplate[]>(() => loadWhatsappTemplates());
  const [showTemplateManager, setShowTemplateManager] = useState(false);

  const [groups, setGroups] = useState<TourGroup[]>(() => {
    const stored = localStorage.getItem('sole_schedule_groups');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [radarOpen, setRadarOpen] = useState(true);

  // Modals state
  const [editingGroup, setEditingGroup] = useState<TourGroup | null>(null);
  const [whatsappComposer, setWhatsappComposer] = useState<{
    travelerId: string;
    booking: Booking;
    travelerName: string;
    travelerIndex: number;
    templateId: string;
    lang: 'en' | 'es' | 'it';
    editedText: string;
  } | null>(null);
  
  // Custom dialogs state
  const [deleteGroupConfirmId, setDeleteGroupConfirmId] = useState<string | null>(null);
  const [showAutoGroupConfirm, setShowAutoGroupConfirm] = useState(false);

  // Persist groups state
  useEffect(() => {
    localStorage.setItem('sole_schedule_groups', JSON.stringify(groups));
  }, [groups]);

  // Persist templates whenever they change
  useEffect(() => {
    saveWhatsappTemplates(templates);
  }, [templates]);

  // 2. Computed Data
  const dayBookings = useMemo(() => {
    return bookings.filter(b => matchesScope(b.travelDate) && b.status !== 'Cancelled');
  }, [bookings, range, showAll]);

  const dayTravelers = useMemo(() => {
    const list: DayTraveler[] = [];

    dayBookings.forEach(b => {
      const guests = b.travelers && b.travelers.length > 0 ? b.travelers : [b.leadTraveler];
      guests.forEach((tName, idx) => {
        list.push({
          id: `${b.bookingRef}-${idx}`,
          name: tName,
          bookingRef: b.bookingRef,
          leadTraveler: b.leadTraveler,
          tourTime: b.tourTime,
          travelDate: b.travelDate,
          phone: b.phone,
          language: b.language,
          tourName: b.tourName,
          productCode: b.productCode,
          notes: b.notes || '',
          isLead: idx === 0,
          paxCount: b.paxCount
        });
      });
    });

    return list;
  }, [dayBookings]);

  const dayGroups = useMemo(() => {
    return groups.filter(g => matchesScope(g.serviceDate));
  }, [groups, range, showAll]);

  const assignedTravelerIds = useMemo(() => {
    const ids = new Set<string>();
    dayGroups.forEach(g => {
      g.travelerIds.forEach(tid => ids.add(tid));
    });
    return ids;
  }, [dayGroups]);

  const unassignedTravelers = useMemo(() => {
    return dayTravelers.filter(t => !assignedTravelerIds.has(t.id));
  }, [dayTravelers, assignedTravelerIds]);

  const filteredUnassigned = useMemo(() => {
    if (!searchQuery.trim()) return unassignedTravelers;
    const q = searchQuery.toLowerCase().trim();
    return unassignedTravelers.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.bookingRef.toLowerCase().includes(q)
    );
  }, [unassignedTravelers, searchQuery]);

  const getBookingSplitDetails = (bookingRef: string) => {
    const bookingTravelers = dayTravelers.filter(t => t.bookingRef === bookingRef);
    if (bookingTravelers.length <= 1) return null;

    const groupDistribution: Record<string, string[]> = {};
    let unassignedNames: string[] = [];

    bookingTravelers.forEach(t => {
      const assignedGroup = dayGroups.find(g => g.travelerIds.includes(t.id));
      if (assignedGroup) {
        const key = `${assignedGroup.tourName} (${assignedGroup.departureTime})`;
        if (!groupDistribution[key]) groupDistribution[key] = [];
        groupDistribution[key].push(t.name);
      } else {
        unassignedNames.push(t.name);
      }
    });

    const activeGroupsCount = Object.keys(groupDistribution).length;
    const isSplit = (activeGroupsCount > 1) || (activeGroupsCount === 1 && unassignedNames.length > 0);

    if (!isSplit) return null;

    return {
      distribution: groupDistribution,
      unassigned: unassignedNames,
      totalCount: bookingTravelers.length
    };
  };

  // 3. Handlers & Operations
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData("text/plain", id);
    setActiveDragId(id);
  };

  const handleDragEnd = () => {
    setActiveDragId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetGroupId: string | null) => {
    e.preventDefault();
    const travelerId = e.dataTransfer.getData("text/plain");
    if (!travelerId) return;

    setGroups(prevGroups => {
      const cleanedGroups = prevGroups.map(g => {
        if (matchesScope(g.serviceDate)) {
          return { ...g, travelerIds: g.travelerIds.filter(tid => tid !== travelerId) };
        }
        return g;
      });

      if (targetGroupId !== null) {
        return cleanedGroups.map(g => {
          if (g.id === targetGroupId) {
            const nextIds = g.travelerIds.includes(travelerId) 
              ? g.travelerIds 
              : [...g.travelerIds, travelerId];
            return { ...g, travelerIds: nextIds };
          }
          return g;
        });
      }

      return cleanedGroups;
    });

    setActiveDragId(null);
  };

  const handleAddGroup = () => {
    const defaultProduct = TOUR_PRODUCTS[0];
    const newGroup: TourGroup = {
      id: `group-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      serviceDate: anchorDateStr,
      tourName: defaultProduct.label,
      productCode: defaultProduct.code,
      productOptionCode: 'TG1',
      departureTime: '09:00',
      ticketTime: '09:30',
      ticketStatus: 'Pending',
      guideName: null,
      capacity: defaultProduct.defaultCap,
      notes: '',
      travelerIds: []
    };
    setGroups(prev => [...prev, newGroup]);
  };

  const handleDeleteGroup = (groupId: string) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
    setDeleteGroupConfirmId(null);
  };

  const handleSaveGroupSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;

    setGroups(prev => prev.map(g => g.id === editingGroup.id ? editingGroup : g));
    setEditingGroup(null);
  };

  const handleToggleNamesLocked = (bookingRef: string) => {
    const nextBookings = bookings.map(b => {
      if (b.bookingRef === bookingRef) {
        return { ...b, namesLocked: !b.namesLocked };
      }
      return b;
    });
    onUpdateBookings(nextBookings);
  };

  const executeAutoGroup = () => {
    if (unassignedTravelers.length === 0) return;

    const partiesMap: Record<string, typeof unassignedTravelers> = {};
    unassignedTravelers.forEach(t => {
      if (!partiesMap[t.bookingRef]) partiesMap[t.bookingRef] = [];
      partiesMap[t.bookingRef].push(t);
    });

    const parties = Object.keys(partiesMap).map(ref => ({
      bookingRef: ref,
      members: partiesMap[ref],
      productCode: partiesMap[ref][0].productCode,
      language: partiesMap[ref][0].language,
      tourName: partiesMap[ref][0].tourName,
      tourTime: partiesMap[ref][0].tourTime,
      travelDate: partiesMap[ref][0].travelDate
    })).sort((a, b) => b.members.length - a.members.length);

    const newGroups: TourGroup[] = [...groups];

    parties.forEach(party => {
      const product = TOUR_PRODUCTS.find(p => p.code === party.productCode) || TOUR_PRODUCTS[0];
      const defaultCap = product.defaultCap;

      let targetGroup = newGroups.find(g =>
        g.serviceDate === party.travelDate &&
        g.productCode === party.productCode &&
        g.notes.includes(`Lang: ${party.language}`) &&
        (g.travelerIds.length + party.members.length) <= g.capacity
      );

      if (!targetGroup) {
        const groupIndex = newGroups.filter(g => g.serviceDate === party.travelDate).length + 1;
        targetGroup = {
          id: `group-auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          serviceDate: party.travelDate,
          tourName: product.label,
          productCode: party.productCode,
          productOptionCode: 'TG1',
          departureTime: party.tourTime,
          ticketTime: party.tourTime,
          ticketStatus: 'Pending',
          guideName: null,
          capacity: defaultCap,
          notes: `Auto-created Group ${groupIndex} | Lang: ${party.language}`,
          travelerIds: []
        };
        newGroups.push(targetGroup);
      }

      targetGroup.travelerIds.push(...party.members.map(m => m.id));
    });

    setGroups(newGroups);
    setShowAutoGroupConfirm(false);
  };

  const buildTemplateVars = (b: Booking): Record<string, string> => ({
    leadTraveler: b.leadTraveler,
    tourName: b.tourName,
    bookingRef: b.bookingRef,
    travelDate: b.travelDate,
    tourTime: b.tourTime,
    meetingPoint: b.meetingPoint || 'Colosseum Kiosk'
  });

  const handleOpenWhatsAppComposer = (tId: string) => {
    const t = dayTravelers.find(x => x.id === tId);
    if (!t) return;
    const b = bookings.find(x => x.bookingRef === t.bookingRef);
    if (!b) return;
    if (templates.length === 0) {
      alert('No message templates available. Add one from "Manage Templates" first.');
      return;
    }

    const tIdx = Number(tId.split('-')[1]);
    const tpl = templates[0];
    const text = fillTemplate(tpl.en, buildTemplateVars(b));

    setWhatsappComposer({
      travelerId: tId,
      booking: b,
      travelerName: t.name,
      travelerIndex: tIdx,
      templateId: tpl.id,
      lang: 'en',
      editedText: text
    });
  };

  const handleTemplateOrLangChange = (id: string, lang: 'en' | 'es' | 'it') => {
    if (!whatsappComposer) return;
    const b = whatsappComposer.booking;
    const tpl = templates.find(x => x.id === id) || templates[0];
    if (!tpl) return;
    const rawTemplate = tpl[lang] || tpl.en;
    const text = fillTemplate(rawTemplate, buildTemplateVars(b));

    setWhatsappComposer(prev => prev ? {
      ...prev,
      templateId: id,
      lang,
      editedText: text
    } : null);
  };

  const handleLaunchWhatsApp = () => {
    if (!whatsappComposer) return;
    const phoneClean = whatsappComposer.booking.phone.replace(/[^0-9+]/g, '');
    if (!phoneClean) {
      alert("No valid phone number found for this booking.");
      return;
    }
    
    const nextBookings = bookings.map(b => {
      if (b.bookingRef === whatsappComposer.booking.bookingRef) {
        let nextStatus: Booking['status'] = b.status;
        if (whatsappComposer.templateId === 'confirm') nextStatus = 'Confirmed';
        return { ...b, status: nextStatus, okStatus: nextStatus === 'Confirmed' };
      }
      return b;
    });
    onUpdateBookings(nextBookings);

    const url = `https://wa.me/${phoneClean.startsWith('+') ? phoneClean.substring(1) : phoneClean}?text=${encodeURIComponent(whatsappComposer.editedText)}`;
    window.open(url, '_blank');
    setWhatsappComposer(null);
  };

  const deadlineAlerts = useMemo(() => {
    const alerts: {
      bookingRef: string;
      leadTraveler: string;
      message: string;
      type: 'radar-severe' | 'radar-warn' | 'radar-info';
      namesLocked?: boolean;
    }[] = [];

    const today = new Date();

    dayBookings.forEach(b => {
      const travelDateObj = new Date(b.travelDate);
      const diffTime = travelDateObj.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const hasMissingNames = b.travelers.some(t => !t.trim() || t.includes('Traveler'));
      if (diffDays <= 7 && diffDays >= 0 && hasMissingNames) {
        alerts.push({
          bookingRef: b.bookingRef,
          leadTraveler: b.leadTraveler,
          message: `🚨 Name Lock in ${diffDays} day(s)! Guest names must match passport ID. Incomplete names found.`,
          type: diffDays <= 2 ? 'radar-severe' : 'radar-warn',
          namesLocked: !!b.namesLocked
        });
      }

      if (diffDays <= 30 && diffDays > 0) {
        alerts.push({
          bookingRef: b.bookingRef,
          leadTraveler: b.leadTraveler,
          message: `🎟 Tickets purchasable from T-30 window. Confirm traveler names to lock.`,
          type: 'radar-info',
          namesLocked: !!b.namesLocked
        });
      }
    });

    return alerts;
  }, [dayBookings]);

  // Look up a guide/staff phone number by name from the saved directory.
  const guidePhoneByName = (name: string | null): string => {
    if (!name) return '';
    try {
      const stored = localStorage.getItem('sole_guides');
      if (!stored) return '';
      const list = JSON.parse(stored) as { name: string; phone?: string }[];
      const match = list.find(g => g.name.toLowerCase() === name.toLowerCase());
      return match?.phone || '';
    } catch {
      return '';
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Sole Travel — Daily Manifest Report", pageW / 2, 14, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Manifest Scope: ${showAll ? 'All Dates' : range.label}`, pageW / 2, 20, { align: "center" });

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pageW - 14, 14, { align: "right" });
    doc.setTextColor(0, 0, 0);

    let currentY = 26;
    let indexCount = 1;

    dayGroups.forEach((g, gIdx) => {
      const assignedGuests = dayTravelers.filter(t => g.travelerIds.includes(t.id));
      if (assignedGuests.length === 0) return;

      doc.setFillColor(38, 38, 38);
      doc.rect(14, currentY, pageW - 28, 8, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      
      const guidePhone = guidePhoneByName(g.guideName);
      const guideLabel = g.guideName ? `${g.guideName}${guidePhone ? ` (${guidePhone})` : ''}` : 'Unassigned';
      const bandText = `GRP ${gIdx + 1}  |  ${g.tourName}  |  Guide: ${guideLabel}  |  Time: ${g.departureTime} (Entry: ${g.ticketTime})  |  Guests: ${assignedGuests.length}/${g.capacity} pax`;
      doc.text(bandText, 18, currentY + 5.5);
      doc.setTextColor(0, 0, 0);

      currentY += 10;

      const tableBody = assignedGuests.map(t => {
        return [
          String(indexCount++),
          t.bookingRef,
          t.name,
          t.isLead ? 'Lead' : 'Guest',
          t.phone || 'N/A',
          guidePhone || 'N/A',
          t.language
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['No', 'Reference', 'Name', 'Role', 'Phone', "Guide's Phone", 'Lang']],
        body: tableBody,
        styles: { fontSize: 9, cellPadding: 2, lineColor: [220, 220, 220], lineWidth: 0.1 },
        headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold' },
        margin: { left: 14, right: 14 },
        theme: 'grid'
      });

      // @ts-expect-error autoTable
      currentY = doc.lastAutoTable.finalY + 6;

      if (currentY > pageH - 25) {
        doc.addPage();
        currentY = 14;
      }
    });

    if (unassignedTravelers.length > 0) {
      doc.setFillColor(239, 68, 68);
      doc.rect(14, currentY, pageW - 28, 8, "F");
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(255, 255, 255);
      doc.text(`UNASSIGNED RESERVATIONS  |  Guests not assigned to any group  |  Total: ${unassignedTravelers.length} pax`, 18, currentY + 5.5);
      doc.setTextColor(0, 0, 0);

      currentY += 10;

      const unassignedBody = unassignedTravelers.map(t => [
        String(indexCount++),
        t.bookingRef,
        t.name,
        t.tourName,
        t.phone || 'N/A',
        'N/A',
        t.language
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['No', 'Reference', 'Name', 'Tour Product', 'Phone', "Guide's Phone", 'Lang']],
        body: unassignedBody,
        styles: { fontSize: 8, cellPadding: 1.8, lineColor: [220, 220, 220], lineWidth: 0.1 },
        headStyles: { fillColor: [180, 60, 60], textColor: 255 },
        margin: { left: 14, right: 14 },
        theme: 'grid'
      });

      // @ts-expect-error autoTable
      currentY = doc.lastAutoTable.finalY + 8;
    }

    if (currentY > pageH - 40) {
      doc.addPage();
      currentY = 14;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("OPERATIONS MANAGEMENT DAILY SUMMARY", 14, currentY);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Total Scheduled Bookings: ${dayBookings.length}`, 14, currentY + 6);
    doc.text(`Total Assigned Travelers: ${dayTravelers.length - unassignedTravelers.length} pax`, 14, currentY + 11);
    doc.text(`Total Unassigned Travelers: ${unassignedTravelers.length} pax`, 14, currentY + 16);

    const guideNames = dayGroups.map(g => g.guideName).filter((n): n is string => !!n);
    const activeGuides = guideNames.filter((n, i) => guideNames.indexOf(n) === i);
    const activeGuidesWithPhone = activeGuides.map(name => {
      const phone = guidePhoneByName(name);
      return phone ? `${name} (${phone})` : name;
    });
    doc.text(`Active Tour Guides: ${activeGuidesWithPhone.join(', ') || 'None assigned yet'}`, 120, currentY + 6);
    doc.text(`Operational Status: Pending tickets & guide consolidations completed.`, 120, currentY + 11);

    doc.save(`sole-manifest-${showAll ? 'all' : anchorDateStr}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Top operational bar */}
      <div className="flex flex-col gap-4 bg-white border border-slate-200 p-4 sm:p-5 rounded-2xl shadow-md">
        <div className="flex flex-col lg:flex-row gap-4 lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight font-sans">Group Dispatch Board</h1>
            <p className="text-slate-500 text-sm mt-1 font-semibold">Consolidate bookings, drag travelers into groups, and manage guides.</p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowTemplateManager(true)}
              className="bg-white border border-slate-200 text-slate-700 hover:border-orange-400 hover:text-orange-600 font-bold px-4 py-2.5 rounded-xl text-xs shadow-sm transition flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap shrink-0"
              title="Create, edit and manage WhatsApp message templates"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Manage Templates</span>
            </button>
            <button
              onClick={() => setShowAutoGroupConfirm(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-600/10 transition flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap shrink-0"
              title="Auto-pack unassigned travelers using First-Fit-Decreasing algorithm"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Auto-Group</span>
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-orange-600/10 transition flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export Manifest</span>
            </button>
          </div>
        </div>

        {/* Date scope selector — Today / Week / Month / Year / All */}
        <div className="border-t border-slate-200/70 pt-4 relative z-30">
          <DateRangeFilter
            onChange={(r) => { setShowAll(false); setRange(r); }}
            allowAll
            onAll={() => setShowAll(true)}
          />
        </div>
      </div>

      {/* Deadline Radar alerts card widget */}
      <AnimatePresence>
        {deadlineAlerts.length > 0 && radarOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-rose-50/50 border border-rose-200/80 rounded-2xl p-5 backdrop-blur-md relative overflow-hidden"
          >
            <button 
              onClick={() => setRadarOpen(false)}
              className="absolute top-4 right-4 text-rose-500 hover:text-rose-700 font-bold text-xs cursor-pointer hover:underline"
            >
              Dismiss
            </button>
            <h3 className="text-sm font-extrabold text-rose-800 flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              <span>Colosseum Nominative Gate Radar ({deadlineAlerts.filter(a => !a.namesLocked).length} Active Alerts)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {deadlineAlerts.map((alert, idx) => (
                <div 
                  key={idx} 
                  className={`p-3 rounded-xl border flex gap-2.5 items-start text-xs font-semibold leading-relaxed transition-all duration-300 ${
                    alert.namesLocked 
                      ? 'bg-emerald-50/40 border-emerald-200/50 text-slate-400 opacity-60' 
                      : alert.type === 'radar-severe' ? 'bg-rose-50 border-rose-200 text-rose-700' :
                        alert.type === 'radar-warn' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                        'bg-sky-50 border-sky-200 text-sky-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={alert.namesLocked}
                    onChange={() => handleToggleNamesLocked(alert.bookingRef)}
                    className="mt-0.5 w-4 h-4 rounded text-orange-600 border-slate-300 focus:ring-orange-500 cursor-pointer shrink-0"
                    title="Toggle verified & locked status"
                  />
                  <div>
                    <span className={`font-mono font-extrabold mr-1.5 ${alert.namesLocked ? 'line-through text-slate-400' : 'text-orange-600'}`}>
                      {alert.bookingRef}
                    </span>
                    <strong className={alert.namesLocked ? 'line-through' : ''}>{alert.leadTraveler}</strong>
                    <p className={`font-medium mt-0.5 ${alert.namesLocked ? 'text-slate-400 line-through font-normal italic' : 'text-rose-600/80'}`}>
                      {alert.namesLocked ? 'Verified. Traveler passport documents checked & names locked.' : alert.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Dispatch Board Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Side: Unassigned ledger */}
        <div 
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, null)}
          className="lg:col-span-1 bg-white border border-dashed border-slate-300 rounded-2xl p-5 shadow-md"
        >
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-200/60">
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span>Unassigned Ledger</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-600 font-mono">
              {unassignedTravelers.length} Pax
            </span>
          </div>

          {/* Search bar */}
          <div className="relative mb-4">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search unassigned guest..."
              className="w-full bg-white/60 border border-slate-205 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none transition focus:border-orange-500"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          </div>

          {/* Unassigned List container */}
          <div className="space-y-3 max-h-[550px] overflow-y-auto pr-1">
            {filteredUnassigned.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400 font-medium">
                No unassigned guests.
              </div>
            ) : (
              filteredUnassigned.map(t => (
                <TravelerCard 
                  key={t.id} 
                  t={t} 
                  onDragStart={handleDragStart} 
                  onDragEnd={handleDragEnd}
                  onOpenComposer={handleOpenWhatsAppComposer}
                  split={getBookingSplitDetails(t.bookingRef)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right Side: Groups Column Container Grid */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-slate-800 text-sm">Active Departures</h3>
            <button
              onClick={handleAddGroup}
              className="outline-button flex items-center gap-1 py-1.5 px-3 rounded-xl text-xs font-bold shrink-0 cursor-pointer hover:scale-105 active:scale-95 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Group</span>
            </button>
          </div>

          {/* Group Dispatch Grid (Horizontal max 3 columns, wrapping continuously below) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {dayGroups.length === 0 && (
              <div className="col-span-full py-12 text-center text-xs text-slate-400 font-semibold border-2 border-dashed border-slate-200 rounded-2xl">
                No groups yet for this scope. Click "New Group" to start dispatching.
              </div>
            )}
            {dayGroups.map((group, gIdx) => {
              const assignedGuests = dayTravelers.filter(t => group.travelerIds.includes(t.id));
              const isOver = assignedGuests.length > group.capacity;
              const isFull = assignedGuests.length === group.capacity;

              return (
                <div
                  key={group.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, group.id)}
                  className={`bg-white border rounded-2xl p-4 flex flex-col shadow-md transition-all duration-300 hover:shadow-lg w-full ${
                    isOver ? 'border-rose-300 ring-2 ring-rose-500/10' :
                    isFull ? 'border-orange-400' : 'border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start pb-3 border-b border-slate-100 mb-3">
                    <div className="min-w-0">
                      <h4 className="font-extrabold text-xs text-slate-800 truncate" title={group.tourName}>
                        {group.tourName} ({group.productOptionCode})
                      </h4>
                      <div className="flex items-center gap-1.5 mt-1 text-[10px] text-slate-500 font-bold">
                        <Clock className="w-3 h-3 text-slate-400" />
                        <span>Dep: {group.departureTime}</span>
                        <span className="text-slate-300">•</span>
                        <span>Ent: {group.ticketTime}</span>
                      </div>
                      <div className="text-[9px] text-slate-400 font-bold mt-1 font-mono">📅 {group.serviceDate}</div>
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">
                        👤 Guide: <strong className="text-orange-600">{group.guideName || 'Unassigned'}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide font-mono ${
                        isOver ? 'bg-rose-500 text-white shadow-sm' : 
                        isFull ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {assignedGuests.length}/{group.capacity} PAX
                      </span>
                      <div className="flex gap-1">
                        <button
                          onClick={() => setEditingGroup(group)}
                          className="p-1.5 rounded bg-slate-105 hover:bg-slate-100 border border-slate-200 text-slate-505 cursor-pointer transition hover:scale-105"
                          title="Edit Group Settings"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteGroupConfirmId(group.id)}
                          className="p-1.5 rounded bg-slate-105 hover:bg-rose-50 border border-slate-200 text-slate-400 hover:text-rose-505 cursor-pointer transition hover:scale-105"
                          title="Delete Group"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex-grow space-y-2.5 min-h-[150px] max-h-[350px] overflow-y-auto pr-1">
                    {assignedGuests.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-[10px] text-slate-400 font-semibold border-2 border-dashed border-slate-100 rounded-xl py-12">
                        Drag guests here
                      </div>
                    ) : (
                      assignedGuests.map(t => (
                        <TravelerCard 
                          key={t.id} 
                          t={t} 
                          onDragStart={handleDragStart} 
                          onDragEnd={handleDragEnd}
                          onOpenComposer={handleOpenWhatsAppComposer}
                          split={getBookingSplitDetails(t.bookingRef)}
                        />
                      ))
                    )}
                  </div>

                  {group.notes && (
                    <div className="mt-3 p-2 bg-slate-50 rounded-lg text-[9px] font-medium text-slate-500 italic border-l-2 border-slate-300">
                      Note: {group.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Edit Group Settings Modal (Overlay click-to-close & full screen backdrop) ─── */}
      {createPortal(
        <AnimatePresence>
          {editingGroup && (
            <div 
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4"
              onClick={() => setEditingGroup(null)}
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
                  onClick={() => setEditingGroup(null)}
                  className="absolute top-5 right-5 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex items-center justify-center mb-4">
                  <Edit className="w-5 h-5 text-orange-600" />
                </div>

                <h3 className="text-base font-extrabold text-slate-900 font-sans mb-1">Modify Group Departure</h3>
                <p className="text-slate-450 text-xs font-semibold mb-5">Configure product category, pilot guide assignments, and launch times.</p>

                <form onSubmit={handleSaveGroupSettings} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tour Product</label>
                    <select
                      value={editingGroup.productCode}
                      onChange={(e) => {
                        const prod = TOUR_PRODUCTS.find(p => p.code === e.target.value);
                        if (prod) {
                          setEditingGroup(prev => prev ? {
                            ...prev,
                            productCode: prod.code,
                            tourName: prod.label,
                            capacity: prod.defaultCap
                          }: null);
                        }
                      }}
                      className="bg-slate-55 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                    >
                      {TOUR_PRODUCTS.map(p => (
                        <option key={p.code} value={p.code}>{p.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Assigned Guide</label>
                    <select
                      value={editingGroup.guideName || ''}
                      onChange={(e) => setEditingGroup(prev => prev ? { ...prev, guideName: e.target.value || null } : null)}
                      className="bg-slate-55 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                    >
                      <option value="">No Guide Assigned</option>
                      <option value="Felice">Felice</option>
                      <option value="Carlo Maria">Carlo Maria</option>
                      <option value="Susanna">Susanna</option>
                      <option value="Orietta">Orietta</option>
                      <option value="Liliana">Liliana</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Departure Time</label>
                      <input
                        type="time"
                        value={editingGroup.departureTime}
                        onChange={(e) => setEditingGroup(prev => prev ? { ...prev, departureTime: e.target.value } : null)}
                        className="bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ticket Entry Time</label>
                      <input
                        type="time"
                        value={editingGroup.ticketTime}
                        onChange={(e) => setEditingGroup(prev => prev ? { ...prev, ticketTime: e.target.value } : null)}
                        className="bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Group Capacity</label>
                      <input
                        type="number"
                        min={1}
                        value={editingGroup.capacity}
                        onChange={(e) => setEditingGroup(prev => prev ? { ...prev, capacity: Math.max(1, parseInt(e.target.value, 10) || 1) } : null)}
                        className="bg-slate-55 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ticket Status</label>
                      <select
                        value={editingGroup.ticketStatus}
                        onChange={(e) => setEditingGroup(prev => prev ? { ...prev, ticketStatus: e.target.value } : null)}
                        className="bg-slate-55 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                      >
                        <option value="Pending">Pending</option>
                        <option value="Issued">Issued</option>
                        <option value="Ticket done 9:30">Ticket done 9:30</option>
                        <option value="Ticket done 9:45">Ticket done 9:45</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Operational Notes</label>
                    <textarea
                      value={editingGroup.notes}
                      onChange={(e) => setEditingGroup(prev => prev ? { ...prev, notes: e.target.value } : null)}
                      placeholder="e.g. VIP clients, extra tickets needed"
                      rows={2}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                    />
                  </div>

                  <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setEditingGroup(null)}
                      className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer transition active:scale-95"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="bg-orange-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-orange-700 shadow-md cursor-pointer active:scale-95 transition"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── WhatsApp Composer Modal (Overlay click-to-close & full screen backdrop) ─── */}
      {createPortal(
        <AnimatePresence>
          {whatsappComposer && (
            <div 
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4"
              onClick={() => setWhatsappComposer(null)}
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
                  onClick={() => setWhatsappComposer(null)}
                  className="absolute top-5 right-5 p-2 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>

                <h3 className="text-base font-extrabold text-slate-900 font-sans mb-1">WhatsApp Web Composer</h3>
                <p className="text-slate-450 text-xs font-semibold mb-5">Select a template and edit coordinates before launching WhatsApp chat.</p>

                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Message Stage</label>
                    <select
                      value={whatsappComposer.templateId}
                      onChange={(e) => handleTemplateOrLangChange(e.target.value, whatsappComposer.lang)}
                      className="bg-slate-55 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                    >
                      {templates.map(tpl => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    {(['en', 'es', 'it'] as const).map(l => (
                      <button
                        key={l}
                        onClick={() => handleTemplateOrLangChange(whatsappComposer.templateId, l)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                          whatsappComposer.lang === l 
                            ? 'bg-emerald-500 text-white' 
                            : 'bg-slate-55 text-slate-655 hover:bg-slate-100'
                        }`}
                      >
                        {l === 'en' ? '🇬🇧 English' : l === 'es' ? '🇪🇸 Español' : '🇮🇹 Italiano'}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Message Body Preview & Edit</label>
                    <textarea
                      value={whatsappComposer.editedText}
                      onChange={(e) => setWhatsappComposer(prev => prev ? { ...prev, editedText: e.target.value } : null)}
                      rows={8}
                      className="bg-slate-55 border border-slate-200 rounded-xl p-3 text-xs font-medium text-slate-800 outline-none leading-relaxed"
                    />
                  </div>

                  <div className="flex gap-2.5 justify-end pt-4 border-t border-slate-100">
                    <button
                      onClick={() => setWhatsappComposer(null)}
                      className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer active:scale-95 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLaunchWhatsApp}
                      className="bg-emerald-650 text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md flex items-center gap-1.5 cursor-pointer active:scale-95 transition"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Launch WhatsApp Web</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ─── Custom Confirm Delete Group Modal (Overlay click-to-close & full screen backdrop) ─── */}
      {createPortal(
        <AnimatePresence>
          {deleteGroupConfirmId && (
            <div 
              className="fixed inset-0 bg-slate-955/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
              onClick={() => setDeleteGroupConfirmId(null)}
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
                <h3 className="font-extrabold text-slate-900 text-base mb-2">Delete Tour Group</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-5">
                  Are you sure you want to delete this group departure? All assigned travelers will return to the Unassigned Ledger.
                </p>
                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setDeleteGroupConfirmId(null)}
                    className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteGroup(deleteGroupConfirmId)}
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

      {/* ─── WhatsApp Template Manager ─── */}
      {showTemplateManager && (
        <WhatsappTemplateManager
          templates={templates}
          onChange={setTemplates}
          onClose={() => setShowTemplateManager(false)}
        />
      )}

      {/* ─── Custom Confirm Auto-Group Modal (Overlay click-to-close & full screen backdrop) ─── */}
      {createPortal(
        <AnimatePresence>
          {showAutoGroupConfirm && (
            <div 
              className="fixed inset-0 bg-slate-950/30 backdrop-blur-[2px] flex items-center justify-center z-[9999] p-4"
              onClick={() => setShowAutoGroupConfirm(false)}
            >
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl p-6 md:p-8 border border-slate-100 shadow-2xl max-w-sm w-full relative"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5 text-emerald-600" />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base mb-2">FFD Automatic Grouping</h3>
                <p className="text-slate-500 text-xs font-semibold leading-relaxed mb-5">
                  This will automatically distribute the remaining {unassignedTravelers.length} unassigned guest(s) into capacity-limited tour groups. Already scheduled travelers will be preserved. Proceed?
                </p>
                <div className="flex gap-2.5 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAutoGroupConfirm(false)}
                    className="bg-slate-50 border border-slate-200/80 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer transition active:scale-95"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={executeAutoGroup}
                    className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-emerald-700 shadow-md cursor-pointer transition active:scale-95"
                  >
                    Start Auto-Group
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

// ─── Traveler Card Item ──────────────────────────────────────────
interface TravelerCardProps {
  key?: string;
  t: DayTraveler;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  onOpenComposer: (id: string) => void;
  split: {
    distribution: Record<string, string[]>;
    unassigned: string[];
    totalCount: number;
  } | null;
}

function TravelerCard({ t, onDragStart, onDragEnd, onOpenComposer, split }: TravelerCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, t.id)}
      onDragEnd={onDragEnd}
      className={`bg-white border border-slate-200/80 rounded-xl p-3 shadow-sm hover:shadow-md cursor-grab active:cursor-grabbing transition duration-200 select-none transform hover:-translate-y-0.5 ${
        t.isLead ? 'border-l-4 border-l-orange-600' : ''
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold text-xs">⠿</span>
            <h4 className="font-extrabold text-xs text-slate-800 truncate leading-none">{t.name}</h4>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[9px] font-bold text-slate-500 font-mono">
            <span className="text-orange-600">{t.bookingRef}</span>
            <span>•</span>
            <span>{t.tourTime}</span>
            <span>•</span>
            <span className="text-slate-500">{t.language}</span>
          </div>
        </div>

        <div className="flex gap-1 ml-2">
          {t.phone && (
            <button
              onClick={() => onOpenComposer(t.id)}
              className="p-1 rounded bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-slate-505 hover:text-emerald-600 cursor-pointer transition hover:scale-105 active:scale-95"
              title="Launch WhatsApp template Composer"
            >
              <MessageSquare className="w-3 h-3" />
            </button>
          )}
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 rounded bg-slate-55 hover:bg-slate-100 border border-slate-200 text-slate-400 cursor-pointer transition"
          >
            {expanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {split && (
        <div className="mt-2 py-0.5 px-1.5 bg-rose-50 border border-rose-100 rounded text-[9px] text-rose-600 font-bold inline-flex items-center gap-1">
          <span>½ Split booking ({split.totalCount} pax total)</span>
        </div>
      )}

      {expanded && (
        <div className="mt-3.5 pt-2 border-t border-slate-100 space-y-1.5 text-[10px] text-slate-655 font-medium">
          <p><strong>Tour option requested:</strong> {t.tourName}</p>
          <p><strong>Phone:</strong> {t.phone || 'N/A'}</p>
          {t.notes && <p className="text-slate-500 italic"><strong>Notes:</strong> {t.notes}</p>}
          
          {split && (
            <div className="bg-slate-50 p-1.5 rounded border border-slate-100 mt-2 text-[9px] leading-relaxed">
              <span className="font-bold text-slate-700">Split details:</span>
              {Object.keys(split.distribution).map(gName => (
                <p key={gName}>• {gName}: {split.distribution[gName].join(', ')}</p>
              ))}
              {split.unassigned.length > 0 && (
                <p className="text-rose-500">• Unassigned: {split.unassigned.join(', ')}</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
