import { z } from "zod";
import { buscar, modoDemo } from "@/radar/busqueda";
import { ciudades, sectores } from "@/radar/config";
import { ErrorFuente } from "@/radar/fuentes/places";
import { comprobarAcceso, ipDe, limitar, origenPublico } from "@/radar/seguridad";
import { aVista, estadoContactos } from "@/radar/vista";

const Entrada = z.object({
  sector: z.enum(sectores.map((s) => s.id) as [string, ...string[]]),
  ciudad: z.enum(ciudades.map((c) => c.id) as [string, ...string[]]),
});

export async function POST(req: Request) {
  const acceso = comprobarAcceso(req);
  if (!acceso.ok) return Response.json({ error: acceso.error }, { status: acceso.estado });
  // Cada búsqueda real cuesta dinero en Google Places: límite estricto.
  if (!limitar(`buscar:${ipDe(req)}`, 10, 60_000)) return Response.json({ error: "Demasiadas búsquedas, espera un momento." }, { status: 429 });
  const datos = Entrada.safeParse(await req.json().catch(() => null));
  if (!datos.success) return Response.json({ error: "Sector o ciudad inválidos." }, { status: 400 });
  try {
    const prospectos = await buscar(datos.data.sector, datos.data.ciudad);
    const origen = origenPublico(req);
    return Response.json({ modoDemo: modoDemo(), contactos: estadoContactos(), prospectos: prospectos.map((p) => aVista(p, origen)) });
  } catch (e) {
    const mensaje = e instanceof ErrorFuente ? e.message : "No se pudo completar la búsqueda.";
    return Response.json({ error: mensaje }, { status: 502 });
  }
}
