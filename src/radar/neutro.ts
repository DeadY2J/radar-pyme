/**
 * Control de español neutro: detecta voseo y modismos regionales en los textos
 * que genera la app (mensajes, demos, interfaz). Se usa en los tests para que
 * ninguna plantilla se escape con "che", "vos", "tenés"…
 */

const prohibidas: { patron: RegExp; motivo: string }[] = [
  { patron: /\bvos\b/i, motivo: "voseo" },
  { patron: /\bche\b/i, motivo: "modismo (AR/UY)" },
  { patron: /\bac[áa]\b/i, motivo: "regionalismo: usa «aquí»" },
  { patron: /\bre\s+(bueno|lindo|linda|f[áa]cil|r[áa]pido)\b/i, motivo: "modismo (AR)" },
  { patron: /\b(ten[ée]s|pod[ée]s|quer[ée]s|sab[ée]s|hac[ée]s|ven[íi]s|dec[íi]s|sos|mir[áa]|fijate|escrib[íi]|prob[áa]|avis[áa]|contame|decime|pasame|dejame)\b/i, motivo: "voseo" },
  { patron: /\b(pana|g[üu]ey|wey|chévere|chevere|bac[áa]n|laburo|boludo|chamba|parce|cachai|guagua)\b/i, motivo: "modismo regional" },
  { patron: /\bturnos?\b/i, motivo: "usa «cita»" },
  { patron: /\bse[ñn]a\b/i, motivo: "usa «anticipo»" },
];

export function buscarModismos(texto: string): string[] {
  return prohibidas.filter((p) => p.patron.test(texto)).map((p) => `${texto.match(p.patron)?.[0]} (${p.motivo})`);
}

export function esNeutro(texto: string): boolean {
  return buscarModismos(texto).length === 0;
}
