import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Users, Plus, Trash2, Edit, Send, Printer, ShieldAlert, Sparkles, CheckSquare, Search, MessageSquare, AlertTriangle, AlertCircle, Clock, ChevronRight, X } from 'lucide-react';
import { Booking, User, GuideProfile } from '../types';
import { getRelativeDateString } from '../utils/seed';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import CustomDatePicker from './CustomDatePicker';
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

// WhatsApp template templates - Renamed to Sole Travel
const WHATSAPP_TEMPLATES = {
  greet: {
    title: "1 - Greet & Welcome Message",
    en: "Hello and warm greetings {leadTraveler},\n\nWe’re very happy that you’ve booked your tour {tourName} with us through Viator!\nFor further coordination, we will contact you 2 to 3 days before the tour starts.\nIf you have any questions or need more information, feel free to reach out to us.\n\n*One important note: Please make sure to send the name of each passenger exactly as it appears on their identification documents. Tickets are issued in the passengers' names and must match their official identification. Otherwise, Sole Travel will not be responsible if entry is denied.\n\nWishing you a memorable journey,\nSole Travel Team\nPhone: +39 331 1746737",
    es: "Hola y cordiales saludos {leadTraveler},\n\n¡Estamos muy contentos de que haya reservado su recorrido {tourName} con nosotros a través de Viator!\nPara una mayor coordinación, nos pondremos en contacto con usted de 2 a 3 días antes de que comience el recorrido.\nSi tiene alguna pregunta o necesita más información, no dude en contactarnos.\n\n*Nota importante: Asegúrese de enviar el nombre de cada pasajero exactamente como aparece en sus documentos de identidad. Las entradas se emiten a nombre de los pasajeros y deben coincidir con su identificación oficial.\n\nLe deseamos un viaje memorable,\nEquipo de Sole Travel",
    it: "Gentile {leadTraveler}, grazie per aver prenotato il tour {tourName} con Sole Travel via Viator!\nVi contatteremo 2-3 giorni prima del tour per il coordinamento finale.\n\n*Nota importante: vi preghiamo di inviare i nomi di tutti i partecipanti esattamente come appaiono sui documenti d'identità. I biglietti sono nominativi e non modificabili ai cancelli.\n\nUn caloroso saluto,\nSole Travel Team"
  },
  nameCollect: {
    title: "2 - Passport Name Collection",
    en: "Thank you for choosing Sole Travel.\nTo complete your booking {bookingRef}, please provide the following details for all travelers:\n\n• Full Name (First and Last Name) of Each Traveler exactly as it is in your ID documents.\n• Phone Number\n• Date of Birth (only required for travelers under 18 years old for Colosseum EU free entry eligibility)\n• Nationality\n\nKindly reply to this message with the requested information. If you have any questions, feel free to contact us.\n\nThank you for your cooperation\nSole Travel",
    es: "Gracias por elegir Sole Travel.\nPara completar su reserva {bookingRef}, proporcione los siguientes detalles de todos los viajeros:\n\n• Nombre completo (nombre y apellido) de cada viajero exactamente como figura en sus documentos de identidad.\n• Número de teléfono\n• Fecha de nacimiento (solo se requiere para viajeros menores de 18 años para la elegibilidad de entrada gratuita a la UE del Coliseo)\n• Nacionalidad\n\nResponda amablemente a este mensaje con la información solicitada.\n\nGracias,\nSole Travel",
    it: "Grazie per aver scelto Sole Travel. Per completare la prenotazione {bookingRef}, vi chiediamo di inviarci:\n\n• Nome e Cognome di ciascun partecipante esattamente come sul passaporto/ID.\n• Data di nascita (necessaria per verificare riduzioni under 18 Colosseo).\n• Nazione.\n\nRispondete direttamente a questo messaggio.\nGrazie,\nSole Travel"
  },
  confirm: {
    title: "3 - Attendance Confirmation",
    en: "Dear Guest,\n\nThis is a confirmation message from Sole Travel regarding your upcoming tour on {travelDate} for Colosseum and Roman Forum (Ref: {bookingRef}). We are finalizing the arrangements and would like to kindly ask if you will be joining the tour, so we can proceed with ticket issuance.\n\nPlease confirm your attendance at your earliest convenience.\n\nThank you,\nSole Travel",
    es: "Estimado cliente,\n\nEste es un mensaje de confirmación de Sole Travel con respecto a su próximo recorrido el {travelDate} para el Coliseo y el Foro Romano (Ref: {bookingRef}). Estamos finalizando los arreglos y nos gustaría preguntarle amablemente se unirá al recorrido, para proceder con la emisión de boletos.\n\nPor favor, confirme su asistencia lo antes posible.\n\nGracias,\nSole Travel",
    it: "Gentile ospite, questo è un messaggio di conferma da Sole Travel per il tour del {travelDate} (Ref: {bookingRef}). Stiamo completando l'acquisto dei biglietti nominativi e vi chiediamo di confermare la vostra presenza il prima possibile.\n\nGrazie,\nSole Travel"
  },
  coordinationKiosk: {
    title: "4A - Meeting Info (Kiosk)",
    en: "Hi,\nI'm messaging you from Sole Travel to remind you that you have a tour for tomorrow {travelDate} at {tourTime}.\nYour meeting point is at Colosseum metro station near the green kiosk. I will send the picture of the meeting point and our flag to you shortly.\nPlease don't forget to bring the ID document for each passenger.\nIf you arrive at the address and are unable to find us, please contact Masoud at this number: +39 351 1182663.\nHave a nice trip in Rome!",
    es: "Hola,\nLe escribimos desde Sole Travel para recordarle que tiene un tour programado para mañana {travelDate} a las {tourTime}.\nSu punto de encuentro es en la estación de metro Colosseo, cerca del quiosco verde. Le enviaré una foto del punto de encuentro y de nuestra bandera.\nPor favor, no olvide traer el documento de identificación de cada pasajero. Si no nos encuentra, llame a Masoud al +39 351 1182663.",
    it: "Ciao, vi scrivo da Sole Travel per ricordarvi che il tour è domani {travelDate} alle {tourTime}.\nIl punto d'incontro è presso la stazione metro Colosseo, vicino al chiosco verde. Vi invierò la foto del punto e della nostra bandiera. Portate i documenti d'identità. In caso di problemi contattare Masoud al +39 351 1182663."
  },
  coordinationCafe: {
    title: "4B - Meeting Info (Café Roma)",
    en: "Hello, this is Sole Travel.\n\nI would like to remind you that your tour is tomorrow {travelDate} at {tourTime}. Your meeting point is at the upper level of Colosseo Metro Station, next to Café Roma.\n\nTo reach the meeting point: when you enter Colosseo Metro Station, before the ticket gates, you will see a passage on your left. Please take the stairs up, and once you exit the metro, you will see Café Roma on your right.\n\nPlease don’t forget this important point: each client must bring a valid ID document. I will send you a photo of the flag and location shortly. Have a nice trip in Rome!",
    es: "Hola, le escribimos de Sole Travel.\n\nQueremos recordarle que su tour es mañana {travelDate} a las {tourTime}. El punto de encuentro será en la parte superior de la estación de metro Colosseo, junto a Café Roma.\n\nPara llegar: al entrar a la estación Colosseo, antes de los tornelli, tome el pasillo a la izquierda y suba las escaleras. Café Roma estará a su derecha. No olvide traer la identificación de cada pasajero. ¡Buen viaje!",
    it: "Ciao, siamo Sole Travel. Il tour è domani {travelDate} alle {tourTime}. Il punto d'incontro è al livello superiore della metro Colosseo, accanto al Café Roma (salite le scale a sinistra prima dei tornelli). Ogni partecipante deve avere un documento d'identità. A breve vi invieremo le foto della guida."
  },
  review: {
    title: "5 - Viator Review Request",
    en: "Hello,\nWe hope your tour of the Colosseum and Roman Forum was an unforgettable part of your trip to Rome.\nIf you had a great time, we would be delighted if you could share your experience with a short review on Viator. Your words will inspire other travelers and help us continue creating memorable tours.\n\nEvery single review makes a big difference for our small local company, and we truly appreciate your support.\n\nLink: https://www.viator.com/tours/Rome/Private-guided-Tour-of-Colosseum-Roman-Forum-and-Palatine-Hill/d511-5524558P4\n\nWe look forward to welcoming you again in the Eternal City,\nSole Travel",
    es: "Hola,\nEsperamos que tu visita al Coliseo y al Foro Romano haya sido una parte invalorable de tu viaje a Roma.\nSi disfrutaste de la experiencia, nos encantaría que compartieras tu opinión con una breve reseña en Viator. Tus palabras nos ayudarán a seguir mejorando.\n\nCada reseña marca una gran diferencia para nuestra pequeña empresa local, y realmente apreciamos tu apoyo.\n\nSole Travel",
    it: "Ciao, speriamo che il tour del Colosseo sia stato un'esperienza indimenticabile.\nSe vi siete trovati bene, vi chiediamo di dedicare 2 minuti per scrivere una breve recensione su Viator. Le vostre recensioni sono vitali per la nostra piccola azienda locale!\n\nGrazie per il supporto,\nSole Travel"
  }
};

