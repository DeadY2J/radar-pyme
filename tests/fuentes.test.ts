import { describe, expect, it, vi } from "vitest";
import { ciudades, sectores } from "@/radar/config";
import { negociosDemo } from "@/radar/fuentes/demo";
import { aNegocio, buscarEnPlaces, CAMPOS, ErrorFuente, horariosDePeriodos, URL_TEXT_SEARCH } from "@/radar/fuentes/places";
import { buscarModismos } from "@/radar/neutro";
import { puntuar } from "@/radar/puntuacion";

const fisio = sectores.find((s) => s.id === "fisioterapia")!;
const lima = ciudades.find((c) => c.id === "lima")!;

describe("fuente demo", () => {
  it("es determinista: la misma búsqueda devuelve los mismos negocios", () => {
    expect(negociosDemo(fisio, lima)).toEqual(negociosDemo(fisio, lima));
    expect(negociosDemo(fisio, lima)[0].nombre).not.toBe(negociosDemo(fisio, ciudades[0])[0].nombre);
  });

  it("cada búsqueda trae variedad de oportunidades (alta, media y baja) y un negocio sin teléfono", () => {
    const ps = negociosDemo(fisio, lima).map(puntuar);
    const niveles = new Set(ps.map((p) => p.nivel));
    expect(niveles).toEqual(new Set(["alta", "media", "baja"]));
    expect(ps.filter((p) => !p.contactable)).toHaveLength(1);
  });

  it("no usa dominios que puedan ser reales para las webs propias", () => {
    for (const s of sectores) {
      for (const n of negociosDemo(s, lima)) {
        if (n.web && !/instagram|facebook|agendapro/.test(n.web)) expect(n.web).toMatch(/\.example$/);
      }
    }
  });

  it("los nombres y direcciones de todos los sectores y ciudades están en español neutro y sin marcadores", () => {
    for (const s of sectores) for (const c of ciudades) {
      for (const n of negociosDemo(s, c)) {
        expect(n.nombre).not.toMatch(/[{}]/);
        expect(buscarModismos(n.nombre)).toEqual([]);
        expect(new Set(negociosDemo(s, c).map((x) => x.id)).size).toBe(8);
      }
    }
  });
});

const placeEjemplo = {
  id: "ChIJabc",
  displayName: { text: "Fisio Larco" },
  formattedAddress: "Av. Larco 345, Miraflores, Lima, Perú",
  internationalPhoneNumber: "+51 987 654 321",
  websiteUri: "https://instagram.com/fisiolarco",
  rating: 4.4,
  userRatingCount: 23,
  businessStatus: "OPERATIONAL",
  regularOpeningHours: {
    periods: [
      { open: { day: 1, hour: 8, minute: 0 }, close: { day: 1, hour: 13, minute: 0 } },
      { open: { day: 1, hour: 15, minute: 30 }, close: { day: 1, hour: 20, minute: 0 } },
    ],
  },
};

function respuesta(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: { "Content-Type": "application/json" } });
}

