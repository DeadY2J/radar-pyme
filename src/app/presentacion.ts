/**
 * Guion del modo presentación: los 60 segundos de PROSPECCION.md, con sus tiempos y
 * la voz en off como subtítulo. Solo presentación: los datos salen del motor en modo demo.
 */
export type Foco = "busqueda" | "motivos" | "demo" | "mensaje" | "presupuesto";

export type Escena = {
  /** Segundo en que empieza la escena. */
  desde: number;
  foco: Foco;
  subtitulo: string;
};

export const DURACION = 60;

/** Búsqueda fija del guion. */
export const busquedaGuion = { sector: "fisioterapia", ciudad: "buenos-aires" } as const;

export const escenas: Escena[] = [
  { desde: 0, foco: "busqueda", subtitulo: "Elijo un sector y una ciudad, y el radar encuentra los negocios con más oportunidad." },
  { desde: 10, foco: "motivos", subtitulo: "Cada puntuación se explica con datos reales; lo que no se sabe aparece como sin datos." },
  { desde: 20, foco: "demo", subtitulo: "Y para cada negocio prepara una demo con su nombre, sus servicios y sus horarios." },
  { desde: 35, foco: "mensaje", subtitulo: "El mensaje se escribe solo, pero lo envía una persona, uno a uno, con un tope diario." },
  { desde: 50, foco: "presupuesto", subtitulo: "Y el siguiente paso ya está listo: el presupuesto. Radar Pyme, de la Fábrica." },
];

/** Escena que toca en el segundo t (la última empezada). */
export function escenaEn(t: number): Escena {
  return escenas.reduce((actual, e) => (t >= e.desde ? e : actual), escenas[0]);
}
