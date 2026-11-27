/**
 * Configuración de Radar Pyme. Es el ÚNICO archivo que se toca para adaptar la
 * prospección: sectores, ciudades, pesos de la puntuación, límites y firma.
 * El motor (puntuación, demo, mensaje) lee todo de aquí y no tiene datos propios.
 */
import type { DiaSemana, Franja } from "./tipos";

export type ProductoId = "recepcion-24-7" | "gymos" | "mesa" | "presupuestin";

export type Producto = {
  id: ProductoId;
  nombre: string;
  /** Qué hace, en una frase, para el dueño del negocio. */
  promesa: string;
  /** Módulos base con su estimación en horas (entrada del presupuesto). */
  modulos: { id: string; nombre: string; horas: number }[];
};

export type Sector = {
  id: string;
  nombre: string;
  /** Plural para el mensaje: "centros de fisioterapia". */
  plural: string;
  /** Texto que se envía a Google Places. */
  consulta: string;
  producto: ProductoId;
  servicios: { nombre: string; duracionMin: number }[];
  /** Horario habitual del sector; se usa solo si la ficha no trae horarios (y se avisa). */
  horariosTipicos: Partial<Record<DiaSemana, Franja[]>>;
  /** Nombres ficticios para el modo demo. {barrio} y {apellido} se sustituyen. */
  nombresDemo: string[];
  /** Conversación de ejemplo de la demo. Marcadores: {negocio} {asistente} {servicio} {dia} {hora}. */
  guion: { de: "cliente" | "asistente"; texto: string }[];
};

export type Ciudad = {
  id: string;
  nombre: string;
  pais: "AR" | "MX" | "CO" | "PE" | "CL" | "UY";
  moneda: string;
  /** Prefijo internacional y de área para los teléfonos del modo demo. */
  prefijoDemo: string;
  barrios: string[];
  calles: string[];
};

export const productos: Record<ProductoId, Producto> = {
  "recepcion-24-7": {
    id: "recepcion-24-7",
    nombre: "Recepción 24/7",
    promesa: "una asistente por WhatsApp que agenda, mueve y confirma citas a cualquier hora",
    modulos: [
      { id: "agente-whatsapp", nombre: "Asistente de WhatsApp con IA", horas: 14 },
      { id: "agenda", nombre: "Agenda con lista de espera", horas: 10 },
      { id: "anticipos", nombre: "Cobro de anticipos con Mercado Pago", horas: 6 },
    ],
  },
  gymos: {
    id: "gymos",
    nombre: "GymOS",
    promesa: "acceso con QR, cuotas automáticas y avisos a los socios que están por dejar de venir",
    modulos: [
      { id: "socios", nombre: "Socios y acceso con QR", horas: 12 },
      { id: "cuotas", nombre: "Cuotas recurrentes con Mercado Pago", horas: 10 },
      { id: "radar-bajas", nombre: "Radar de bajas por WhatsApp", horas: 8 },
    ],
  },
  mesa: {
    id: "mesa",
    nombre: "Mesa",
    promesa: "menú QR con un mesero virtual, reservas por WhatsApp y respuestas a reseñas",
    modulos: [
      { id: "menu-qr", nombre: "Menú QR con asistente", horas: 12 },
      { id: "cocina", nombre: "Pantalla de cocina en tiempo real", horas: 10 },
      { id: "pedidos-whatsapp", nombre: "Pedidos y reservas por WhatsApp", horas: 10 },
    ],
  },
  presupuestin: {
    id: "presupuestin",
    nombre: "Presupuestín",
    promesa: "presupuestos en PDF a partir de fotos y audios de la obra, firmados por WhatsApp",
    modulos: [
      { id: "captura", nombre: "Captura de fotos y audios desde la obra", horas: 8 },
      { id: "presupuesto-pdf", nombre: "Presupuesto en PDF con IA", horas: 12 },
      { id: "firma", nombre: "Aceptación y firma por WhatsApp", horas: 6 },
    ],
  },
};

/** Módulos extra que se suman a la propuesta según los puntos débiles detectados. */
export const modulosExtra = {
  web: { id: "web", nombre: "Página web propia con dominio", horas: 8 },
  reservas: { id: "reservas-en-linea", nombre: "Reservas en línea", horas: 6 },
  resenas: { id: "resenas", nombre: "Respuestas a reseñas asistidas por IA", horas: 5 },
} as const;

