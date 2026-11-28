/**
 * Geometría del plano del radar. Es solo presentación: dibuja un barrio ilustrativo
 * (determinista por ciudad) y coloca cada negocio cerca del barrio de su dirección.
 * No es un mapa real ni una regla de negocio: la puntuación sale siempre del motor.
 */

/** Hash FNV-1a de 32 bits, estable entre servidor y navegador. */
export function hash(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Número en [0, 1) derivado del texto y de una sal. */
function azar(texto: string, sal: string): number {
  return hash(`${sal}|${texto}`) / 4294967296;
}

export type Punto = { x: number; y: number; angulo: number };

/** Radio útil del plano, en proporción al lado (el círculo del radar). */
export const RADIO = 0.46;

/** De polar (ángulo en grados, 0 = arriba, sentido horario) a coordenadas 0..1. */
function polar(angulo: number, radio: number): Punto {
  const rad = ((angulo - 90) * Math.PI) / 180;
  return { x: 0.5 + Math.cos(rad) * radio, y: 0.5 + Math.sin(rad) * radio, angulo: ((angulo % 360) + 360) % 360 };
}

/** Dónde se rotula cada barrio: repartidos en un anillo, con un giro propio de la ciudad. */
export function anclasDeBarrios(ciudadId: string, barrios: string[]): (Punto & { nombre: string })[] {
  const giro = azar(ciudadId, "giro") * 360;
  return barrios.map((nombre, i) => {
    const angulo = giro + (360 / barrios.length) * i;
    const radio = RADIO * (0.48 + azar(nombre, "radio") * 0.3);
    return { nombre, ...polar(angulo, radio) };
  });
}

/** Barrio de una dirección "Calle 123, Barrio, Ciudad", si es uno de los conocidos. */
export function barrioDe(direccion: string, barrios: string[]): string | null {
  const partes = direccion.split(",").map((p) => p.trim());
  return barrios.find((b) => partes.includes(b)) ?? null;
}

/**
 * Posición de un negocio: alrededor del ancla de su barrio o, si no se conoce,
 * en cualquier punto del disco. Siempre dentro del círculo del radar.
 */
export function posicionNegocio(id: string, direccion: string, ciudadId: string, barrios: string[]): Punto {
  const barrio = barrioDe(direccion, barrios);
  const ancla = barrio ? anclasDeBarrios(ciudadId, barrios).find((a) => a.nombre === barrio) : undefined;
  const a = azar(id, "a") * 360;
  if (!ancla) return polar(a, RADIO * (0.15 + 0.8 * Math.sqrt(azar(id, "r"))));
  const r = 0.055 + azar(id, "r") * 0.055; // fuera del rótulo del barrio
  const rad = (a * Math.PI) / 180;
  let x = ancla.x + Math.cos(rad) * r;
  let y = ancla.y + Math.sin(rad) * r;
  // Si se sale del disco, se acerca al centro.
  const d = Math.hypot(x - 0.5, y - 0.5);
  if (d > RADIO * 0.94) {
    x = 0.5 + ((x - 0.5) * RADIO * 0.94) / d;
    y = 0.5 + ((y - 0.5) * RADIO * 0.94) / d;
  }
  const angulo = ((Math.atan2(y - 0.5, x - 0.5) * 180) / Math.PI + 90 + 360) % 360;
  return { x, y, angulo };
}

export type Calle = { x1: number; y1: number; x2: number; y2: number; avenida: boolean };

/** Trazado de calles del barrio ilustrativo, en un lienzo de 1000 × 1000. */
export function trazado(ciudadId: string): { giro: number; calles: Calle[]; parque: { x: number; y: number; w: number; h: number } } {
  const giro = -24 + azar(ciudadId, "calles") * 48;
  const paso = 62 + Math.floor(azar(ciudadId, "paso") * 24);
  const calles: Calle[] = [];
  for (let v = -400, i = 0; v <= 1400; v += paso, i++) {
    calles.push({ x1: v, y1: -400, x2: v, y2: 1400, avenida: i % 4 === 0 });
    calles.push({ x1: -400, y1: v, x2: 1400, y2: v, avenida: i % 5 === 2 });
  }
  // Una diagonal que cruza el barrio, como las avenidas que rompen la cuadrícula.
  const d = azar(ciudadId, "diagonal") * 600 - 300;
  calles.push({ x1: -200, y1: 1200 + d, x2: 1200, y2: -200 + d, avenida: true });
  const px = 200 + azar(ciudadId, "px") * 450;
  const py = 200 + azar(ciudadId, "py") * 450;
  return { giro, calles, parque: { x: px, y: py, w: paso * 2, h: paso * 1.5 } };
}
