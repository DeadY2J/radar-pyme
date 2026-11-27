/**
 * Fuente real: Google Places API (New), Text Search.
 * https://developers.google.com/maps/documentation/places/web-service/text-search
 *
 * - Se activa solo con GOOGLE_PLACES_API_KEY y se usa solo en el servidor.
 * - La clave va en la cabecera X-Goog-Api-Key, nunca en la URL, y no aparece en los errores.
 * - Field mask mínima: cada campo extra encarece la petición.
 * - Places no informa si el dueño respondió las reseñas: ese dato queda en null (sin datos).
 */
import type { Ciudad, Sector } from "../config";
import type { DiaSemana, Franja, Horarios, Negocio } from "../tipos";

export const URL_TEXT_SEARCH = "https://places.googleapis.com/v1/places:searchText";

export const CAMPOS = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.rating",
  "places.userRatingCount",
  "places.regularOpeningHours",
  "places.businessStatus",
  "places.reservable",
].join(",");

export class ErrorFuente extends Error {
  constructor(mensaje: string, readonly estado?: number) {
    super(mensaje);
    this.name = "ErrorFuente";
  }
}

export function placesActivo(): boolean {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim());
}

/** Forma (parcial) de un Place en la respuesta. Todo opcional: la API omite campos vacíos. */
type PlaceApi = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  reservable?: boolean;
  regularOpeningHours?: {
    periods?: { open?: { day?: number; hour?: number; minute?: number }; close?: { day?: number; hour?: number; minute?: number } }[];
  };
};

const hhmm = (h = 0, m = 0) => `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

/** Convierte los "periods" de Places en franjas por día. Abierto 24 h = periodo sin cierre. */
export function horariosDePeriodos(periods: NonNullable<PlaceApi["regularOpeningHours"]>["periods"]): Horarios | null {
  if (!periods || periods.length === 0) return null;
  const h: Horarios = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const p of periods) {
    const dia = p.open?.day;
    if (dia === undefined || dia < 0 || dia > 6) continue;
    if (!p.close) {
      for (const d of [0, 1, 2, 3, 4, 5, 6] as DiaSemana[]) h[d] = [{ abre: "00:00", cierra: "24:00" }];
      return h;
    }
    const franja: Franja = { abre: hhmm(p.open?.hour, p.open?.minute), cierra: hhmm(p.close.hour, p.close.minute) };
    h[dia as DiaSemana].push(franja);
  }
  return h;
}

export function aNegocio(p: PlaceApi, sector: Sector, ciudad: Ciudad): Negocio | null {
  if (!p.id || !p.displayName?.text) return null;
  if (p.businessStatus && p.businessStatus !== "OPERATIONAL") return null;
  return {
    id: `google-${p.id}`,
    fuente: "google",
    nombre: p.displayName.text.slice(0, 120),
    sector: sector.id,
    ciudad: ciudad.nombre,
    pais: ciudad.pais,
    direccion: (p.formattedAddress ?? "").slice(0, 200),
    telefono: p.internationalPhoneNumber ?? null,
    web: p.websiteUri ?? null,
    valoracion: typeof p.rating === "number" ? p.rating : null,
    totalResenas: p.userRatingCount ?? 0,
    resenasSinResponder: null,
    // "reservable" true = Google sabe que reserva; si falta, no sabemos (no es "no").
    reservasEnLinea: p.reservable === true ? true : null,
    horarios: horariosDePeriodos(p.regularOpeningHours?.periods),
  };
}

export async function buscarEnPlaces(
  sector: Sector,
  ciudad: Ciudad,
  maxResultados: number,
  opciones: { clave?: string; fetch?: typeof fetch } = {},
): Promise<Negocio[]> {
  const clave = opciones.clave ?? process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!clave) throw new ErrorFuente("Falta GOOGLE_PLACES_API_KEY");
  const f = opciones.fetch ?? fetch;

  let res: Response;
  try {
    res = await f(URL_TEXT_SEARCH, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Goog-Api-Key": clave, "X-Goog-FieldMask": CAMPOS },
      body: JSON.stringify({
        textQuery: `${sector.consulta} en ${ciudad.nombre}`,
        languageCode: "es",
        regionCode: ciudad.pais,
        pageSize: Math.max(1, Math.min(20, maxResultados)),
      }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
  } catch {
    throw new ErrorFuente("No se pudo conectar con Google Places");
  }
  if (!res.ok) {
    // No se propaga el cuerpo: puede incluir detalles de la clave o del proyecto.
    throw new ErrorFuente(`Google Places respondió con un error (${res.status})`, res.status);
  }
  const datos = (await res.json().catch(() => null)) as { places?: PlaceApi[] } | null;
  if (!datos) throw new ErrorFuente("Google Places devolvió una respuesta inválida");
  return (datos.places ?? [])
    .map((p) => aNegocio(p, sector, ciudad))
    .filter((n): n is Negocio => n !== null)
    .slice(0, maxResultados);
}
