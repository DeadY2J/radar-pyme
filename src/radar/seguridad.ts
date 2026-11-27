/**
 * Seguridad de las rutas API.
 *  - Modo demo (sin GOOGLE_PLACES_API_KEY): todo abierto, solo hay datos ficticios.
 *  - Modo real: los datos y el gasto de la API son de Jorge, así que las rutas
 *    exigen RADAR_TOKEN en la cabecera x-radar-token. Sin RADAR_TOKEN configurado,
 *    se niegan (mejor cerrado por defecto que una clave de Google abierta al mundo).
 *  - limitar(): límite de peticiones por clave (IP) en ventana deslizante, en memoria.
 */
import { createHash, timingSafeEqual } from "node:crypto";
import { placesActivo } from "./fuentes/places";

export type Acceso = { ok: true } | { ok: false; estado: 401 | 503; error: string };

const resumen = (t: string) => createHash("sha256").update(t).digest();

export function comprobarAcceso(req: Request): Acceso {
  if (!placesActivo()) return { ok: true };
  const esperado = process.env.RADAR_TOKEN?.trim();
  if (!esperado || esperado.length < 16) {
    return { ok: false, estado: 503, error: "Configura RADAR_TOKEN (16 caracteres o más) para usar Google Places." };
  }
  const recibido = req.headers.get("x-radar-token") ?? "";
  // Se comparan resúmenes de igual longitud, en tiempo constante.
  if (!timingSafeEqual(resumen(recibido), resumen(esperado))) return { ok: false, estado: 401, error: "Clave de acceso incorrecta." };
  return { ok: true };
}

const ventanas = new Map<string, number[]>();

/** Devuelve true si la petición cabe en el límite; false si hay que rechazarla (429). */
export function limitar(clave: string, max: number, ventanaMs: number, ahora: number = Date.now()): boolean {
  const recientes = (ventanas.get(clave) ?? []).filter((t) => ahora - t < ventanaMs);
  if (recientes.length >= max) {
    ventanas.set(clave, recientes);
    return false;
  }
  recientes.push(ahora);
  ventanas.set(clave, recientes);
  if (ventanas.size > 5000) for (const [k, v] of ventanas) if (!v.some((t) => ahora - t < ventanaMs)) ventanas.delete(k);
  return true;
}

export function ipDe(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export function reiniciarLimites() {
  ventanas.clear();
}

/** Origen público para los enlaces de demo: RADAR_URL_PUBLICA o el de la petición. */
export function origenPublico(req: Request): string {
  const configurado = process.env.RADAR_URL_PUBLICA?.trim().replace(/\/$/, "");
  if (configurado && /^https?:\/\//.test(configurado)) return configurado;
  return new URL(req.url).origin;
}
