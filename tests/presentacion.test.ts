import { describe, expect, it } from "vitest";
import { DURACION, busquedaGuion, escenaEn, escenas } from "@/app/presentacion";
import { ciudades, sectores } from "@/radar/config";
import { esNeutro } from "@/radar/neutro";
import { politicaCSP } from "@/radar/csp";

describe("modo presentación", () => {
  it("cubre los 60 s en orden y empieza en el segundo 0", () => {
    expect(escenas[0].desde).toBe(0);
    for (let i = 1; i < escenas.length; i++) expect(escenas[i].desde).toBeGreaterThan(escenas[i - 1].desde);
    expect(escenas.at(-1)!.desde).toBeLessThan(DURACION);
  });

  it("elige la escena correcta en cada segundo", () => {
    expect(escenaEn(0).foco).toBe("busqueda");
    expect(escenaEn(12).foco).toBe("motivos");
    expect(escenaEn(34.9).foco).toBe("demo");
    expect(escenaEn(59).foco).toBe("presupuesto");
  });

  it("usa un sector y una ciudad que existen en la configuración", () => {
    expect(sectores.some((s) => s.id === busquedaGuion.sector)).toBe(true);
    expect(ciudades.some((c) => c.id === busquedaGuion.ciudad)).toBe(true);
  });

  it("los subtítulos están en español neutro", () => {
    for (const e of escenas) expect(esNeutro(e.subtitulo), e.subtitulo).toBe(true);
  });

  it("solo la demo por negocio se deja enmarcar, y solo por el propio origen", () => {
    expect(politicaCSP("n", false, { enmarcable: true })).toContain("frame-ancestors 'self'");
    expect(politicaCSP("n")).toContain("frame-ancestors 'none'");
  });
});
