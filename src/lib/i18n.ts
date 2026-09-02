import { cookies } from "next/headers";

export type Locale = "en" | "es";
export const LOCALE_COOKIE = "jsf_lang";
export const LOCALES: Locale[] = ["en", "es"];

/** Read the user's locale from the cookie. Defaults to "en". */
export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  const v = jar.get(LOCALE_COOKIE)?.value;
  return v === "es" ? "es" : "en";
}

/** Returns the dictionary for the current locale (server-side). */
export async function getDict(): Promise<Dict> {
  const locale = await getLocale();
  return messages[locale];
}

/** Helper exposed so client components can be passed the dict from a server parent. */
export function dictFor(locale: Locale): Dict {
  return messages[locale];
}

/**
 * Widens string literal types to `string`. The dictionaries are declared
 * `as const` (so missing keys are caught), which would otherwise give the
 * English and Spanish objects incompatible types — "BARBER PORTAL" vs
 * "PORTAL DE BARBEROS" — and make the ES dict unassignable to `Dict`.
 */
type Widen<T> = T extends string
  ? string
  : T extends readonly (infer U)[]
    ? readonly Widen<U>[]
    : { [K in keyof T]: Widen<T[K]> };

export type Dict = Widen<(typeof messages)["en"]>;

/**
 * Translation dictionary. Keep keys nested by area for readability.
 * Add new strings to BOTH languages — TypeScript will flag missing keys.
 */
