import { beforeEach, describe, expect, it } from "vitest";
import { Almacen } from "@/radar/almacen";
import { buscar, type Fuente } from "@/radar/busqueda";
import { ciudades, sectores } from "@/radar/config";
import { crearDemo, huecoDeEjemplo } from "@/radar/demo-personalizada";
import { negociosDemo } from "@/radar/fuentes/demo";
import { crearMensaje, numeroWhatsApp } from "@/radar/mensaje";
import { buscarModismos } from "@/radar/neutro";
import { aEntradaPresupuesto } from "@/radar/presupuesto";
import { puntuar } from "@/radar/puntuacion";
import type { Negocio, Prospecto } from "@/radar/tipos";

const fisio = sectores.find((s) => s.id === "fisioterapia")!;
const ba = ciudades.find((c) => c.id === "buenos-aires")!;

function prospecto(n: Partial<Negocio> = {}, id = "p1"): Prospecto {
  const negocio: Negocio = { ...negociosDemo(fisio, ba)[0], ...n };
  return { id, negocio, puntuacion: puntuar(negocio) };
}

describe("búsqueda", () => {
  it("en modo demo devuelve prospectos ordenados y guardados con id impredecible", async () => {
    const almacen = new Almacen();
    const ps = await buscar("fisioterapia", "buenos-aires", { almacen });
    expect(ps).toHaveLength(8);
    expect(ps[0].puntuacion.total).toBeGreaterThanOrEqual(ps[1].puntuacion.total);
    expect(ps.at(-1)!.puntuacion.contactable).toBe(false);
    expect(ps[0].id).toMatch(/^[0-9a-f-]{36}$/);
    expect(almacen.obtener(ps[0].id)).toEqual(ps[0]);
  });

  it("repetir la búsqueda conserva el mismo id (el enlace de la demo no cambia)", async () => {
    const almacen = new Almacen();
    const a = await buscar("gimnasio", "lima", { almacen });
    const b = await buscar("gimnasio", "lima", { almacen });
    expect(b.map((p) => p.id).sort()).toEqual(a.map((p) => p.id).sort());
  });

  it("usa la fuente inyectada (Google Places simulado) y rechaza sector o ciudad desconocidos", async () => {
    const fuente: Fuente = async () => [{ ...negociosDemo(fisio, ba)[0], id: "google-X", fuente: "google" }];
    const ps = await buscar("fisioterapia", "buenos-aires", { almacen: new Almacen(), fuente });
    expect(ps[0].negocio.fuente).toBe("google");
    await expect(buscar("ovnis", "buenos-aires", { almacen: new Almacen() })).rejects.toThrow();
  });
});

describe("contacto uno a uno (nunca masivo)", () => {
  let almacen: Almacen;
  beforeEach(() => { almacen = new Almacen(2); });
  const ahora = new Date("2026-11-27T15:00:00Z");
  const guardar = (tel: string | null, id: string) => almacen.guardar({ negocio: { ...negociosDemo(fisio, ba)[0], id, telefono: tel }, puntuacion: puntuar({ ...negociosDemo(fisio, ba)[0], telefono: tel }) });

  it("un negocio solo se puede marcar como contactado una vez", () => {
    const p = guardar("+54 9 11 5555 0001", "a");
    expect(almacen.registrarContacto(p.id, ahora)).toMatchObject({ ok: true, restantesHoy: 1 });
    expect(almacen.registrarContacto(p.id, ahora)).toEqual({ ok: false, motivo: "ya-contactado" });
  });

  it("dos fichas con el mismo teléfono cuentan como el mismo contacto", () => {
    const a = guardar("+54 9 11 5555 0001", "a");
    const b = guardar("+54 9 11 5555-0001", "b");
    almacen.registrarContacto(a.id, ahora);
    expect(almacen.registrarContacto(b.id, ahora)).toEqual({ ok: false, motivo: "ya-contactado" });
  });

  it("respeta el tope diario y se reinicia al día siguiente", () => {
    const ids = ["1", "2", "3"].map((i) => guardar(`+54 9 11 5555 000${i}`, i).id);
    expect(almacen.registrarContacto(ids[0], ahora).ok).toBe(true);
    expect(almacen.registrarContacto(ids[1], ahora).ok).toBe(true);
    expect(almacen.registrarContacto(ids[2], ahora)).toEqual({ ok: false, motivo: "tope-diario" });
    expect(almacen.registrarContacto(ids[2], new Date("2026-11-28T15:00:00Z")).ok).toBe(true);
  });

  it("quien pide no recibir mensajes queda bloqueado", () => {
    const p = guardar("+54 9 11 5555 0009", "z");
    expect(almacen.marcarNoContactar(p.id)).toBe(true);
    expect(almacen.registrarContacto(p.id, ahora)).toEqual({ ok: false, motivo: "no-contactar" });
  });

  it("sin teléfono o con id inexistente no se registra nada", () => {
    expect(almacen.registrarContacto(guardar(null, "n").id, ahora)).toEqual({ ok: false, motivo: "sin-telefono" });
    expect(almacen.registrarContacto("no-existe", ahora)).toEqual({ ok: false, motivo: "no-existe" });
  });
});

