import { aEntradaPresupuesto } from "@/radar/presupuesto";
import { slug } from "@/radar/fuentes/demo";
import { comprobarAcceso, origenPublico } from "@/radar/seguridad";
import { prospectoPorId, urlDemo } from "@/radar/vista";

/** Descarga la entrada tipada para el generador de presupuestos en PDF (fase 5). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const acceso = comprobarAcceso(req);
  if (!acceso.ok) return Response.json({ error: acceso.error }, { status: acceso.estado });
  const { id } = await params;
  const p = id.length <= 200 ? prospectoPorId(id) : undefined;
  if (!p) return Response.json({ error: "No encontrado." }, { status: 404 });
  const entrada = aEntradaPresupuesto(p, urlDemo(origenPublico(req), p.id));
  return new Response(JSON.stringify(entrada, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="presupuesto-${slug(p.negocio.nombre) || "negocio"}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
