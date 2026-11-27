import { z } from "zod";
import { almacen } from "@/radar/almacen";
import { comprobarAcceso, ipDe, limitar, origenPublico } from "@/radar/seguridad";
import { aVista, estadoContactos, prospectoPorId } from "@/radar/vista";

const Entrada = z.object({ accion: z.enum(["enviado", "no-contactar"]) });

const textos = {
  "no-existe": "Ese negocio ya no está en la lista. Vuelve a buscar.",
  "sin-telefono": "Este negocio no tiene un teléfono para WhatsApp.",
  "ya-contactado": "A este negocio ya le escribiste. Un solo mensaje por negocio.",
  "no-contactar": "Este negocio pidió no recibir mensajes.",
  "tope-diario": "Llegaste al tope de mensajes de hoy. Mañana puedes seguir.",
} as const;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acceso = comprobarAcceso(req);
  if (!acceso.ok) return Response.json({ error: acceso.error }, { status: acceso.estado });
  if (!limitar(`contacto:${ipDe(req)}`, 30, 60_000)) return Response.json({ error: "Demasiadas peticiones, espera un momento." }, { status: 429 });
  const { id } = await params;
  const datos = Entrada.safeParse(await req.json().catch(() => null));
  if (!datos.success || id.length > 200) return Response.json({ error: "Petición inválida." }, { status: 400 });
  const p = prospectoPorId(id);
  if (!p) return Response.json({ error: textos["no-existe"] }, { status: 404 });

  if (datos.data.accion === "no-contactar") {
    if (!almacen.marcarNoContactar(p.id)) return Response.json({ error: textos["sin-telefono"] }, { status: 409 });
  } else {
    const r = almacen.registrarContacto(p.id);
    if (!r.ok) return Response.json({ error: textos[r.motivo] }, { status: 409 });
  }
  return Response.json({ prospecto: aVista(p, origenPublico(req)), contactos: estadoContactos() });
}
