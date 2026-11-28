import { modoDemo } from "@/radar/busqueda";
import { ciudades, limites, sectores } from "@/radar/config";
import { Radar } from "./radar";

export const dynamic = "force-dynamic";

export default function Inicio() {
  return (
    <Radar
      modoDemo={modoDemo()}
      sectores={sectores.map((s) => ({ id: s.id, nombre: s.nombre }))}
      ciudades={ciudades.map((c) => ({ id: c.id, nombre: c.nombre, barrios: c.barrios }))}
      topeDiario={limites.maxContactosPorDia}
    />
  );
}