describe("Google Places (respuestas simuladas)", () => {
  it("envía la clave en la cabecera, con field mask, y no en la URL", async () => {
    const f = vi.fn(async (..._args: Parameters<typeof fetch>) => respuesta({ places: [placeEjemplo] }));
    await buscarEnPlaces(fisio, lima, 5, { clave: "CLAVE-SECRETA", fetch: f as unknown as typeof fetch });
    const [url, init] = f.mock.calls[0];
    expect(url).toBe(URL_TEXT_SEARCH);
    expect(String(url)).not.toContain("CLAVE-SECRETA");
    const h = init!.headers as Record<string, string>;
    expect(h["X-Goog-Api-Key"]).toBe("CLAVE-SECRETA");
    expect(h["X-Goog-FieldMask"]).toBe(CAMPOS);
    const cuerpo = JSON.parse(String(init!.body));
    expect(cuerpo).toMatchObject({ textQuery: "kinesiología fisioterapia en Lima", languageCode: "es", regionCode: "PE", pageSize: 5 });
  });

  it("convierte un Place en Negocio sin inventar las reseñas sin responder", async () => {
    const f = async () => respuesta({ places: [placeEjemplo] });
    const [n] = await buscarEnPlaces(fisio, lima, 5, { clave: "k", fetch: f as unknown as typeof fetch });
    expect(n).toMatchObject({
      id: "google-ChIJabc",
      fuente: "google",
      nombre: "Fisio Larco",
      telefono: "+51 987 654 321",
      valoracion: 4.4,
      totalResenas: 23,
      resenasSinResponder: null,
      reservasEnLinea: null,
    });
    expect(n.horarios![1]).toEqual([{ abre: "08:00", cierra: "13:00" }, { abre: "15:30", cierra: "20:00" }]);
    expect(n.horarios![0]).toEqual([]);
    const p = puntuar(n);
    expect(p.motivos.find((m) => m.id === "resenasSinResponder")!.sinDatos).toBe(true);
    expect(p.motivos.find((m) => m.id === "soloRedSocial")!.puntos).toBeGreaterThan(0);
  });

  it("descarta negocios cerrados y entradas incompletas", () => {
    expect(aNegocio({ ...placeEjemplo, businessStatus: "CLOSED_PERMANENTLY" }, fisio, lima)).toBeNull();
    expect(aNegocio({ id: "x" }, fisio, lima)).toBeNull();
  });

  it("abierto 24 horas (periodo sin cierre) y sin horarios", () => {
    const h = horariosDePeriodos([{ open: { day: 0, hour: 0, minute: 0 } }])!;
    expect(h[3]).toEqual([{ abre: "00:00", cierra: "24:00" }]);
    expect(horariosDePeriodos(undefined)).toBeNull();
  });

  it("un error de la API no filtra la clave ni el cuerpo de la respuesta", async () => {
    const f = async () => respuesta({ error: { message: "API key CLAVE-SECRETA not valid" } }, 403);
    const err = await buscarEnPlaces(fisio, lima, 5, { clave: "CLAVE-SECRETA", fetch: f as unknown as typeof fetch }).catch((e) => e);
    expect(err).toBeInstanceOf(ErrorFuente);
    expect(err.estado).toBe(403);
    expect(err.message).not.toContain("CLAVE-SECRETA");
  });

  it("los fallos de red y las respuestas inválidas dan un error controlado", async () => {
    const caida = async () => { throw new Error("ECONNRESET CLAVE-SECRETA"); };
    const e1 = await buscarEnPlaces(fisio, lima, 5, { clave: "CLAVE-SECRETA", fetch: caida as unknown as typeof fetch }).catch((e) => e);
    expect(e1).toBeInstanceOf(ErrorFuente);
    expect(e1.message).not.toContain("CLAVE-SECRETA");
    const basura = async () => new Response("<html>", { status: 200 });
    await expect(buscarEnPlaces(fisio, lima, 5, { clave: "k", fetch: basura as unknown as typeof fetch })).rejects.toBeInstanceOf(ErrorFuente);
  });

  it("sin clave no llama a la API", async () => {
    const anterior = process.env.GOOGLE_PLACES_API_KEY;
    delete process.env.GOOGLE_PLACES_API_KEY;
    const f = vi.fn();
    await expect(buscarEnPlaces(fisio, lima, 5, { fetch: f as unknown as typeof fetch })).rejects.toBeInstanceOf(ErrorFuente);
    expect(f).not.toHaveBeenCalled();
    if (anterior !== undefined) process.env.GOOGLE_PLACES_API_KEY = anterior;
  });

  it("respeta el tope de resultados aunque la API devuelva más", async () => {
    const muchos = Array.from({ length: 20 }, (_, i) => ({ ...placeEjemplo, id: `p${i}` }));
    const f = async () => respuesta({ places: muchos });
    expect(await buscarEnPlaces(fisio, lima, 3, { clave: "k", fetch: f as unknown as typeof fetch })).toHaveLength(3);
  });
});
