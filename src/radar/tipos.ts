/** Tipos compartidos por todo Radar Pyme. Sin dependencias. */

/** 0 = domingo … 6 = sábado */
export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Franja = { abre: string; cierra: string }; // "HH:MM"
/** Día sin franjas = cerrado. */
export type Horarios = Record<DiaSemana, Franja[]>;

export type Negocio = {
  /** Id estable de la fuente (place id de Google o id del modo demo). */
  id: string;
  fuente: "demo" | "google";
  nombre: string;
  sector: string;
  ciudad: string;
  pais: string;
  direccion: string;
  /** Teléfono en formato internacional, o null si la ficha no lo tiene. */
  telefono: string | null;
  web: string | null;
  valoracion: number | null;
  totalResenas: number;
  /** null = sin datos (Google Places no informa si el dueño respondió). */
  resenasSinResponder: number | null;
  /** null = sin datos. */
  reservasEnLinea: boolean | null;
  /** null = la ficha no trae horarios. */
  horarios: Horarios | null;
};

export type CriterioId =
  | "sinWeb"
  | "soloRedSocial"
  | "sinReservas"
  | "resenasSinResponder"
  | "valoracionMejorable"
  | "pocasResenas";

export type Motivo = {
  id: CriterioId;
  etiqueta: string;
  puntos: number;
  max: number;
  /** true si no hay datos para evaluar este criterio (no suma ni resta). */
  sinDatos: boolean;
};

export type Nivel = "alta" | "media" | "baja";

export type Puntuacion = {
  total: number;
  nivel: Nivel;
  /** Sin teléfono no se puede escribir por WhatsApp. */
  contactable: boolean;
  motivos: Motivo[];
};

export type Prospecto = {
  /** Id aleatorio e impredecible: es el que va en el enlace de la demo. */
  id: string;
  negocio: Negocio;
  puntuacion: Puntuacion;
};