const semana = (abre: string, cierra: string, sabado?: Franja[]): Partial<Record<DiaSemana, Franja[]>> => ({
  1: [{ abre, cierra }],
  2: [{ abre, cierra }],
  3: [{ abre, cierra }],
  4: [{ abre, cierra }],
  5: [{ abre, cierra }],
  ...(sabado ? { 6: sabado } : {}),
});

const guionCitas: Sector["guion"] = [
  { de: "cliente", texto: "Hola, ¿tienen lugar para {servicio} esta semana?" },
  { de: "asistente", texto: "¡Hola! Soy {asistente}, la asistente de {negocio}. Para {servicio} tengo disponible el {dia} a las {hora}. ¿Te la reservo?" },
  { de: "cliente", texto: "Sí, dale" },
  { de: "asistente", texto: "Listo, tu cita quedó reservada para el {dia} a las {hora}. Te enviaré un recordatorio el día anterior." },
];

export const sectores: Sector[] = [
  {
    id: "fisioterapia",
    nombre: "Fisioterapia y kinesiología",
    plural: "centros de fisioterapia",
    consulta: "kinesiología fisioterapia",
    producto: "recepcion-24-7",
    servicios: [
      { nombre: "Sesión de fisioterapia", duracionMin: 45 },
      { nombre: "Rehabilitación de lesiones deportivas", duracionMin: 60 },
      { nombre: "Reeducación postural (RPG)", duracionMin: 60 },
      { nombre: "Drenaje linfático", duracionMin: 45 },
    ],
    horariosTipicos: semana("08:00", "20:00", [{ abre: "09:00", cierra: "13:00" }]),
    nombresDemo: ["Fisioterapia {barrio}", "Centro Kinésico {apellido}", "Movimiento Vital", "Rehabilita {barrio}", "Consultorio {apellido} Fisioterapia", "Espacio Postura", "Fisio Activa {barrio}", "Clínica del Movimiento {barrio}"],
    guion: guionCitas,
  },
  {
    id: "odontologia",
    nombre: "Odontología",
    plural: "consultorios odontológicos",
    consulta: "consultorio odontológico dentista",
    producto: "recepcion-24-7",
    servicios: [
      { nombre: "Consulta y revisión", duracionMin: 30 },
      { nombre: "Limpieza dental", duracionMin: 45 },
      { nombre: "Blanqueamiento", duracionMin: 60 },
      { nombre: "Ortodoncia (control)", duracionMin: 30 },
    ],
    horariosTipicos: semana("09:00", "19:00"),
    nombresDemo: ["Odontología {barrio}", "Consultorio Dental {apellido}", "Sonrisa Plena", "Dental {barrio}", "Clínica Dental {apellido}", "Estudio Odontológico Norte", "Dentistas {barrio}", "Centro Odontológico {apellido}"],
    guion: guionCitas,
  },
  {
    id: "estetica",
    nombre: "Estética y peluquería",
    plural: "centros de estética",
    consulta: "centro de estética peluquería",
    producto: "recepcion-24-7",
    servicios: [
      { nombre: "Corte y peinado", duracionMin: 45 },
      { nombre: "Coloración", duracionMin: 90 },
      { nombre: "Manicura", duracionMin: 40 },
      { nombre: "Limpieza facial", duracionMin: 60 },
    ],
    horariosTipicos: semana("10:00", "20:00", [{ abre: "10:00", cierra: "18:00" }]),
    nombresDemo: ["Estudio {barrio}", "Salón {apellido}", "Bella Forma", "Estética {barrio}", "Casa {apellido} Estilistas", "Espacio Bienestar", "Peluquería {barrio}", "Atelier {apellido}"],
    guion: guionCitas,
  },
  {
    id: "gimnasio",
    nombre: "Gimnasios",
    plural: "gimnasios",
    consulta: "gimnasio",
    producto: "gymos",
    servicios: [
      { nombre: "Clase de prueba", duracionMin: 60 },
      { nombre: "Musculación con instructor", duracionMin: 60 },
      { nombre: "Clase de spinning", duracionMin: 45 },
      { nombre: "Entrenamiento funcional", duracionMin: 50 },
    ],
    horariosTipicos: semana("07:00", "22:00", [{ abre: "09:00", cierra: "14:00" }]),
    nombresDemo: ["Gimnasio {barrio}", "Fuerza {apellido}", "Club Atlético Impulso", "Funcional {barrio}", "Box {apellido}", "Energía Gym", "Entrena {barrio}", "Centro Deportivo {apellido}"],
    guion: [
      { de: "cliente", texto: "Hola, ¿cuánto sale el mes y puedo ir a probar?" },
      { de: "asistente", texto: "¡Hola! Soy {asistente}, de {negocio}. Puedes venir a una {servicio} gratis. Tengo lugar el {dia} a las {hora}. ¿Te anoto?" },
      { de: "cliente", texto: "Sí, anótame" },
      { de: "asistente", texto: "Listo. Te envío tu QR de acceso para el {dia} a las {hora}. Si te gusta, te paso el link para pagar la cuota en línea." },
    ],
  },
  {
    id: "restaurante",
    nombre: "Restaurantes",
    plural: "restaurantes",
    consulta: "restaurante",
    producto: "mesa",
    servicios: [
      { nombre: "Reserva de mesa", duracionMin: 90 },
      { nombre: "Menú del día", duracionMin: 60 },
      { nombre: "Pedido para llevar", duracionMin: 30 },
      { nombre: "Eventos privados", duracionMin: 180 },
    ],
    horariosTipicos: {
      ...semana("12:00", "23:30"),
      6: [{ abre: "12:00", cierra: "00:00" }],
      0: [{ abre: "12:00", cierra: "16:00" }],
    },
    nombresDemo: ["Cocina de {barrio}", "Casa {apellido}", "El Fogón", "Bodegón {barrio}", "Sabores de {apellido}", "La Mesa Larga", "Parrilla {barrio}", "Fonda {apellido}"],
    guion: [
      { de: "cliente", texto: "Hola, ¿tienen mesa para 4 el {dia}?" },
      { de: "asistente", texto: "¡Hola! Soy {asistente}, de {negocio}. Sí, tengo mesa para 4 el {dia} a las {hora}. ¿A nombre de quién la reservo?" },
      { de: "cliente", texto: "A nombre de Carla" },
      { de: "asistente", texto: "Perfecto, Carla. Tu mesa quedó reservada para el {dia} a las {hora}. Si quieres, te envío el menú del día." },
    ],
  },
  {
    id: "reformas",
    nombre: "Reformas y oficios",
    plural: "empresas de reformas",
    consulta: "reformas construcción albañilería",
    producto: "presupuestin",
    servicios: [
      { nombre: "Visita y presupuesto", duracionMin: 60 },
      { nombre: "Reforma de baño", duracionMin: 480 },
      { nombre: "Pintura de interiores", duracionMin: 480 },
      { nombre: "Impermeabilización", duracionMin: 240 },
    ],
    horariosTipicos: semana("08:00", "18:00", [{ abre: "08:00", cierra: "12:00" }]),
    nombresDemo: ["Reformas {barrio}", "Construcciones {apellido}", "Obra Limpia", "Mantenimiento {barrio}", "{apellido} e Hijos Reformas", "Hogar Firme", "Pinturas {barrio}", "Taller {apellido}"],
    guion: [
      { de: "cliente", texto: "Hola, necesito presupuesto para arreglar una humedad en el baño" },
      { de: "asistente", texto: "¡Hola! Soy {asistente}, de {negocio}. Envíame dos fotos y un audio contándome el problema, y agendo la {servicio} para el {dia} a las {hora}." },
      { de: "cliente", texto: "Listo, ya te las mandé" },
      { de: "asistente", texto: "Gracias. Te espero el {dia} a las {hora}; después de la visita te llega el presupuesto en PDF para aprobarlo desde aquí mismo." },
    ],
  },
];

