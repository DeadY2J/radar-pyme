/**
 * Mensaje de WhatsApp uno a uno para un negocio. Se genera con plantillas
 * deterministas (sin IA): gratis, revisable y sin riesgo de inventar datos.
 * El envío lo hace siempre una persona, abriendo el enlace wa.me en su teléfono.
 */
import { nombreRemitente, productos, remitente, sectores } from "./config";
import { motivoPrincipal } from "./puntuacion";
import type { Motivo, Prospecto } from "./tipos";

export type MensajeWhatsApp = {
  texto: string;
  /** Enlace "click to chat". En modo demo no lleva número: nadie real lo recibe. */
  enlace: string;
  /** Número en dígitos, o null si es demo o no hay teléfono. */
  numero: string | null;
};

function observacion(m: Motivo | null, p: Prospecto): string {
  const base = "Vi tu ficha en Google Maps";
  switch (m?.id) {
    case "sinWeb": return `${base} y noté que todavía no tienes página web propia.`;
    case "soloRedSocial": return `${base} y noté que tu enlace principal es tu perfil de redes sociales.`;
    case "sinReservas": return `${base} y noté que todavía no se puede reservar en línea.`;
    case "resenasSinResponder": return `${base} y noté que tienes ${p.negocio.resenasSinResponder} reseñas sin responder.`;
    case "valoracionMejorable":
    case "pocasResenas": return `${base} y creo que podrías conseguir más reseñas de tus clientes.`;
    default: return `${base}.`;
  }
}

/** Solo dígitos, con el código de país. Devuelve null si no parece un teléfono internacional. */
export function numeroWhatsApp(telefono: string | null): string | null {
  if (!telefono || !telefono.trim().startsWith("+")) return null;
  const d = telefono.replace(/\D/g, "");
  return d.length >= 10 && d.length <= 15 ? d : null;
}

export function crearMensaje(p: Prospecto, urlDemo: string, opciones: { demo: boolean }): MensajeWhatsApp {
  const sector = sectores.find((s) => s.id === p.negocio.sector);
  if (!sector) throw new Error(`Sector desconocido: ${p.negocio.sector}`);
  const producto = productos[sector.producto];

  const texto = [
    `Hola, ¿hablo con ${p.negocio.nombre}? Soy ${nombreRemitente()} y ${remitente.oficio} ${sector.plural}.`,
    observacion(motivoPrincipal(p.puntuacion), p),
    `Preparé una demo con el nombre de ${p.negocio.nombre}, tus servicios y tus horarios: ${urlDemo}`,
    `Muestra cómo funcionaría ${producto.nombre}: ${producto.promesa}.`,
    "¿Te parece si te lo muestro en 10 minutos esta semana? Si no te interesa, me dices y no vuelvo a escribirte.",
  ].join("\n\n");

  const numero = opciones.demo ? null : numeroWhatsApp(p.negocio.telefono);
  const enlace = `https://wa.me/${numero ?? ""}?text=${encodeURIComponent(texto)}`;
  return { texto, enlace, numero };
}
