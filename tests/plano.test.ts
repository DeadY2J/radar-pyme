import { describe, expect, it } from "vitest";
import { barrioDe, posicionNegocio, RADIO } from "@/app/plano";
import { ciudades, sectores } from "@/radar/config";
import { negociosDemo } from "@/radar/fuentes/demo";

describe("plano del radar", () => {
  it("coloca cada negocio dentro del disco, de forma determinista y en su barrio", () => {
    for (const c of ciudades) {
      for (const n of negociosDemo(sectores[0], c)) {
        const a = posicionNegocio(n.id, n.direccion, c.id, c.barrios);
        expect(a).toEqual(posicionNegocio(n.id, n.direccion, c.id, c.barrios));
        expect(Math.hypot(a.x - 0.5, a.y - 0.5)).toBeLessThanOrEqual(RADIO);
        expect(a.angulo).toBeGreaterThanOrEqual(0);
        expect(a.angulo).toBeLessThan(360);
        expect(barrioDe(n.direccion, c.barrios)).not.toBeNull();
      }
    }
  });

  it("sin barrio conocido, también cae dentro del disco", () => {
    const a = posicionNegocio("google-abc", "Calle sin barrio 1", "lima", ["Miraflores"]);
    expect(Math.hypot(a.x - 0.5, a.y - 0.5)).toBeLessThanOrEqual(RADIO);
  });
});