export const messages = {
  en: {
    nav: {
      services: "SERVICES",
      work: "WORK",
      barbers: "BARBERS",
      visit: "VISIT",
      shop: "SHOP",
      careers: "CAREERS",
      barberSchool: "BARBER SCHOOL",
      comingSoon: "Coming soon",
      bookNow: "BOOK NOW",
      barberLogIn: "BARBER LOG IN",
    },
    langToggle: {
      switchTo: "Español",
      currentLabel: "EN",
      otherLabel: "ES",
    },
    landing: {
      hero: {
        bookAppointment: "BOOK YOUR APPOINTMENT",
        meetBarbers: "MEET OUR BARBERS",
        followUs: "FOLLOW THE FINEST",
      },
      about: {
        eyebrow: "THE SHOP",
        heading: "Where Tradition Meets Precision",
        body:
          "At J's Finest, every visit is built around one thing — the craft. From the snap of a fresh cape to the hot towel finish, we treat every chair like a throne. Walk in for a cut. Leave feeling like the finest version of yourself.",
      },
      services: {
        eyebrow: "THE MENU",
        heading: "Services",
      },
      /**
       * Service names/descriptions keyed by the DB `slug`. The homepage renders
       * these directly, and the booking flow looks them up by slug so services
       * stored in English still display in the reader's language. Any service
       * without an entry here falls back to the name stored in the database.
       */
      serviceCatalog: {
        "classic-cut": {
          name: "Classic Cut",
          desc: "Precision haircut tailored to your style. Hot towel finish included.",
        },
        "skin-fade": {
          name: "Skin Fade",
          desc: "Razor-sharp fade — from skin to a clean blend, finished to perfection.",
        },
        "beard-trim": {
          name: "Beard Trim & Lineup",
          desc: "Detailed beard sculpting with crisp lines, hot towel, and beard oil.",
        },
        "hot-towel-shave": {
          name: "Hot Towel Shave",
          desc: "The classic straight-razor experience — hot towels, oil, and a smooth finish.",
        },
        "kids-cut": {
          name: "Kid's Cut (12 & under)",
          desc: "Patient, careful cuts for the next generation. Lollipop included.",
        },
        "finest-package": {
          name: "The Finest Package",
          desc: "Cut + beard + hot towel shave. The full experience — head to chin.",
        },
      },
      work: {
        eyebrow: "THE WORK",
        heading: "Our Work",
        body:
          "A look at recent cuts from the chairs at J's Finest. Fades, shapes, beards — every detail.",
        empty:
          "Fresh work coming soon. Our barbers upload new shots after every shift.",
      },
      barbers: {
        eyebrow: "THE TEAM",
        heading: "Our Barbers",
        viewProfile: "VIEW PROFILE",
        seeAll: "SEE ALL BARBERS",
      },
      visit: {
        eyebrow: "FIND US",
        heading: "Visit Us",
        hoursTitle: "HOURS",
        contactTitle: "CONTACT",
        days: {
          monSun: "Monday – Sunday",
        },
        closed: "Closed",
        addressLabel: "ADDRESS",
        phoneLabel: "PHONE",
        emailLabel: "EMAIL",
        addressPlaceholder: "4329 Gus Thomasson Rd, Mesquite, TX 75150",
        phonePlaceholder: "(945) 360-9937",
      },
      bookCta: {
        heading: "Ready for the Finest?",
        body:
          "Reserve your chair online — pick your service, time, and barber. Walk-ins always welcome too.",
        bookOnline: "BOOK ONLINE",
        callToBook: "CALL TO BOOK",
      },
      footer: {
        barberPortal: "BARBER PORTAL",
        tagline: "CLEAN CUTS. SHARP STYLE. FINEST YOU.",
      },
    },
    barbersIndex: {
      title: "Our Barbers — J's Finest Barbershop",
      eyebrow: "THE TEAM",
      heading: "Our Barbers",
      intro:
        "Every chair at J's Finest is filled by a craftsman. Pick your barber, read their story, and book the one who fits your style.",
      viewProfile: "VIEW PROFILE",
      empty: "The team page is coming together — check back soon.",
    },
    barberProfile: {
      backToAll: "ALL BARBERS",
      yearsBehindChair: "YEARS BEHIND THE CHAIR",
      bookWith: "BOOK WITH",
      story: {
        eyebrow: "THE STORY",
        headingPrefix: "About",
      },
      portfolio: {
        eyebrow: "THE WORK",
        headingSuffix: "'s Portfolio",
        empty: "Fresh work coming soon.",
        emptyHint: "Drop photos and they'll appear here automatically.",
      },
      specialties: "SPECIALTIES",
      availability: "AVAILABILITY",
      onlineBookingNote: "Online booking with live time slots coming soon.",
      closed: "Closed",
      nextAvailable: {
        eyebrow: "REAL-TIME AVAILABILITY",
        headingPrefix: "Next Open With",
        subhead:
          "Shop-local times. Pick a window — you'll choose your service on the next step.",
        dayAbbr: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
        todayLabel: "Today",
        tomorrowLabel: "Tomorrow",
        closedLabel: "Day off",
        fullyBooked: "Fully booked",
        cta: "RESERVE A TIME",
      },
    },
    book: {
      eyebrow: "BOOK YOUR APPOINTMENT",
      heading: "Reserve Your Chair",
      preferredBanner: {
        bookingWith: "BOOKING WITH",
        change: "CHANGE",
      },
      steps: {
        service: "SERVICE",
        day: "DAY",
        time: "TIME",
        barber: "BARBER",
        info: "INFO",
      },
      pickService: "Pick a service",
      pickDay: "Pick a day",
      pickTime: "Pick a time",
      pickBarber: "Pick your barber",
      yourInfo: "Your info",
      anyoneAvailable: "Anyone Available",
      fastestOption: "FASTEST OPTION",
      anyoneDesc:
        "We'll send your request to all barbers available at this time — first to take it gets your chair.",
      preferredUnavailableA: "isn't available at",
      preferredUnavailableB:
        ". Pick another barber, \"Anyone Available\", or hit",
      preferredUnavailableBack: "back",
      preferredUnavailableC: "to choose a different time.",
      noSlots: "No times available that day. Try another date.",
      noSlotsForBarberA: "has no openings that day. Pick another date — or change barber.",
      loading: "Loading times…",
      noBarbersAtTime:
        "No specific barbers available — but you can still book with Anyone Available above.",
      backLink: "← BACK",
      durationMin: "min",
      hour: "h",
      today: "today",
      form: {
        fullName: "Full Name",
        email: "Email",
        phone: "Phone",
        notes: "Notes (optional)",
        reserve: "RESERVE MY CHAIR",
        reserving: "RESERVING…",
        confirmEmailNote:
          "You'll get an email confirmation. No payment required now — pay at the chair.",
      },
    },
    confirmed: {
      status: {
        pending: "AWAITING BARBER CONFIRMATION",
        confirmed: "CONFIRMED",
      },
      heading: "Reservation received",
      body: "We've got it. A barber will confirm shortly — keep an eye on your inbox.",
      when: "WHEN",
      service: "SERVICE",
      price: "PRICE",
      payAtChair: "pay at the chair",
      barberLabel: "BARBER",
      pendingBarberSpecific: "(pending confirmation)",
      pendingNoBarber: "Pending — first available barber will claim it",
      nameLabel: "NAME",
      emailLabel: "EMAIL",
      phoneLabel: "PHONE",
      notesLabel: "NOTES",
      reservationId: "Reservation ID:",
      bookAnother: "BOOK ANOTHER",
      backToSite: "BACK TO SITE",
      home: "← HOME",
    },
    installPrompt: {
      brand: "J'S FINEST",
      message: "Add to home screen",
      install: "INSTALL",
      iosTitle: "Install J's Finest",
      iosEyebrow: "ADD TO HOME SCREEN",
      iosStep1Prefix: "Tap the",
      iosStep1Bold: "Share",
      iosStep1Suffix: "button in Safari (the square with the arrow ↑).",
      iosStep2Prefix: "Scroll down and tap",
      iosStep2Bold: "Add to Home Screen",
      iosStep2Suffix: ".",
      iosStep3Prefix: "Tap",
      iosStep3Bold: "Add",
      iosStep3Suffix: " — the J's Finest icon will appear on your home screen.",
    },
    auth: {
      barberPortal: "BARBER PORTAL",
      signInTitle: "Sign In",
      signInIntro: "Behind-the-chair access for J's Finest staff.",
      signUpTitle: "Create Account",
      signUpIntro:
        "New barbers sign up here. The shop owner reviews and approves each account before it goes live.",
      pendingTitle: "Awaiting Owner Approval",
      pendingEyebrow: "ACCOUNT CREATED",
      pendingBody:
        "Your barber account is in the queue. The shop owner reviews each new signup before activating it.",
      pendingBody2:
        "Once approved, you'll be able to sign in, see your dashboard, and start taking appointments.",
      backToHome: "BACK TO HOME",
      firstTime: "First time?",
      activateAccount: "Activate your account",
      alreadyHave: "Already have an account?",
      signInInstead: "Sign in instead",
      labels: {
        fullName: "Full Name",
        phone: "Phone (optional — for SMS notifications)",
        email: "Email",
        password: "Password",
        confirmPassword: "Confirm Password",
        passwordHint: "At least 8 characters",
      },
      buttons: {
        signIn: "SIGN IN",
        signingIn: "SIGNING IN…",
        createAccount: "CREATE ACCOUNT",
        creatingAccount: "CREATING ACCOUNT…",
      },
    },
    dashboard: {
      portalLabel: "· BARBER PORTAL",
      nav: {
        calendar: "CALENDAR",
        history: "HISTORY",
        editProfile: "EDIT PROFILE",
        admin: "ADMIN",
        logOut: "LOG OUT",
      },
      footer: "J'S FINEST BARBERSHOP · BARBER PORTAL",
      home: {
        welcome: "WELCOME,",
        intro:
          "Tap any empty slot below to drop a customer in. Booking a slot here blocks it for everyone else on the customer site.",
        yourDay: "Your Day",
        viewFullCalendar: "VIEW FULL CALENDAR →",
        next7Days: "NEXT 7 DAYS",
        comingUp: "Coming Up",
        comingUpEmpty: "Nothing booked for the rest of the week.",
        comingUpHint:
          "Reservations and walk-ins for upcoming days appear here.",
        askedForYou: "ASKED FOR YOU",
        pending: "Pending",
        noneAsked: "No customers have requested you specifically.",
        openRequests: "OPEN REQUESTS",
        anyoneAvailable: "Anyone Available",
        noneOpen: "No open requests during your hours.",
        illTakeIt: "I'LL TAKE IT",
        cancel: "CANCEL",
      },
      slot: {
        offToday: "You're off today.",
        offTodayHint:
          "Your weekly schedule has this day set to closed. Update it in",
        offTodayLink: "Edit Profile → Weekly Hours",
        free: "Free",
        addBooking: "+ ADD",
        addBookingFull: "+ ADD BOOKING",
        continues: "continues",
        done: "DONE",
        cancel: "CANCEL",
        doneTagDone: "✓ DONE",
        tipTag: "TIP",
        customerName: "Customer name",
        nameRequired: "Customer name is required.",
        save: "SAVE",
        saving: "SAVING…",
        skip: "SKIP",
        tipPlaceholder: "Tip",
        dayDone: "Day's done — see you tomorrow.",
        slotsMisconfigured: "No slots — your hours might be misconfigured.",
        phoneOptional: "Phone (optional)",
        customTime: "+ CUSTOM TIME",
        customTimeHint: "Any time — not just the 30-minute slots",
        timeLabel: "Time",
      },
    },
  },
  es: {
    nav: {
      services: "SERVICIOS",
      work: "TRABAJO",
      barbers: "BARBEROS",
      visit: "VISITA",
      shop: "TIENDA",
      careers: "EMPLEO",
      barberSchool: "ESCUELA DE BARBERÍA",
      comingSoon: "Próximamente",
      bookNow: "RESERVAR",
      barberLogIn: "ACCESO BARBEROS",
    },
    langToggle: {
      switchTo: "English",
      currentLabel: "ES",
      otherLabel: "EN",
    },
    landing: {
      hero: {
        bookAppointment: "RESERVA TU CITA",
        meetBarbers: "CONOCE A NUESTROS BARBEROS",
        followUs: "SÍGUENOS",
      },
      about: {
        eyebrow: "LA BARBERÍA",
        heading: "Donde la Tradición se Encuentra con la Precisión",
        body:
          "En J's Finest, cada visita gira en torno a una sola cosa: el oficio. Desde el chasquido de una capa nueva hasta el acabado con toalla caliente, tratamos cada silla como un trono. Entra para un corte. Sal sintiéndote la mejor versión de ti mismo.",
      },
      services: {
        eyebrow: "EL MENÚ",
        heading: "Servicios",
      },
      serviceCatalog: {
        "classic-cut": {
          name: "Corte Clásico",
          desc: "Corte de precisión adaptado a tu estilo. Incluye acabado con toalla caliente.",
        },
        "skin-fade": {
          name: "Fade a la Piel",
          desc: "Degradado impecable — de la piel a una mezcla limpia, rematado a la perfección.",
        },
        "beard-trim": {
          name: "Barba y Perfilado",
          desc: "Barba esculpida al detalle con líneas nítidas, toalla caliente y aceite.",
        },
        "hot-towel-shave": {
          name: "Afeitado con Toalla Caliente",
          desc: "La experiencia clásica a navaja — toallas calientes, aceite y un acabado suave.",
        },
        "kids-cut": {
          name: "Corte para Niños (12 y menores)",
          desc: "Cortes pacientes y cuidadosos para la próxima generación. Paleta incluida.",
        },
        "finest-package": {
          name: "El Paquete Finest",
          desc: "Corte + barba + afeitado con toalla caliente. La experiencia completa.",
        },
      },
      work: {
        eyebrow: "EL TRABAJO",
        heading: "Nuestro Trabajo",
        body:
          "Un vistazo a los cortes más recientes de las sillas de J's Finest. Fades, formas, barbas — cada detalle.",
        empty:
          "Trabajos nuevos próximamente. Nuestros barberos suben fotos después de cada turno.",
      },
      barbers: {
        eyebrow: "EL EQUIPO",
        heading: "Nuestros Barberos",
        viewProfile: "VER PERFIL",
        seeAll: "VER TODOS",
      },
      visit: {
        eyebrow: "ENCUÉNTRANOS",
        heading: "Visítanos",
        hoursTitle: "HORARIO",
        contactTitle: "CONTACTO",
        days: {
          monSun: "Lunes – Domingo",
        },
        closed: "Cerrado",
        addressLabel: "DIRECCIÓN",
        phoneLabel: "TELÉFONO",
        emailLabel: "CORREO",
        addressPlaceholder: "4329 Gus Thomasson Rd, Mesquite, TX 75150",
        phonePlaceholder: "(945) 360-9937",
      },
      bookCta: {
        heading: "¿Listo para lo Mejor?",
        body:
          "Reserva tu silla en línea — escoge tu servicio, hora y barbero. También aceptamos clientes sin cita.",
        bookOnline: "RESERVAR EN LÍNEA",
        callToBook: "LLAMAR PARA RESERVAR",
      },
      footer: {
        barberPortal: "ACCESO BARBEROS",
        tagline: "CORTES LIMPIOS. ESTILO IMPECABLE. TU MEJOR VERSIÓN.",
      },
    },
    barbersIndex: {
      title: "Nuestros Barberos — J's Finest Barbershop",
      eyebrow: "EL EQUIPO",
      heading: "Nuestros Barberos",
      intro:
        "Cada silla en J's Finest está ocupada por un artesano. Escoge tu barbero, lee su historia y reserva con el que mejor encaje con tu estilo.",
      viewProfile: "VER PERFIL",
      empty: "La página del equipo se está armando — vuelve pronto.",
    },
    barberProfile: {
      backToAll: "TODOS LOS BARBEROS",
      yearsBehindChair: "AÑOS DETRÁS DE LA SILLA",
      bookWith: "RESERVAR CON",
      story: {
        eyebrow: "LA HISTORIA",
        headingPrefix: "Sobre",
      },
      portfolio: {
        eyebrow: "EL TRABAJO",
        headingSuffix: " — Portafolio",
        empty: "Trabajos nuevos próximamente.",
        emptyHint: "Sube fotos y aparecerán aquí automáticamente.",
      },
      specialties: "ESPECIALIDADES",
      availability: "DISPONIBILIDAD",
      onlineBookingNote: "Reservas con horarios en vivo próximamente.",
      closed: "Cerrado",
      nextAvailable: {
        eyebrow: "DISPONIBILIDAD EN VIVO",
        headingPrefix: "Próximos Espacios con",
        subhead:
          "Horario local del barbershop. Elige una ventana — escogerás tu servicio en el siguiente paso.",
        dayAbbr: ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"],
        todayLabel: "Hoy",
        tomorrowLabel: "Mañana",
        closedLabel: "Descanso",
        fullyBooked: "Totalmente reservado",
        cta: "RESERVAR UN HORARIO",
      },
    },
    book: {
      eyebrow: "RESERVA TU CITA",
      heading: "Reserva tu Silla",
      preferredBanner: {
        bookingWith: "RESERVANDO CON",
        change: "CAMBIAR",
      },
      steps: {
        service: "SERVICIO",
        day: "DÍA",
        time: "HORA",
        barber: "BARBERO",
        info: "DATOS",
      },
      pickService: "Escoge un servicio",
      pickDay: "Escoge un día",
      pickTime: "Escoge una hora",
      pickBarber: "Escoge tu barbero",
      yourInfo: "Tus datos",
      anyoneAvailable: "Cualquiera Disponible",
      fastestOption: "OPCIÓN MÁS RÁPIDA",
      anyoneDesc:
        "Enviaremos tu solicitud a todos los barberos disponibles a esta hora — el primero en aceptarla se queda con tu silla.",
      preferredUnavailableA: "no está disponible a las",
      preferredUnavailableB:
        ". Escoge otro barbero, \"Cualquiera Disponible\", o presiona",
      preferredUnavailableBack: "atrás",
      preferredUnavailableC: "para elegir otra hora.",
      noSlots: "No hay horarios disponibles ese día. Prueba otra fecha.",
      noSlotsForBarberA: "no tiene huecos ese día. Prueba otra fecha — o cambia de barbero.",
      loading: "Cargando horarios…",
      noBarbersAtTime:
        "Ningún barbero específico disponible — pero puedes reservar con Cualquiera Disponible arriba.",
      backLink: "← ATRÁS",
      durationMin: "min",
      hour: "h",
      today: "hoy",
      form: {
        fullName: "Nombre Completo",
        email: "Correo",
        phone: "Teléfono",
        notes: "Notas (opcional)",
        reserve: "RESERVAR MI SILLA",
        reserving: "RESERVANDO…",
        confirmEmailNote:
          "Recibirás un correo de confirmación. No se requiere pago ahora — paga en la silla.",
      },
    },
    confirmed: {
      status: {
        pending: "ESPERANDO CONFIRMACIÓN DEL BARBERO",
        confirmed: "CONFIRMADO",
      },
      heading: "Reserva Recibida",
      body: "La tenemos. Un barbero confirmará pronto — revisa tu correo.",
      when: "CUÁNDO",
      service: "SERVICIO",
      price: "PRECIO",
      payAtChair: "pago en la silla",
      barberLabel: "BARBERO",
      pendingBarberSpecific: "(pendiente de confirmación)",
      pendingNoBarber: "Pendiente — el primer barbero disponible la tomará",
      nameLabel: "NOMBRE",
      emailLabel: "CORREO",
      phoneLabel: "TELÉFONO",
      notesLabel: "NOTAS",
      reservationId: "ID de Reserva:",
      bookAnother: "RESERVAR OTRA",
      backToSite: "VOLVER AL SITIO",
      home: "← INICIO",
    },
    installPrompt: {
      brand: "J'S FINEST",
      message: "Añadir a pantalla de inicio",
      install: "INSTALAR",
      iosTitle: "Instalar J's Finest",
      iosEyebrow: "AÑADIR A PANTALLA DE INICIO",
      iosStep1Prefix: "Toca el botón",
      iosStep1Bold: "Compartir",
      iosStep1Suffix: "en Safari (el cuadrado con la flecha ↑).",
      iosStep2Prefix: "Desliza hacia abajo y toca",
      iosStep2Bold: "Añadir a Pantalla de Inicio",
      iosStep2Suffix: ".",
      iosStep3Prefix: "Toca",
      iosStep3Bold: "Añadir",
      iosStep3Suffix: " — el ícono de J's Finest aparecerá en tu pantalla.",
    },
    auth: {
      barberPortal: "PORTAL DE BARBEROS",
      signInTitle: "Iniciar Sesión",
      signInIntro: "Acceso del personal de J's Finest.",
      signUpTitle: "Crear Cuenta",
      signUpIntro:
        "Los nuevos barberos se registran aquí. El dueño revisa y aprueba cada cuenta antes de activarla.",
      pendingTitle: "Esperando Aprobación del Dueño",
      pendingEyebrow: "CUENTA CREADA",
      pendingBody:
        "Tu cuenta de barbero está en cola. El dueño revisa cada registro nuevo antes de activarlo.",
      pendingBody2:
        "Una vez aprobada, podrás iniciar sesión, ver tu panel y empezar a tomar citas.",
      backToHome: "VOLVER AL INICIO",
      firstTime: "¿Primera vez?",
      activateAccount: "Activa tu cuenta",
      alreadyHave: "¿Ya tienes cuenta?",
      signInInstead: "Inicia sesión",
      labels: {
        fullName: "Nombre Completo",
        phone: "Teléfono (opcional — para notificaciones SMS)",
        email: "Correo",
        password: "Contraseña",
        confirmPassword: "Confirmar Contraseña",
        passwordHint: "Al menos 8 caracteres",
      },
      buttons: {
        signIn: "INICIAR SESIÓN",
        signingIn: "INICIANDO…",
        createAccount: "CREAR CUENTA",
        creatingAccount: "CREANDO CUENTA…",
      },
    },
    dashboard: {
      portalLabel: "· PORTAL DE BARBEROS",
      nav: {
        calendar: "CALENDARIO",
        history: "HISTORIAL",
        editProfile: "EDITAR PERFIL",
        admin: "ADMIN",
        logOut: "CERRAR SESIÓN",
      },
      footer: "J'S FINEST BARBERSHOP · PORTAL DE BARBEROS",
      home: {
        welcome: "BIENVENIDO,",
        intro:
          "Toca cualquier hueco libre abajo para agregar a un cliente. Reservar aquí bloquea esa hora para todos los demás en el sitio público.",
        yourDay: "Tu Día",
        viewFullCalendar: "VER CALENDARIO COMPLETO →",
        next7Days: "PRÓXIMOS 7 DÍAS",
        comingUp: "Próximamente",
        comingUpEmpty: "Nada reservado para el resto de la semana.",
        comingUpHint:
          "Reservas y citas para los próximos días aparecen aquí.",
        askedForYou: "TE PIDIERON A TI",
        pending: "Pendiente",
        noneAsked: "Ningún cliente te ha pedido específicamente.",
        openRequests: "SOLICITUDES ABIERTAS",
        anyoneAvailable: "Cualquiera Disponible",
        noneOpen: "Sin solicitudes abiertas en tu horario.",
        illTakeIt: "YO LA TOMO",
        cancel: "CANCELAR",
      },
      slot: {
        offToday: "Hoy no trabajas.",
        offTodayHint:
          "Tu horario tiene este día cerrado. Actualízalo en",
        offTodayLink: "Editar Perfil → Horario Semanal",
        free: "Libre",
        addBooking: "+ AGREGAR",
        addBookingFull: "+ AGREGAR CITA",
        continues: "continúa",
        done: "HECHO",
        cancel: "CANCELAR",
        doneTagDone: "✓ HECHO",
        tipTag: "PROPINA",
        customerName: "Nombre del cliente",
        nameRequired: "El nombre del cliente es obligatorio.",
        save: "GUARDAR",
        saving: "GUARDANDO…",
        skip: "OMITIR",
        tipPlaceholder: "Propina",
        dayDone: "El día terminó — nos vemos mañana.",
        slotsMisconfigured: "Sin horarios — revisa tu configuración.",
        phoneOptional: "Teléfono (opcional)",
        customTime: "+ HORA PERSONALIZADA",
        customTimeHint: "Cualquier hora — no solo los bloques de 30 minutos",
        timeLabel: "Hora",
      },
    },
  },
} as const;
