/**
 * Genera la demo personalizada de un negocio: su nombre, los servicios de su
 * sector, sus horarios (los de la ficha o, si no hay, los típicos marcados como
 * estimados) y una conversación de ejemplo con su asistente.
 * Puro: no lee el almacén ni la red.
 */
import { productos, remitente, sectores, type Producto } from "./config";
import type { DiaSemana, Franja, Horarios, Motivo, Prospecto } from "./tipos";

export const nombresDia = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"] as const;
/** Orden de lectura: de lunes a domingo. */
const ordenSemana: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0];

export type DemoPersonalizada = {
  prospectoId: string;
  /** true si el negocio es ficticio (modo demo). */
  ficticio: boolean;
  negocio: { nombre: string; ciudad: string; direccion: string };
  sector: string;
  producto: Pick<Producto, "nombre" | "promesa">;
  asistente: string;
  servicios: { nombre: string; duracionMin: number }[];
  horarios: { dia: string; texto: string }[];
  horariosEstimados: boolean;
  conversacion: { de: "cliente" | "asistente"; texto: string }[];
  beneficios: string[];
};

const beneficioPorMotivo: Partial<Record<Motivo["id"], string>> = {
  sinWeb: "Una página propia con tus servicios y horarios, para que te encuentren en Google.",
  soloRedSocial: "Una página propia además de tus redes, con información clara y siempre actualizada.",
  sinReservas: "Reservas en línea las 24 horas, sin tener que contestar el teléfono.",
  resenasSinResponder: "Respuestas a tus reseñas preparadas con IA: solo tienes que aprobarlas.",
  valoracionMejorable: "Pedido automático de reseñas a los clientes satisfechos.",
  pocasResenas: "Más reseñas en Google gracias a un mensaje amable después de cada visita.",
};

function textoFranjas(fs: Franja[]): string {
  if (fs.length === 0) return "Cerrado";
  return fs.map((f) => `${f.abre} a ${f.cierra}`).join(" y ");
}

const aMin = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const aHHMM = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** Primer hueco de ejemplo: el primer día abierto desde el martes, una hora después de abrir. */
export function huecoDeEjemplo(h: Horarios): { dia: string; hora: string } | null {
  for (const d of [2, 3, 4, 5, 6, 0, 1] as DiaSemana[]) {
    const f = h[d][0];
    if (!f) continue;
    const abre = aMin(f.abre);
    const cierra = f.cierra === "00:00" ? 24 * 60 : aMin(f.cierra);
    const hora = abre + 60 < cierra ? abre + 60 : abre;
    return { dia: nombresDia[d], hora: aHHMM(hora) };
  }
  return null;
}

export function crearDemo(p: Prospecto): DemoPersonalizada {
  const sector = sectores.find((s) => s.id === p.negocio.sector);
  if (!sector) throw new Error(`Sector desconocido: ${p.negocio.sector}`);
  const producto = productos[sector.producto];

  const estimados = p.negocio.horarios === null;
  const h: Horarios = p.negocio.horarios ?? ({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], ...sector.horariosTipicos } as Horarios);
  const hueco = huecoDeEjemplo(h) ?? { dia: "martes", hora: "10:00" };
  const servicio = sector.servicios[0].nombre.toLowerCase();

  const rellenar = (t: string) =>
    t
      .replaceAll("{negocio}", p.negocio.nombre)
      .replaceAll("{asistente}", remitente.asistente)
      .replaceAll("{servicio}", servicio)
      .replaceAll("{dia}", hueco.dia)
      .replaceAll("{hora}", hueco.hora);

  const beneficios = [...p.puntuacion.motivos]
    .filter((m) => m.puntos > 0)
    .sort((a, b) => b.puntos - a.puntos)
    .map((m) => beneficioPorMotivo[m.id])
    .filter((b): b is string => Boolean(b));
  // Los dos últimos criterios comparten objetivo (más y mejores reseñas): no repetir.
  const unicos = [...new Set(beneficios)].slice(0, 3);

  return {
    prospectoId: p.id,
    ficticio: p.negocio.fuente === "demo",
    negocio: { nombre: p.negocio.nombre, ciudad: p.negocio.ciudad, direccion: p.negocio.direccion },
    sector: sector.nombre,
    producto: { nombre: producto.nombre, promesa: producto.promesa },
    asistente: remitente.asistente,
    servicios: sector.servicios,
    horarios: ordenSemana.map((d) => ({ dia: nombresDia[d], texto: textoFranjas(h[d]) })),
    horariosEstimados: estimados,
    conversacion: sector.guion.map((l) => ({ de: l.de, texto: rellenar(l.texto) })),
    beneficios: unicos.length > 0 ? unicos : [`Con ${producto.nombre}: ${producto.promesa}.`],
  };
}