export const ciudades: Ciudad[] = [
  { id: "buenos-aires", nombre: "Buenos Aires", pais: "AR", moneda: "ARS", prefijoDemo: "+54 9 11", barrios: ["Palermo", "Belgrano", "Caballito", "Recoleta", "Villa Crespo", "Almagro"], calles: ["Av. Santa Fe", "Av. Corrientes", "Av. Rivadavia", "Gorriti", "Thames", "Av. Cabildo"] },
  { id: "ciudad-de-mexico", nombre: "Ciudad de México", pais: "MX", moneda: "MXN", prefijoDemo: "+52 55", barrios: ["Roma Norte", "Condesa", "Coyoacán", "Del Valle", "Narvarte", "Polanco"], calles: ["Av. Álvaro Obregón", "Calle Durango", "Av. Insurgentes Sur", "Calle Tamaulipas", "Av. Universidad", "Calle Amsterdam"] },
  { id: "bogota", nombre: "Bogotá", pais: "CO", moneda: "COP", prefijoDemo: "+57 31", barrios: ["Chapinero", "Usaquén", "Teusaquillo", "Cedritos", "Chicó", "La Soledad"], calles: ["Calle 85", "Carrera 15", "Carrera 7", "Calle 53", "Carrera 11", "Calle 140"] },
  { id: "lima", nombre: "Lima", pais: "PE", moneda: "PEN", prefijoDemo: "+51 9", barrios: ["Miraflores", "San Isidro", "Barranco", "Surco", "Jesús María", "Magdalena"], calles: ["Av. Larco", "Av. Benavides", "Calle Schell", "Av. Pardo", "Av. Brasil", "Jr. Huiracocha"] },
  { id: "santiago", nombre: "Santiago de Chile", pais: "CL", moneda: "CLP", prefijoDemo: "+56 9", barrios: ["Providencia", "Ñuñoa", "Las Condes", "Santiago Centro", "Vitacura", "La Reina"], calles: ["Av. Providencia", "Av. Irarrázaval", "Av. Apoquindo", "Av. Italia", "Av. Manuel Montt", "Av. Grecia"] },
  { id: "montevideo", nombre: "Montevideo", pais: "UY", moneda: "UYU", prefijoDemo: "+598 9", barrios: ["Pocitos", "Cordón", "Punta Carretas", "Malvín", "Parque Rodó", "Carrasco"], calles: ["Av. Brasil", "Av. 18 de Julio", "Bvar. España", "Av. Rivera", "Av. Italia", "Bvar. Artigas"] },
];

