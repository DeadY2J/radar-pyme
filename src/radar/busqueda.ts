/**
 * Orquesta una búsqueda: elige la fuente (Google Places si hay clave, si no el
 * modo demo), puntúa, guarda y ordena.
 */
import { almacen as almacenGlobal, type Almacen } from "./almacen";
import { ciudades, limites, sectores, type Ciudad, type Sector } from "./config";
import { negociosDemo } from "./fuentes/demo";
import { buscarEnPlaces, placesActivo } from "./fuentes/places";
import { ordenar, puntuar } from "./puntuacion";
import type { Negocio, Prospecto } from "./tipos";

export type Fuente = (sector: Sector, ciudad: Ciudad, max: number) => Promise<Negocio[]>;

export const fuenteDemo: Fuente = async (s, c, max) => negociosDemo(s, c, max);
export const fuenteGoogle: Fuente = (s, c, max) => buscarEnPlaces(s, c, max);

export function modoDemo(): boolean {
  return !placesActivo();
}

export function sectorPorId(id: string): Sector | undefined {
  return sectores.find((s) => s.id === id);
}

export function ciudadPorId(id: string): Ciudad | undefined {
  return ciudades.find((c) => c.id === id);
}

export async function buscar(
  sectorId: string,
  ciudadId: string,
  deps: { fuente?: Fuente; almacen?: Almacen } = {},
): Promise<Prospecto[]> {
  const sector = sectorPorId(sectorId);
  const ciudad = ciudadPorId(ciudadId);
  if (!sector || !ciudad) throw new Error("Sector o ciudad desconocidos");
  const fuente = deps.fuente ?? (modoDemo() ? fuenteDemo : fuenteGoogle);
  const almacen = deps.almacen ?? almacenGlobal;
  const negocios = await fuente(sector, ciudad, limites.maxResultados);
  return ordenar(negocios.map((negocio) => almacen.guardar({ negocio, puntuacion: puntuar(negocio) })));
}
