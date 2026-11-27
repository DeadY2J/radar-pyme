/**
 * Almacén en memoria (como en Recepción 24/7). Para producción se sustituye por
 * Supabase manteniendo esta misma interfaz.
 *
 * Reglas de contacto (la garantía de "nunca envíos masivos"):
 *  - un negocio se marca como contactado una sola vez;
 *  - hay un tope diario de contactos (config.limites.maxContactosPorDia);
 *  - quien pide no recibir más mensajes entra en la lista de "no contactar" por teléfono.
 */
import { limites } from "./config";
import type { Prospecto } from "./tipos";

const MAX_PROSPECTOS = 2000;

export type ResultadoContacto =
  | { ok: true; fecha: string; restantesHoy: number }
  | { ok: false; motivo: "no-existe" | "sin-telefono" | "ya-contactado" | "no-contactar" | "tope-diario" };

const digitos = (t: string | null) => (t ?? "").replace(/\D/g, "");
const diaDe = (fecha: Date) => fecha.toISOString().slice(0, 10);

export class Almacen {
  private prospectos = new Map<string, Prospecto>();
  private porNegocio = new Map<string, string>();
  private contactos = new Map<string, string>(); // prospectoId → fecha ISO
  private noContactar = new Set<string>(); // dígitos del teléfono

  constructor(private readonly topeDiario: number = limites.maxContactosPorDia) {}

  /** Guarda o actualiza. Un mismo negocio conserva su id (y su enlace de demo). */
  guardar(p: Omit<Prospecto, "id">): Prospecto {
    const existente = this.porNegocio.get(p.negocio.id);
    const id = existente ?? crypto.randomUUID();
    const prospecto: Prospecto = { ...p, id };
    this.prospectos.set(id, prospecto);
    this.porNegocio.set(p.negocio.id, id);
    if (this.prospectos.size > MAX_PROSPECTOS) {
      const masViejo = this.prospectos.keys().next().value as string;
      const viejo = this.prospectos.get(masViejo)!;
      this.prospectos.delete(masViejo);
      this.porNegocio.delete(viejo.negocio.id);
    }
    return prospecto;
  }

  obtener(id: string): Prospecto | undefined {
    return this.prospectos.get(id);
  }

  contactadoEl(id: string): string | null {
    return this.contactos.get(id) ?? null;
  }

  bloqueado(p: Prospecto): boolean {
    return this.noContactar.has(digitos(p.negocio.telefono));
  }

  contactosDelDia(ahora: Date): number {
    const hoy = diaDe(ahora);
    let n = 0;
    for (const f of this.contactos.values()) if (f.slice(0, 10) === hoy) n++;
    return n;
  }

  registrarContacto(id: string, ahora: Date = new Date()): ResultadoContacto {
    const p = this.prospectos.get(id);
    if (!p) return { ok: false, motivo: "no-existe" };
    if (digitos(p.negocio.telefono).length < 8) return { ok: false, motivo: "sin-telefono" };
    if (this.bloqueado(p)) return { ok: false, motivo: "no-contactar" };
    // Un mismo teléfono (cadenas con varias fichas) cuenta como un solo contacto.
    for (const [otroId] of this.contactos) {
      const otro = this.prospectos.get(otroId);
      if (otroId === id || (otro && digitos(otro.negocio.telefono) === digitos(p.negocio.telefono))) return { ok: false, motivo: "ya-contactado" };
    }
    const hechos = this.contactosDelDia(ahora);
    if (hechos >= this.topeDiario) return { ok: false, motivo: "tope-diario" };
    const fecha = ahora.toISOString();
    this.contactos.set(id, fecha);
    return { ok: true, fecha, restantesHoy: this.topeDiario - hechos - 1 };
  }

  marcarNoContactar(id: string): boolean {
    const p = this.prospectos.get(id);
    const t = digitos(p?.negocio.telefono ?? null);
    if (!p || t.length < 8) return false;
    this.noContactar.add(t);
    return true;
  }

  reiniciar() {
    this.prospectos.clear();
    this.porNegocio.clear();
    this.contactos.clear();
    this.noContactar.clear();
  }
}

// Una sola instancia por proceso (sobrevive a la recarga en caliente de Next en desarrollo).
const g = globalThis as unknown as { __radarAlmacen?: Almacen };
export const almacen: Almacen = (g.__radarAlmacen ??= new Almacen());
