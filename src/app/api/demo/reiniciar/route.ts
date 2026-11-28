import { almacen } from "@/radar/almacen";
import { modoDemo } from "@/radar/busqueda";
import { ipDe, limitar } from "@/radar/seguridad";
import { estadoContactos } from "@/radar/vista";

/** Solo en modo demo: deja el almacén como recién arrancado para repetir el modo presentación. */
export async function POST(req: Request) {
  if (!modoDemo()) return Response.json({ error: "No disponible." }, { status: 404 });
  if (!limitar(`reiniciar:${ipDe(req)}`, 10, 60_000)) return Response.json({ error: "Demasiadas peticiones, espera un momento." }, { status: 429 });
  almacen.reiniciar();
  return Response.json({ contactos: estadoContactos() });
}