/** Puntos máximos de cada criterio. Suman 100. */
export const pesos = {
  sinWeb: 30,
  soloRedSocial: 20,
  sinReservas: 25,
  resenasSinResponder: 20,
  valoracionMejorable: 10,
  pocasResenas: 15,
} as const;

export const umbrales = {
  /** Por debajo de esta valoración, la reputación es mejorable. */
  valoracionMinima: 4.2,
  /** Con menos reseñas que esto, el negocio es poco visible. */
  resenasMinimas: 30,
  /** Reseñas sin responder a partir de las cuales se dan todos los puntos. */
  resenasSinResponderMax: 5,
  /** Puntos para considerar la oportunidad alta o media. */
  oportunidadAlta: 60,
  oportunidadMedia: 35,
} as const;

export const limites = {
  /** Resultados por búsqueda (Places cobra por petición; máximo de la API: 20). */
  maxResultados: 12,
  /** Mensajes de WhatsApp que se pueden marcar como enviados por día. Nunca envíos masivos. */
  maxContactosPorDia: 15,
} as const;

/** Dominios que significan que la "web" es en realidad una red social. */
export const dominiosRedesSociales = ["instagram.com", "facebook.com", "fb.com", "tiktok.com", "linktr.ee", "wa.me", "whatsapp.com"];

/** Dominios de plataformas de reservas: si la web apunta aquí, el negocio ya reserva en línea. */
export const dominiosReservas = ["agendapro.com", "calendly.com", "booksy.com", "fresha.com", "setmore.com", "simplybook.me", "doctoralia.com", "reservo.cl", "opentable.com", "covermanager.com", "mesa247.pe", "weibook.co"];

export const remitente = {
  /** Se puede sobrescribir con RADAR_REMITENTE_NOMBRE. */
  nombre: "Jorge",
  oficio: "desarrollo herramientas digitales con IA para",
  /** Nombre de la asistente que aparece en las demos. */
  asistente: "Clara",
};

export function nombreRemitente(): string {
  return process.env.RADAR_REMITENTE_NOMBRE?.trim() || remitente.nombre;
}
