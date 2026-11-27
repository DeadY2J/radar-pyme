/**
 * Motor de puntuación: cuánta oportunidad hay de ayudar a un negocio con su
 * presencia digital (0-100, más alto = mejor prospecto). Puro y determinista.
 * Nunca inventa datos: si un criterio no se puede evaluar, queda "sin datos".
 */
import { dominiosRedesSociales, dominiosReservas, pesos, umbrales } from "./config";
import type { Motivo, Negocio, Nivel, Prospecto, Puntuacion } from "./tipos";

/** Devuelve el host sin "www." o null si la URL no es válida. */
export function hostDe(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(/^https?:\/\//i.test(url) ? url : `https://${url}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

function coincideDominio(host: string, dominios: readonly string[]): boolean {
  return dominios.some((d) => host === d || host.endsWith(`.${d}`));
}

export function esRedSocial(url: string | null): boolean {
  const host = hostDe(url);
  return host !== null && coincideDominio(host, dominiosRedesSociales);
}

export function esPlataformaReservas(url: string | null): boolean {
  const host = hostDe(url);
  return host !== null && coincideDominio(host, dominiosReservas);
}

/** true/false si se puede saber; null si no hay datos. */
export function tieneReservasEnLinea(n: Negocio): boolean | null {
  if (n.reservasEnLinea !== null) return n.reservasEnLinea;
  if (esPlataformaReservas(n.web)) return true;
  if (!n.web || esRedSocial(n.web)) return false;
  return null; // tiene web propia, pero no sabemos si reserva en línea
}

export function puntuar(n: Negocio): Puntuacion {
  const motivos: Motivo[] = [];
  const web = hostDe(n.web);

  if (!web) {
    motivos.push({ id: "sinWeb", etiqueta: "No tiene página web", puntos: pesos.sinWeb, max: pesos.sinWeb, sinDatos: false });
  } else if (esRedSocial(n.web)) {
    motivos.push({ id: "soloRedSocial", etiqueta: "Su web es solo una red social", puntos: pesos.soloRedSocial, max: pesos.sinWeb, sinDatos: false });
  } else {
    motivos.push({ id: "sinWeb", etiqueta: "Tiene página web propia", puntos: 0, max: pesos.sinWeb, sinDatos: false });
  }

  const reservas = tieneReservasEnLinea(n);
  motivos.push({
    id: "sinReservas",
    etiqueta: reservas === null ? "Reservas en línea: sin datos" : reservas ? "Ya reserva en línea" : "No se puede reservar en línea",
    puntos: reservas === false ? pesos.sinReservas : 0,
    max: pesos.sinReservas,
    sinDatos: reservas === null,
  });

  if (n.resenasSinResponder === null) {
    motivos.push({ id: "resenasSinResponder", etiqueta: "Reseñas sin responder: sin datos", puntos: 0, max: pesos.resenasSinResponder, sinDatos: true });
  } else {
    const k = Math.max(0, Math.floor(n.resenasSinResponder));
    const proporcion = Math.min(1, k / umbrales.resenasSinResponderMax);
    motivos.push({
      id: "resenasSinResponder",
      etiqueta: k === 0 ? "Responde sus reseñas" : `${k} ${k === 1 ? "reseña" : "reseñas"} sin responder`,
      puntos: Math.round(pesos.resenasSinResponder * proporcion),
      max: pesos.resenasSinResponder,
      sinDatos: false,
    });
  }

  if (n.valoracion === null) {
    motivos.push({ id: "valoracionMejorable", etiqueta: "Valoración: sin datos", puntos: 0, max: pesos.valoracionMejorable, sinDatos: true });
  } else {
    const baja = n.valoracion < umbrales.valoracionMinima;
    motivos.push({
      id: "valoracionMejorable",
      etiqueta: baja ? `Valoración mejorable (${n.valoracion.toFixed(1)})` : `Buena valoración (${n.valoracion.toFixed(1)})`,
      puntos: baja ? pesos.valoracionMejorable : 0,
      max: pesos.valoracionMejorable,
      sinDatos: false,
    });
  }

  const pocas = n.totalResenas < umbrales.resenasMinimas;
  motivos.push({
    id: "pocasResenas",
    etiqueta: pocas ? `Pocas reseñas (${n.totalResenas})` : `${n.totalResenas} reseñas`,
    puntos: pocas ? pesos.pocasResenas : 0,
    max: pesos.pocasResenas,
    sinDatos: false,
  });

  const total = Math.min(100, motivos.reduce((s, m) => s + m.puntos, 0));
  return { total, nivel: nivelDe(total), contactable: Boolean(n.telefono && n.telefono.replace(/\D/g, "").length >= 8), motivos };
}

export function nivelDe(total: number): Nivel {
  if (total >= umbrales.oportunidadAlta) return "alta";
  if (total >= umbrales.oportunidadMedia) return "media";
  return "baja";
}

/** Contactables primero, luego más oportunidad, luego por nombre. */
export function ordenar(ps: Prospecto[]): Prospecto[] {
  return [...ps].sort(
    (a, b) =>
      Number(b.puntuacion.contactable) - Number(a.puntuacion.contactable) ||
      b.puntuacion.total - a.puntuacion.total ||
      a.negocio.nombre.localeCompare(b.negocio.nombre, "es"),
  );
}

/** El motivo con más puntos: es el que abre el mensaje de WhatsApp. */
export function motivoPrincipal(p: Puntuacion): Motivo | null {
  const conPuntos = p.motivos.filter((m) => m.puntos > 0);
  if (conPuntos.length === 0) return null;
  return conPuntos.reduce((a, b) => (b.puntos > a.puntos ? b : a));
}