describe("demo personalizada", () => {
  it("lleva el nombre del negocio, los servicios del sector y sus horarios", () => {
    const p = prospecto({ nombre: "Fisio Gorriti" });
    const d = crearDemo(p);
    expect(d.negocio.nombre).toBe("Fisio Gorriti");
    expect(d.producto.nombre).toBe("Recepción 24/7");
    expect(d.servicios.map((s) => s.nombre)).toContain("Reeducación postural (RPG)");
    expect(d.horarios[0]).toEqual({ dia: "lunes", texto: "08:00 a 20:00" });
    expect(d.horarios[6]).toEqual({ dia: "domingo", texto: "Cerrado" });
    expect(d.horariosEstimados).toBe(false);
    expect(d.conversacion.some((l) => l.texto.includes("Fisio Gorriti"))).toBe(true);
  });

  it("si la ficha no trae horarios usa los típicos y lo avisa", () => {
    expect(crearDemo(prospecto({ horarios: null })).horariosEstimados).toBe(true);
  });

  it("el hueco de ejemplo cae dentro del horario", () => {
    const h = { 0: [], 1: [], 2: [], 3: [], 4: [{ abre: "16:00", cierra: "16:30" }], 5: [], 6: [] };
    expect(huecoDeEjemplo(h)).toEqual({ dia: "jueves", hora: "16:00" });
    expect(huecoDeEjemplo({ 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] })).toBeNull();
  });

  it("todas las demos de todos los sectores están en español neutro y sin marcadores", () => {
    for (const s of sectores) for (const n of negociosDemo(s, ba)) {
      const d = crearDemo({ id: "x", negocio: n, puntuacion: puntuar(n) });
      const textos = [...d.conversacion.map((l) => l.texto), ...d.beneficios, ...d.horarios.map((h) => h.texto)];
      for (const t of textos) {
        expect(t).not.toMatch(/[{}]/);
        expect(buscarModismos(t), t).toEqual([]);
      }
    }
  });
});

describe("mensaje de WhatsApp", () => {
  const url = "https://radar.example/demo/p1";

  it("menciona el negocio, el punto débil principal, la demo y ofrece la baja", () => {
    const m = crearMensaje(prospecto({ nombre: "Fisio Gorriti", web: null }), url, { demo: false });
    expect(m.texto).toContain("¿hablo con Fisio Gorriti?");
    expect(m.texto).toContain("no tienes página web propia");
    expect(m.texto).toContain(url);
    expect(m.texto).toContain("no vuelvo a escribirte");
  });

  it("abre el chat con el número del negocio solo fuera del modo demo", () => {
    const p = prospecto({ telefono: "+54 9 11 5555-0001" });
    expect(crearMensaje(p, url, { demo: false }).enlace).toMatch(/^https:\/\/wa\.me\/5491155550001\?text=/);
    const demo = crearMensaje(p, url, { demo: true });
    expect(demo.numero).toBeNull();
    expect(demo.enlace).toMatch(/^https:\/\/wa\.me\/\?text=/);
    expect(decodeURIComponent(demo.enlace.split("text=")[1])).toBe(demo.texto);
  });

  it("solo acepta teléfonos internacionales válidos", () => {
    expect(numeroWhatsApp("+51 987 654 321")).toBe("51987654321");
    expect(numeroWhatsApp("011 4555 0000")).toBeNull();
    expect(numeroWhatsApp("+12")).toBeNull();
    expect(numeroWhatsApp(null)).toBeNull();
  });

  it("todos los mensajes posibles están en español neutro", () => {
    for (const s of sectores) for (const c of ciudades) for (const n of negociosDemo(s, c)) {
      const m = crearMensaje({ id: "x", negocio: n, puntuacion: puntuar(n) }, url, { demo: true });
      expect(buscarModismos(m.texto), m.texto).toEqual([]);
    }
  });
});

describe("entrada para el presupuesto en PDF", () => {
  it("suma módulos según los puntos débiles y no pone precios", () => {
    const e = aEntradaPresupuesto(prospecto({ web: null, resenasSinResponder: 3 }), "https://x.example/demo/p1", new Date("2026-11-27T00:00:00Z"));
    expect(e.producto.id).toBe("recepcion-24-7");
    expect(e.moneda).toBe("ARS");
    expect(e.modulos.map((m) => m.id)).toEqual(["agente-whatsapp", "agenda", "anticipos", "web", "resenas"]);
    expect(e.horasTotales).toBe(14 + 10 + 6 + 8 + 5);
    expect(JSON.stringify(e)).not.toMatch(/precio|tarifa/i);
  });

  it("un negocio maduro solo lleva los módulos base", () => {
    const e = aEntradaPresupuesto(prospecto({ web: "https://x.example", reservasEnLinea: true, resenasSinResponder: 0, valoracion: 4.9, totalResenas: 300 }), "u");
    expect(e.modulos).toHaveLength(3);
  });
});
