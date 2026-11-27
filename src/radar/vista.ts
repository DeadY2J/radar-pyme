/** Lo que la interfaz necesita de cada prospecto, listo para serializar. */
import { almacen as almacenGlobal, type Almacen } from "./almacen";
import { ciudades, limites, sectores } from "./config";
import { negocioDemoPorId } from "./fuentes/demo";
import { modoDemo } from "./busqueda";
import { crearMensaje, type MensajeWhatsApp } from "./mensaje";
import { puntuar } from "./puntuacion";
import type { Prospecto } from "./tipos";

export type VistaProspecto = Prospecto & {
  urlDemo: string;
  mensaje: MensajeWhatsApp;
  contactadoEl: string | null;
  bloqueado: boolean;
};

export function urlDemo(origen: string, id: string): string {
  return `${origen}/demo/${encodeURIComponent(id)}`;
}

export function aVista(p: Prospecto, origen: string, almacen: Almacen = almacenGlobal): VistaProspecto {
  const url = urlDemo(origen, p.id);
  return {
    ...p,
    urlDemo: url,
    mensaje: crearMensaje(p, url, { demo: p.negocio.fuente === "demo" }),
    contactadoEl: almacen.contactadoEl(p.id),
    bloqueado: almacen.bloqueado(p),
  };
}

export function estadoContactos(ahora: Date = new Date(), almacen: Almacen = almacenGlobal) {
  return { hoy: almacen.contactosDelDia(ahora), tope: limites.maxContactosPorDia };
}

/** Busca un prospecto en el almacén; en modo demo, si no está, lo reconstruye. */
export function prospectoPorId(id: string, almacen: Almacen = almacenGlobal): Prospecto | undefined {
  const guardado = almacen.obtener(id);
  if (guardado) return guardado;
  if (!modoDemo()) return undefined;
  const negocio = negocioDemoPorId(id, sectores, ciudades);
  return negocio ? almacen.guardar({ negocio, puntuacion: puntuar(negocio) }) : undefined;
}
