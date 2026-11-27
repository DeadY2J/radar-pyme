import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST as buscar } from "@/app/api/buscar/route";
import { POST as contacto } from "@/app/api/prospectos/[id]/contacto/route";
import { GET as presupuesto } from "@/app/api/prospectos/[id]/presupuesto/route";
import { almacen } from "@/radar/almacen";
import { comprobarAcceso, limitar, reiniciarLimites } from "@/radar/seguridad";
import { prospectoPorId } from "@/radar/vista";

const pedir = (cuerpo: unknown, cabeceras: Record<string, string> = {}) =>
  new Request("http://localhost:3000/api/buscar", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4", ...cabeceras },
    body: JSON.stringify(cuerpo),
  });
const params = (id: string) => ({ params: Promise.resolve({ id }) });

const entorno = { ...process.env };
beforeEach(() => {
  delete process.env.GOOGLE_PLACES_API_KEY;
  delete process.env.RADAR_TOKEN;
  almacen.reiniciar();
  reiniciarLimites();
});
afterEach(() => {
  process.env = { ...entorno };
});

describe("API en modo demo", () => {
  it("busca y devuelve prospectos con demo y mensaje listos", async () => {
    const res = await buscar(pedir({ sector: "odontologia", ciudad: "bogota" }));
    expect(res.status).toBe(200);
    const datos = await res.json();
    expect(datos.modoDemo).toBe(true);
    expect(datos.prospectos).toHaveLength(8);
    const p = datos.prospectos[0];
    expect(p.urlDemo).toBe(`http://localhost:3000/demo/${p.id}`);
    expect(p.mensaje.enlace).toMatch(/^https:\/\/wa\.me\/\?text=/);
  });

  it("valida la entrada", async () => {
    expect((await buscar(pedir({ sector: "ovnis", ciudad: "bogota" }))).status).toBe(400);
    expect((await buscar(pedir("basura"))).status).toBe(400);
  });

  it("limita las búsquedas por IP", async () => {
    for (let i = 0; i < 10; i++) expect((await buscar(pedir({ sector: "gimnasio", ciudad: "lima" }))).status).toBe(200);
    expect((await buscar(pedir({ sector: "gimnasio", ciudad: "lima" }))).status).toBe(429);
  });

  it("marca un contacto una sola vez y respeta la lista de no contactar", async () => {
    const { prospectos } = await (await buscar(pedir({ sector: "restaurante", ciudad: "santiago" }))).json();
    const [a, b] = prospectos;
    const req = (accion: string) => new Request("http://localhost/x", { method: "POST", body: JSON.stringify({ accion }) });
    const r1 = await contacto(req("enviado"), params(a.id));
    expect(r1.status).toBe(200);
    expect((await r1.json()).contactos.hoy).toBe(1);
    expect((await contacto(req("enviado"), params(a.id))).status).toBe(409);
    expect((await contacto(req("no-contactar"), params(b.id))).status).toBe(200);
    expect((await contacto(req("enviado"), params(b.id))).status).toBe(409);
    expect((await contacto(req("borrar-todo"), params(b.id))).status).toBe(400);
    expect((await contacto(req("enviado"), params("no-existe"))).status).toBe(404);
  });

  it("descarga la entrada de presupuesto como JSON", async () => {
    const { prospectos } = await (await buscar(pedir({ sector: "reformas", ciudad: "montevideo" }))).json();
    const res = await presupuesto(new Request("http://localhost:3000/x"), params(prospectos[0].id));
    expect(res.headers.get("Content-Disposition")).toMatch(/attachment; filename="presupuesto-.+\.json"/);
    const e = await res.json();
    expect(e.producto.nombre).toBe("Presupuestín");
    expect(e.moneda).toBe("UYU");
  });

  it("una demo ficticia se reconstruye aunque el almacén se haya vaciado (reinicio del servidor)", async () => {
    const { prospectos } = await (await buscar(pedir({ sector: "estetica", ciudad: "ciudad-de-mexico" }))).json();
    almacen.reiniciar();
    expect(prospectoPorId(prospectos[0].id)?.negocio.nombre).toBe(prospectos[0].negocio.nombre);
    expect(prospectoPorId("demo-estetica-ciudad-de-mexico-inventado")).toBeUndefined();
  });
});

describe("API con Google Places activado", () => {
  it("sin RADAR_TOKEN configurado se niega (cerrado por defecto)", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "clave";
    const res = await buscar(pedir({ sector: "gimnasio", ciudad: "lima" }));
    expect(res.status).toBe(503);
  });

  it("exige la clave de acceso correcta", () => {
    process.env.GOOGLE_PLACES_API_KEY = "clave";
    process.env.RADAR_TOKEN = "un-token-largo-de-prueba";
    expect(comprobarAcceso(pedir({}))).toMatchObject({ ok: false, estado: 401 });
    expect(comprobarAcceso(pedir({}, { "x-radar-token": "otro" }))).toMatchObject({ ok: false, estado: 401 });
    expect(comprobarAcceso(pedir({}, { "x-radar-token": "un-token-largo-de-prueba" }))).toEqual({ ok: true });
  });

  it("no reconstruye demos ficticias fuera del modo demo", async () => {
    process.env.GOOGLE_PLACES_API_KEY = "clave";
    expect(prospectoPorId("demo-gimnasio-lima-loquesea")).toBeUndefined();
  });
});

describe("límite de peticiones", () => {
  it("ventana deslizante", () => {
    expect(limitar("k", 2, 1000, 0)).toBe(true);
    expect(limitar("k", 2, 1000, 10)).toBe(true);
    expect(limitar("k", 2, 1000, 20)).toBe(false);
    expect(limitar("k", 2, 1000, 1500)).toBe(true);
  });
});
