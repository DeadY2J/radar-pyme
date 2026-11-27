/**
 * Enlace con la fase 5 (presupuesto en PDF). Radar Pyme no pone precios: entrega
 * una entrada tipada con el negocio, el producto y los módulos con sus horas
 * estimadas. El generador de presupuestos aplica la tarifa y la moneda.
 */
import { ciudades, modulosExtra, productos, sectores, type ProductoId } from "./config";
import type { Prospecto } from "./tipos";

export const VERSION_ENTRADA = 1;

export type EntradaPresupuesto = {
  version: typeof VERSION_ENTRADA;
  generadoEn: string;
  negocio: { nombre: string; sector: string; ciudad: string; pais: string; direccion: string; telefono: string | null };
  moneda: string;
  producto: { id: ProductoId; nombre: string };
  modulos: { id: string; nombre: string; horas: number; motivo: string }[];
  horasTotales: number;
  oportunidad: { total: number; nivel: string; motivos: string[] };
  urlDemo: string;
};

export function aEntradaPresupuesto(p: Prospecto, urlDemo: string, ahora: Date = new Date()): EntradaPresupuesto {
  const sector = sectores.find((s) => s.id === p.negocio.sector);
  if (!sector) throw new Error(`Sector desconocido: ${p.negocio.sector}`);
  const producto = productos[sector.producto];
  const ciudad = ciudades.find((c) => c.nombre === p.negocio.ciudad);
  const con = (id: string) => p.puntuacion.motivos.some((m) => m.id === id && m.puntos > 0);

  const modulos: EntradaPresupuesto["modulos"] = producto.modulos.map((m) => ({ ...m, motivo: `Base de ${producto.nombre}` }));
  if (con("sinWeb") || con("soloRedSocial")) modulos.push({ ...modulosExtra.web, motivo: "No tiene web propia" });
  // Recepción 24/7 ya incluye agenda; solo se suma el módulo de reservas a los demás productos.
  if (con("sinReservas") && producto.id !== "recepcion-24-7") modulos.push({ ...modulosExtra.reservas, motivo: "No reserva en línea" });
  if (con("resenasSinResponder") || con("valoracionMejorable") || con("pocasResenas")) modulos.push({ ...modulosExtra.resenas, motivo: "Reputación en Google mejorable" });

  return {
    version: VERSION_ENTRADA,
    generadoEn: ahora.toISOString(),
    negocio: {
      nombre: p.negocio.nombre,
      sector: sector.nombre,
      ciudad: p.negocio.ciudad,
      pais: p.negocio.pais,
      direccion: p.negocio.direccion,
      telefono: p.negocio.telefono,
    },
    moneda: ciudad?.moneda ?? "USD",
    producto: { id: producto.id, nombre: producto.nombre },
    modulos,
    horasTotales: modulos.reduce((s, m) => s + m.horas, 0),
    oportunidad: {
      total: p.puntuacion.total,
      nivel: p.puntuacion.nivel,
      motivos: p.puntuacion.motivos.filter((m) => m.puntos > 0).map((m) => m.etiqueta),
    },
    urlDemo,
  };
}