const TOUR_PRODUCTS = [
  { code: '5524558P4', name: "Private Colosseo", defaultCap: 7, label: "Private Colosseum Tour" },
  { code: '5524558P1', name: "Colosseo guide", defaultCap: 24, label: "Group Colosseum Tour" },
  { code: '5524558P19', name: "Walking Highlights", defaultCap: 7, label: "Walking Tour" },
  { code: '5524558P2', name: "Golf Cart Rome", defaultCap: 7, label: "Golf Cart Tour" },
  { code: '5524558P10', name: "Famagusta Tour", defaultCap: 7, label: "Private Cyprus Tour" },
  { code: '5524558P18', name: "Rome Photo Shoot", defaultCap: 5, label: "Professional Photo Shoot" },
  { code: '5524558P3', name: "Vatican Museum", defaultCap: 24, label: "Vatican Tour" }
];

export default function ScheduleView({ bookings, currentUser, onUpdateBookings }: ScheduleViewProps) {
  // 1. Initial State
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = getRelativeDateString(0);
    const hasToday = bookings.some(b => b.travelDate === today);
    if (hasToday) return today;
    const sorted = [...bookings].sort((a, b) => a.travelDate.localeCompare(b.travelDate));
    return sorted.length > 0 ? sorted[0].travelDate : today;
  });

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
    templateKey: keyof typeof WHATSAPP_TEMPLATES;
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

  // 2. Computed Data
  const dayBookings = useMemo(() => {
    return bookings.filter(b => b.travelDate === selectedDate && b.status !== 'Cancelled');
  }, [bookings, selectedDate]);

  const dayTravelers = useMemo(() => {
    const list: {
      id: string; // "${bookingRef}-${index}"
      name: string;
      bookingRef: string;
      leadTraveler: string;
      tourTime: string;
      phone: string;
      language: string;
      tourName: string;
      productCode: string;
      notes: string;
      isLead: boolean;
      paxCount: Booking['paxCount'];
    }[] = [];

    dayBookings.forEach(b => {
      const guests = b.travelers && b.travelers.length > 0 ? b.travelers : [b.leadTraveler];
      guests.forEach((tName, idx) => {
        list.push({
          id: `${b.bookingRef}-${idx}`,
          name: tName,
          bookingRef: b.bookingRef,
          leadTraveler: b.leadTraveler,
          tourTime: b.tourTime,
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
    return groups.filter(g => g.serviceDate === selectedDate);
  }, [groups, selectedDate]);

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
        if (g.serviceDate === selectedDate) {
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
      serviceDate: selectedDate,
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
      tourTime: partiesMap[ref][0].tourTime
    })).sort((a, b) => b.members.length - a.members.length);

    const newGroups: TourGroup[] = [...groups];

    parties.forEach(party => {
      const product = TOUR_PRODUCTS.find(p => p.code === party.productCode) || TOUR_PRODUCTS[0];
      const defaultCap = product.defaultCap;

      let targetGroup = newGroups.find(g => 
        g.serviceDate === selectedDate &&
        g.productCode === party.productCode &&
        g.notes.includes(`Lang: ${party.language}`) &&
        (g.travelerIds.length + party.members.length) <= g.capacity
      );

      if (!targetGroup) {
        const groupIndex = newGroups.filter(g => g.serviceDate === selectedDate).length + 1;
        targetGroup = {
          id: `group-auto-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          serviceDate: selectedDate,
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

  const handleOpenWhatsAppComposer = (tId: string) => {
    const t = dayTravelers.find(x => x.id === tId);
    if (!t) return;
    const b = bookings.find(x => x.bookingRef === t.bookingRef);
    if (!b) return;

    const tIdx = Number(tId.split('-')[1]);
    const defaultKey = 'greet';

    const text = WHATSAPP_TEMPLATES[defaultKey].en
      .replace(/{leadTraveler}/g, b.leadTraveler)
      .replace(/{tourName}/g, b.tourName)
      .replace(/{bookingRef}/g, b.bookingRef)
      .replace(/{travelDate}/g, b.travelDate)
      .replace(/{tourTime}/g, b.tourTime)
      .replace(/{meetingPoint}/g, b.meetingPoint || 'Colosseum Kiosk');

    setWhatsappComposer({
      travelerId: tId,
      booking: b,
      travelerName: t.name,
      travelerIndex: tIdx,
      templateKey: defaultKey,
      lang: 'en',
      editedText: text
    });
  };

  const handleTemplateOrLangChange = (key: keyof typeof WHATSAPP_TEMPLATES, lang: 'en' | 'es' | 'it') => {
    if (!whatsappComposer) return;
    const b = whatsappComposer.booking;
    const rawTemplate = WHATSAPP_TEMPLATES[key][lang] || WHATSAPP_TEMPLATES[key]['en'];
    
    const text = rawTemplate
      .replace(/{leadTraveler}/g, b.leadTraveler)
      .replace(/{tourName}/g, b.tourName)
      .replace(/{bookingRef}/g, b.bookingRef)
      .replace(/{travelDate}/g, b.travelDate)
      .replace(/{tourTime}/g, b.tourTime)
      .replace(/{meetingPoint}/g, b.meetingPoint || 'Colosseum Kiosk');

    setWhatsappComposer(prev => prev ? {
      ...prev,
      templateKey: key,
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
        if (whatsappComposer.templateKey === 'confirm') nextStatus = 'Confirmed';
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

  const handleExportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("Sole Travel — Daily Manifest Report", pageW / 2, 14, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Manifest Date: ${selectedDate}`, pageW / 2, 20, { align: "center" });

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
      
      const bandText = `GRP ${gIdx + 1}  |  ${g.tourName}  |  Guide: ${g.guideName || 'Unassigned'}  |  Time: ${g.departureTime} (Entry: ${g.ticketTime})  |  Guests: ${assignedGuests.length}/${g.capacity} pax`;
      doc.text(bandText, 18, currentY + 5.5);
      doc.setTextColor(0, 0, 0);

      currentY += 10;

      const tableBody = assignedGuests.map(t => {
        const split = getBookingSplitDetails(t.bookingRef);
        const splitMark = split ? `½ (Part of ${split.totalCount} pax)` : '';
        
        return [
          String(indexCount++),
          t.bookingRef,
          t.tourTime,
          t.name,
          t.isLead ? 'Lead' : 'Guest',
          t.phone || 'N/A',
          t.language,
          splitMark,
          t.notes.substring(0, 30) + (t.notes.length > 30 ? '...' : ''),
          "[  ]"
        ];
      });

      autoTable(doc, {
        startY: currentY,
        head: [['No', 'Reference', 'Booked Time', 'Name', 'Role', 'Phone', 'Lang', 'Split', 'Notes', 'Check-In']],
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
        t.tourTime,
        t.name,
        t.tourName,
        t.phone || 'N/A',
        t.language,
        t.notes.substring(0, 45)
      ]);

      autoTable(doc, {
        startY: currentY,
        head: [['No', 'Reference', 'Booked Time', 'Name', 'Tour Product', 'Phone', 'Lang', 'Notes']],
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

    const activeGuides = Array.from(new Set(dayGroups.map(g => g.guideName).filter(Boolean)));
    doc.text(`Active Tour Guides: ${activeGuides.join(', ') || 'None assigned yet'}`, 120, currentY + 6);
    doc.text(`Operational Status: Pending tickets & guide consolidations completed.`, 120, currentY + 11);

    doc.save(`sole-manifest-${selectedDate}.pdf`);
  };

  return (
    <div className="space-y-6 animate-fade-in relative z-10">
      {/* Top operational bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white/40 border border-slate-200/80 p-5 rounded-2xl backdrop-blur-xl shadow-xl shadow-black/[0.01]">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight font-sans">Group Dispatch Board</h1>
          <p className="text-slate-500 text-sm mt-1 font-semibold">Consolidate bookings, drag travelers into groups, and manage guides.</p>
        </div>

        {/* Date Selector Navigation - using CustomDatePicker */}
        <div className="flex items-center gap-2">
          <CustomDatePicker value={selectedDate} onChange={setSelectedDate} type="date" className="min-w-[170px]" />
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
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-indigo-600/10 transition flex items-center gap-1.5 cursor-pointer hover:scale-105 active:scale-95 whitespace-nowrap shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Export Manifest</span>
          </button>
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
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 border-slate-300 focus:ring-indigo-500 cursor-pointer shrink-0"
                    title="Toggle verified & locked status"
                  />
                  <div>
                    <span className={`font-mono font-extrabold mr-1.5 ${alert.namesLocked ? 'line-through text-slate-400' : 'text-indigo-600'}`}>
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
          className="lg:col-span-1 bg-white/40 backdrop-blur-xl border border-dashed border-slate-300 rounded-2xl p-5 shadow-xl shadow-black/[0.01]"
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
              className="w-full bg-white/60 border border-slate-205 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold outline-none transition focus:border-indigo-500"
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {dayGroups.map((group, gIdx) => {
              const assignedGuests = dayTravelers.filter(t => group.travelerIds.includes(t.id));
              const isOver = assignedGuests.length > group.capacity;
              const isFull = assignedGuests.length === group.capacity;

              return (
                <div 
                  key={group.id}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, group.id)}
                  className={`bg-white/50 border rounded-2xl p-4 flex flex-col shadow-sm transition-all duration-300 hover:shadow-md ${
                    isOver ? 'border-rose-300 ring-2 ring-rose-500/10' : 
                    isFull ? 'border-indigo-400' : 'border-slate-200'
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
                      <p className="text-[10px] text-slate-500 font-semibold mt-1">
                        👤 Guide: <strong className="text-indigo-600">{group.guideName || 'Unassigned'}</strong>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1.5 shrink-0 ml-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide font-mono ${
                        isOver ? 'bg-rose-500 text-white shadow-sm' : 
                        isFull ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'
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
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
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

                <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-4">
                  <Edit className="w-5 h-5 text-indigo-600" />
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
                      className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-md cursor-pointer active:scale-95 transition"
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
              className="fixed inset-0 bg-slate-955/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
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
                      value={whatsappComposer.templateKey}
                      onChange={(e) => handleTemplateOrLangChange(e.target.value as keyof typeof WHATSAPP_TEMPLATES, whatsappComposer.lang)}
                      className="bg-slate-55 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-800 outline-none"
                    >
                      {Object.keys(WHATSAPP_TEMPLATES).map(key => (
                        <option key={key} value={key}>
                          {WHATSAPP_TEMPLATES[key as keyof typeof WHATSAPP_TEMPLATES].title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    {(['en', 'es', 'it'] as const).map(l => (
                      <button
                        key={l}
                        onClick={() => handleTemplateOrLangChange(whatsappComposer.templateKey, l)}
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

      {/* ─── Custom Confirm Auto-Group Modal (Overlay click-to-close & full screen backdrop) ─── */}
      {createPortal(
        <AnimatePresence>
          {showAutoGroupConfirm && (
            <div 
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md flex items-center justify-center z-[9999] p-4"
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
  t: {
    id: string;
    name: string;
    bookingRef: string;
    leadTraveler: string;
    tourTime: string;
    phone: string;
    language: string;
    tourName: string;
    notes: string;
    isLead: boolean;
  };
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
        t.isLead ? 'border-l-4 border-l-indigo-600' : ''
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-bold text-xs">⠿</span>
            <h4 className="font-extrabold text-xs text-slate-800 truncate leading-none">{t.name}</h4>
          </div>
          <div className="flex items-center gap-2 mt-1.5 text-[9px] font-bold text-slate-500 font-mono">
            <span className="text-indigo-600">{t.bookingRef}</span>
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
