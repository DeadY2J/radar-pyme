import { describe, expect, it } from "vitest";
import { pesos, sectores } from "@/radar/config";
import { buscarModismos, esNeutro } from "@/radar/neutro";
import { esPlataformaReservas, esRedSocial, hostDe, motivoPrincipal, ordenar, puntuar, tieneReservasEnLinea } from "@/radar/puntuacion";
import type { Negocio, Prospecto } from "@/radar/tipos";

const base: Negocio = {
  id: "n1",
  fuente: "demo",
  nombre: "Fisio Centro",
  sector: "fisioterapia",
  ciudad: "Lima",
  pais: "PE",
  direccion: "Av. Larco 100",
  telefono: "+51 987 654 321",
  web: "https://fisiocentro.example",
  valoracion: 4.7,
  totalResenas: 120,
  resenasSinResponder: 0,
  reservasEnLinea: true,
  horarios: null,
};

const motivo = (n: Negocio, id: string) => puntuar(n).motivos.find((m) => m.id === id)!;

describe("puntuación de oportunidad", () => {
  it("los pesos máximos suman 100", () => {
    const { soloRedSocial: _, ...maximos } = pesos;
    expect(Object.values(maximos).reduce((a, b) => a + b, 0)).toBe(100);
  });

  it("un negocio digitalmente maduro tiene oportunidad baja", () => {
    const p = puntuar(base);
    expect(p.total).toBe(0);
    expect(p.nivel).toBe("baja");
    expect(motivoPrincipal(p)).toBeNull();
  });

  it("un negocio sin web, sin reservas y con reseñas sin responder es oportunidad alta", () => {
    const p = puntuar({ ...base, web: null, reservasEnLinea: null, resenasSinResponder: 7, totalResenas: 12, valoracion: 3.9 });
    expect(p.total).toBe(100);
    expect(p.nivel).toBe("alta");
    expect(motivoPrincipal(p)?.id).toBe("sinWeb");
  });

  it("una web que es Instagram o Facebook cuenta como solo red social", () => {
    expect(esRedSocial("https://www.instagram.com/fisiocentro")).toBe(true);
    expect(esRedSocial("facebook.com/fisio")).toBe(true);
    expect(esRedSocial("https://fisiocentro.example")).toBe(false);
    expect(motivo({ ...base, web: "https://instagram.com/x" }, "soloRedSocial").puntos).toBe(pesos.soloRedSocial);
  });

  it("no confunde dominios parecidos con redes sociales", () => {
    expect(esRedSocial("https://noinstagram.com")).toBe(false);
    expect(esRedSocial("https://instagram.com.estafa.example")).toBe(false);
    expect(hostDe("no es una url ::")).toBeNull();
  });

  it("deduce las reservas en línea solo cuando hay base para hacerlo", () => {
    const sinDato = { ...base, reservasEnLinea: null };
    expect(tieneReservasEnLinea({ ...sinDato, web: "https://www.agendapro.com/fisio" })).toBe(true);
    expect(esPlataformaReservas("https://fisio.booksy.com")).toBe(true);
    expect(tieneReservasEnLinea({ ...sinDato, web: null })).toBe(false);
    expect(tieneReservasEnLinea({ ...sinDato, web: "https://instagram.com/x" })).toBe(false);
    // Web propia: no sabemos si reserva, así que no suma puntos.
    const m = motivo(sinDato, "sinReservas");
    expect(m.sinDatos).toBe(true);
    expect(m.puntos).toBe(0);
  });

  it("las reseñas sin responder sin datos (Google Places) no suman ni se inventan", () => {
    const m = motivo({ ...base, resenasSinResponder: null }, "resenasSinResponder");
    expect(m.sinDatos).toBe(true);
    expect(m.puntos).toBe(0);
    expect(m.etiqueta).toContain("sin datos");
  });

  it("las reseñas sin responder suman de forma proporcional hasta el máximo", () => {
    expect(motivo({ ...base, resenasSinResponder: 1 }, "resenasSinResponder").puntos).toBe(4);
    expect(motivo({ ...base, resenasSinResponder: 50 }, "resenasSinResponder").puntos).toBe(pesos.resenasSinResponder);
    expect(motivo({ ...base, resenasSinResponder: 1 }, "resenasSinResponder").etiqueta).toBe("1 reseña sin responder");
  });

  it("sin teléfono el negocio no es contactable por WhatsApp", () => {
    expect(puntuar({ ...base, telefono: null }).contactable).toBe(false);
    expect(puntuar({ ...base, telefono: "123" }).contactable).toBe(false);
    expect(puntuar(base).contactable).toBe(true);
  });

  it("ordena contactables primero y después por oportunidad", () => {
    const p = (id: string, n: Partial<Negocio>): Prospecto => {
      const negocio = { ...base, id, nombre: id, ...n };
      return { id, negocio, puntuacion: puntuar(negocio) };
    };
    const lista = ordenar([p("maduro", {}), p("sin-telefono", { web: null, telefono: null }), p("sin-web", { web: null })]);
    expect(lista.map((x) => x.id)).toEqual(["sin-web", "maduro", "sin-telefono"]);
  });
});

describe("español neutro", () => {
  it("detecta voseo y modismos", () => {
    expect(buscarModismos("Che, ¿vos tenés turno?").length).toBeGreaterThanOrEqual(3);
    expect(esNeutro("Pasame la seña")).toBe(false);
    expect(esNeutro("¿Tienes una cita disponible? Envíame el anticipo.")).toBe(true);
  });

  it("no da falsos positivos con palabras normales", () => {
    expect(esNeutro("Además, en tu país la clínica responde rápido y reserva en línea.")).toBe(true);
  });

  it("todas las plantillas de la configuración están en español neutro", () => {
    for (const s of sectores) {
      for (const linea of s.guion.filter((l) => l.de === "asistente")) expect(buscarModismos(linea.texto), linea.texto).toEqual([]);
      for (const serv of s.servicios) expect(esNeutro(serv.nombre), serv.nombre).toBe(true);
    }
  });
});
