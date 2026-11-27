/**
 * Fuente del modo demo: negocios ficticios pero creíbles, generados de forma
 * determinista a partir del sector y la ciudad (misma búsqueda = mismos negocios).
 * Las webs usan el dominio reservado ".example" y los teléfonos no se usan para
 * abrir WhatsApp, así que ningún negocio real recibe nada.
 */
import type { Ciudad, Sector } from "../config";
import type { DiaSemana, Horarios, Negocio } from "../tipos";

const apellidos = ["Ferreyra", "Montoya", "Castillo", "Rojas", "Herrera", "Quintana", "Salazar", "Benítez", "Paredes", "Aguirre"];

/** Perfiles de presencia digital: garantizan variedad en cada búsqueda. */
type Perfil = {
  web: "ninguna" | "instagram" | "facebook" | "propia" | "reservas";
  valoracion: number | null;
  totalResenas: number;
  resenasSinResponder: number;
  conTelefono: boolean;
  conHorarios: boolean;
};

const perfiles: Perfil[] = [
  { web: "ninguna", valoracion: 4.6, totalResenas: 38, resenasSinResponder: 6, conTelefono: true, conHorarios: true },
  { web: "instagram", valoracion: 4.3, totalResenas: 12, resenasSinResponder: 3, conTelefono: true, conHorarios: true },
  { web: "propia", valoracion: 4.7, totalResenas: 214, resenasSinResponder: 0, conTelefono: true, conHorarios: true },
  { web: "reservas", valoracion: 4.8, totalResenas: 341, resenasSinResponder: 0, conTelefono: true, conHorarios: true },
  { web: "ninguna", valoracion: 3.9, totalResenas: 9, resenasSinResponder: 2, conTelefono: true, conHorarios: false },
  { web: "facebook", valoracion: 4.4, totalResenas: 57, resenasSinResponder: 11, conTelefono: true, conHorarios: true },
  { web: "propia", valoracion: 4.3, totalResenas: 48, resenasSinResponder: 4, conTelefono: true, conHorarios: true },
  { web: "ninguna", valoracion: 4.5, totalResenas: 15, resenasSinResponder: 1, conTelefono: false, conHorarios: true },
];

/** PRNG determinista (mulberry32). */
export function aleatorio(semilla: string): () => number {
  let h = 1779033703;
  for (let i = 0; i < semilla.length; i++) h = Math.imul(h ^ semilla.charCodeAt(i), 3432918353);
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function barajar<T>(xs: T[], r: () => number): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function slug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function horariosDe(sector: Sector): Horarios {
  const h = {} as Horarios;
  for (const d of [0, 1, 2, 3, 4, 5, 6] as DiaSemana[]) h[d] = sector.horariosTipicos[d] ?? [];
  return h;
}

function webDe(perfil: Perfil, s: string): string | null {
  switch (perfil.web) {
    case "ninguna": return null;
    case "instagram": return `https://www.instagram.com/${s.replace(/-/g, ".")}`;
    case "facebook": return `https://www.facebook.com/${s.replace(/-/g, "")}`;
    case "reservas": return `https://www.agendapro.com/${s}`;
    case "propia": return `https://www.${s}.example`;
  }
}

export function negociosDemo(sector: Sector, ciudad: Ciudad, cantidad = 8): Negocio[] {
  const r = aleatorio(`${sector.id}|${ciudad.id}`);
  const plantillas = barajar(sector.nombresDemo, r);
  const barrios = barajar(ciudad.barrios, r);
  const apes = barajar(apellidos, r);
  const orden = barajar(perfiles, r);

  return orden.slice(0, Math.min(cantidad, perfiles.length)).map((perfil, i) => {
    const barrio = barrios[i % barrios.length];
    const nombre = plantillas[i % plantillas.length].replace("{barrio}", barrio).replace("{apellido}", apes[i % apes.length]);
    const s = slug(nombre);
    const numero = String(Math.floor(r() * 9000) + 1000);
    const calle = ciudad.calles[Math.floor(r() * ciudad.calles.length)];
    const altura = Math.floor(r() * 4800) + 100;
    return {
      id: `demo-${sector.id}-${ciudad.id}-${s}`,
      fuente: "demo",
      nombre,
      sector: sector.id,
      ciudad: ciudad.nombre,
      pais: ciudad.pais,
      direccion: `${calle} ${altura}, ${barrio}, ${ciudad.nombre}`,
      telefono: perfil.conTelefono ? `${ciudad.prefijoDemo} 555 ${numero}` : null,
      web: webDe(perfil, s),
      valoracion: perfil.valoracion,
      totalResenas: perfil.totalResenas,
      resenasSinResponder: perfil.resenasSinResponder,
      reservasEnLinea: perfil.web === "reservas" ? true : perfil.web === "propia" ? false : null,
      horarios: perfil.conHorarios ? horariosDe(sector) : null,
    } satisfies Negocio;
  });
}
