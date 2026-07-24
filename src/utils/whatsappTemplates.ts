// Editable WhatsApp message templates, persisted to localStorage so the team
// can create / edit / delete them from the Template Manager without code changes.

import { readStore, writeStore } from './storage';

export interface WhatsappTemplate {
  id: string;
  title: string;
  en: string;
  es: string;
  it: string;
}

const STORAGE_KEY = 'sole_whatsapp_templates';

export const DEFAULT_WHATSAPP_TEMPLATES: WhatsappTemplate[] = [
  {
    id: 'greet',
    title: '1 - Greet & Welcome Message',
    en: "Hello and warm greetings {leadTraveler},\n\nWe’re very happy that you’ve booked your tour {tourName} with us through Viator!\nFor further coordination, we will contact you 2 to 3 days before the tour starts.\nIf you have any questions or need more information, feel free to reach out to us.\n\n*One important note: Please make sure to send the name of each passenger exactly as it appears on their identification documents. Tickets are issued in the passengers' names and must match their official identification. Otherwise, Sole Travel will not be responsible if entry is denied.\n\nWishing you a memorable journey,\nSole Travel Team\nPhone: +39 331 1746737",
    es: "Hola y cordiales saludos {leadTraveler},\n\n¡Estamos muy contentos de que haya reservado su recorrido {tourName} con nosotros a través de Viator!\nPara una mayor coordinación, nos pondremos en contacto con usted de 2 a 3 días antes de que comience el recorrido.\nSi tiene alguna pregunta o necesita más información, no dude en contactarnos.\n\n*Nota importante: Asegúrese de enviar el nombre de cada pasajero exactamente como aparece en sus documentos de identidad. Las entradas se emiten a nombre de los pasajeros y deben coincidir con su identificación oficial.\n\nLe deseamos un viaje memorable,\nEquipo de Sole Travel",
    it: "Gentile {leadTraveler}, grazie per aver prenotato il tour {tourName} con Sole Travel via Viator!\nVi contatteremo 2-3 giorni prima del tour per il coordinamento finale.\n\n*Nota importante: vi preghiamo di inviare i nomi di tutti i partecipanti esattamente come appaiono sui documenti d'identità. I biglietti sono nominativi e non modificabili ai cancelli.\n\nUn caloroso saluto,\nSole Travel Team"
  },
  {
    id: 'nameCollect',
    title: '2 - Passport Name Collection',
    en: "Thank you for choosing Sole Travel.\nTo complete your booking {bookingRef}, please provide the following details for all travelers:\n\n• Full Name (First and Last Name) of Each Traveler exactly as it is in your ID documents.\n• Phone Number\n• Date of Birth (only required for travelers under 18 years old for Colosseum EU free entry eligibility)\n• Nationality\n\nKindly reply to this message with the requested information. If you have any questions, feel free to contact us.\n\nThank you for your cooperation\nSole Travel",
    es: "Gracias por elegir Sole Travel.\nPara completar su reserva {bookingRef}, proporcione los siguientes detalles de todos los viajeros:\n\n• Nombre completo (nombre y apellido) de cada viajero exactamente como figura en sus documentos de identidad.\n• Número de teléfono\n• Fecha de nacimiento (solo se requiere para viajeros menores de 18 años para la elegibilidad de entrada gratuita a la UE del Coliseo)\n• Nacionalidad\n\nResponda amablemente a este mensaje con la información solicitada.\n\nGracias,\nSole Travel",
    it: "Grazie per aver scelto Sole Travel. Per completare la prenotazione {bookingRef}, vi chiediamo di inviarci:\n\n• Nome e Cognome di ciascun partecipante esattamente come sul passaporto/ID.\n• Data di nascita (necessaria per verificare riduzioni under 18 Colosseo).\n• Nazione.\n\nRispondete direttamente a questo messaggio.\nGrazie,\nSole Travel"
  },
  {
    id: 'confirm',
    title: '3 - Attendance Confirmation',
    en: "Dear Guest,\n\nThis is a confirmation message from Sole Travel regarding your upcoming tour on {travelDate} for Colosseum and Roman Forum (Ref: {bookingRef}). We are finalizing the arrangements and would like to kindly ask if you will be joining the tour, so we can proceed with ticket issuance.\n\nPlease confirm your attendance at your earliest convenience.\n\nThank you,\nSole Travel",
    es: "Estimado cliente,\n\nEste es un mensaje de confirmación de Sole Travel con respecto a su próximo recorrido el {travelDate} para el Coliseo y el Foro Romano (Ref: {bookingRef}). Estamos finalizando los arreglos y nos gustaría preguntarle amablemente se unirá al recorrido, para proceder con la emisión de boletos.\n\nPor favor, confirme su asistencia lo antes posible.\n\nGracias,\nSole Travel",
    it: "Gentile ospite, questo è un messaggio di conferma da Sole Travel per il tour del {travelDate} (Ref: {bookingRef}). Stiamo completando l'acquisto dei biglietti nominativi e vi chiediamo di confermare la vostra presenza il prima possibile.\n\nGrazie,\nSole Travel"
  },
  {
    id: 'coordinationKiosk',
    title: '4A - Meeting Info (Kiosk)',
    en: "Hi,\nI'm messaging you from Sole Travel to remind you that you have a tour for tomorrow {travelDate} at {tourTime}.\nYour meeting point is at Colosseum metro station near the green kiosk. I will send the picture of the meeting point and our flag to you shortly.\nPlease don't forget to bring the ID document for each passenger.\nIf you arrive at the address and are unable to find us, please contact Masoud at this number: +39 351 1182663.\nHave a nice trip in Rome!",
    es: "Hola,\nLe escribimos desde Sole Travel para recordarle que tiene un tour programado para mañana {travelDate} a las {tourTime}.\nSu punto de encuentro es en la estación de metro Colosseo, cerca del quiosco verde. Le enviaré una foto del punto de encuentro y de nuestra bandera.\nPor favor, no olvide traer el documento de identificación de cada pasajero. Si no nos encuentra, llame a Masoud al +39 351 1182663.",
    it: "Ciao, vi scrivo da Sole Travel per ricordarvi che il tour è domani {travelDate} alle {tourTime}.\nIl punto d'incontro è presso la stazione metro Colosseo, vicino al chiosco verde. Vi invierò la foto del punto e della nostra bandiera. Portate i documenti d'identità. In caso di problemi contattare Masoud al +39 351 1182663."
  },
  {
    id: 'coordinationCafe',
    title: '4B - Meeting Info (Café Roma)',
    en: "Hello, this is Sole Travel.\n\nI would like to remind you that your tour is tomorrow {travelDate} at {tourTime}. Your meeting point is at the upper level of Colosseo Metro Station, next to Café Roma.\n\nTo reach the meeting point: when you enter Colosseo Metro Station, before the ticket gates, you will see a passage on your left. Please take the stairs up, and once you exit the metro, you will see Café Roma on your right.\n\nPlease don’t forget this important point: each client must bring a valid ID document. I will send you a photo of the flag and location shortly. Have a nice trip in Rome!",
    es: "Hola, le escribimos de Sole Travel.\n\nQueremos recordarle que su tour es mañana {travelDate} a las {tourTime}. El punto de encuentro será en la parte superior de la estación de metro Colosseo, junto a Café Roma.\n\nPara llegar: al entrar a la estación Colosseo, antes de los tornelli, tome el pasillo a la izquierda y suba las escaleras. Café Roma estará a su derecha. No olvide traer la identificación de cada pasajero. ¡Buen viaje!",
    it: "Ciao, siamo Sole Travel. Il tour è domani {travelDate} alle {tourTime}. Il punto d'incontro è al livello superiore della metro Colosseo, accanto al Café Roma (salite le scale a sinistra prima dei tornelli). Ogni partecipante deve avere un documento d'identità. A breve vi invieremo le foto della guida."
  },
  {
    id: 'review',
    title: '5 - Viator Review Request',
    en: "Hello,\nWe hope your tour of the Colosseum and Roman Forum was an unforgettable part of your trip to Rome.\nIf you had a great time, we would be delighted if you could share your experience with a short review on Viator. Your words will inspire other travelers and help us continue creating memorable tours.\n\nEvery single review makes a big difference for our small local company, and we truly appreciate your support.\n\nLink: https://www.viator.com/tours/Rome/Private-guided-Tour-of-Colosseum-Roman-Forum-and-Palatine-Hill/d511-5524558P4\n\nWe look forward to welcoming you again in the Eternal City,\nSole Travel",
    es: "Hola,\nEsperamos que tu visita al Coliseo y al Foro Romano haya sido una parte invalorable de tu viaje a Roma.\nSi disfrutaste de la experiencia, nos encantaría que compartieras tu opinión con una breve reseña en Viator. Tus palabras nos ayudarán a seguir mejorando.\n\nCada reseña marca una gran diferencia para nuestra pequeña empresa local, y realmente apreciamos tu apoyo.\n\nSole Travel",
    it: "Ciao, speriamo che il tour del Colosseo sia stato un'esperienza indimenticabile.\nSe vi siete trovati bene, vi chiediamo di dedicare 2 minuti per scrivere una breve recensione su Viator. Le vostre recensioni sono vitali per la nostra piccola azienda locale!\n\nGrazie per il supporto,\nSole Travel"
  }
];

export function loadWhatsappTemplates(): WhatsappTemplate[] {
  // readStore returns the hydrated Supabase cache when available.
  const list = readStore<WhatsappTemplate[]>(STORAGE_KEY, DEFAULT_WHATSAPP_TEMPLATES);
  return Array.isArray(list) && list.length > 0 ? list : DEFAULT_WHATSAPP_TEMPLATES;
}

export function saveWhatsappTemplates(list: WhatsappTemplate[]): void {
  // writeStore persists to Supabase (and broadcasts to other tabs/views).
  writeStore(STORAGE_KEY, list);
}

// Fill {placeholders} in a template body from a booking-like object.
export function fillTemplate(body: string, vars: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (m, key) => (vars[key] !== undefined ? vars[key] : m));
}
