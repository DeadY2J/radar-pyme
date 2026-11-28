"use client";

import { useEffect, useMemo, useState } from "react";
import type { VistaProspecto } from "@/radar/vista";
import type { Nivel } from "@/radar/tipos";
import { anclasDeBarrios, barrioDe, posicionNegocio, RADIO, trazado } from "./plano";

type Opcion = { id: string; nombre: string };
type OpcionCiudad = Opcion & { barrios: string[] };
type Contactos = { hoy: number; tope: number };

/** Una vuelta completa del haz, en segundos. Los ecos se encienden cuando el haz pasa por encima. */
const PERIODO = 4;

const tono: Record<Nivel, string> = {
  alta: "var(--color-ambar-vivo)",
  media: "var(--color-hueso)",
  baja: "var(--color-apagado)",
};
const tamano: Record<Nivel, number> = { alta: 15, media: 10, baja: 7 };
const textoNivel = { alta: "Oportunidad alta", media: "Oportunidad media", baja: "Oportunidad baja" } as const;

function leerToken(): string {
  try {
    return sessionStorage.getItem("radar-token") ?? "";
  } catch {
    return "";
  }
}

export function Radar(props: { modoDemo: boolean; sectores: Opcion[]; ciudades: OpcionCiudad[]; topeDiario: number }) {
  const [sector, setSector] = useState(props.sectores[0].id);
  const [ciudad, setCiudad] = useState(props.ciudades[0].id);
  const [token, setToken] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lista, setLista] = useState<VistaProspecto[] | null>(null);
  const [ciudadLista, setCiudadLista] = useState(props.ciudades[0].id);
  const [ronda, setRonda] = useState(0);
  const [elegido, setElegido] = useState<string | null>(null);
  const [contactos, setContactos] = useState<Contactos>({ hoy: 0, tope: props.topeDiario });
  const [copiado, setCopiado] = useState(false);

  useEffect(() => setToken(leerToken()), []);

  const cabeceras = (): HeadersInit => ({ "Content-Type": "application/json", ...(token ? { "x-radar-token": token } : {}) });

  async function buscar(e?: React.FormEvent) {
    e?.preventDefault();
    setCargando(true);
    setError(null);
    try {
      try { sessionStorage.setItem("radar-token", token); } catch { /* sin almacenamiento: no pasa nada */ }
      const [res] = await Promise.all([
        fetch("/api/buscar", { method: "POST", headers: cabeceras(), body: JSON.stringify({ sector, ciudad }) }),
        new Promise((r) => setTimeout(r, 1100)), // deja ver el barrido rápido del radar
      ]);
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error ?? "Error en la búsqueda");
      setLista(datos.prospectos);
      setCiudadLista(ciudad);
      setRonda((r) => r + 1);
      setContactos(datos.contactos);
      setElegido(datos.prospectos[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en la búsqueda");
    } finally {
      setCargando(false);
    }
  }

  async function contacto(id: string, accion: "enviado" | "no-contactar") {
    setError(null);
    const res = await fetch(`/api/prospectos/${encodeURIComponent(id)}/contacto`, { method: "POST", headers: cabeceras(), body: JSON.stringify({ accion }) });
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) return setError(datos.error ?? "No se pudo guardar");
    setLista((l) => l?.map((p) => (p.id === id ? datos.prospecto : p)) ?? null);
    setContactos(datos.contactos);
  }

  async function descargarPresupuesto(p: VistaProspecto) {
    const res = await fetch(`/api/prospectos/${encodeURIComponent(p.id)}/presupuesto`, { headers: cabeceras() });
    if (!res.ok) return setError("No se pudo generar la entrada del presupuesto");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "presupuesto.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      setError("No se pudo copiar. Selecciona el texto a mano.");
    }
  }

  // El plano muestra la ciudad de los resultados; sin resultados, la ciudad elegida.
  const ciudadPlano = props.ciudades.find((c) => c.id === (lista ? ciudadLista : ciudad)) ?? props.ciudades[0];
  const actual = lista?.find((p) => p.id === elegido) ?? null;

  return (
    <div className="radar-app">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6">
        <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-calle pb-4">
          <div className="flex items-center gap-3">
            <svg aria-hidden viewBox="0 0 32 32" className="h-8 w-8 text-ambar-vivo">
              <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeOpacity=".5" />
              <circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" strokeOpacity=".5" />
              <path d="M16 16 L16 2 A14 14 0 0 1 28.1 9 Z" fill="currentColor" fillOpacity=".8" />
              <circle cx="22" cy="11" r="2" fill="currentColor" />
            </svg>
            <div>
              <h1 className="instrumento text-2xl font-semibold tracking-wide">Radar Pyme</h1>
              <p className="text-sm text-niebla">Encuentra negocios con poca presencia digital y prepárales una demo a medida.</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {props.modoDemo && <span className="rounded border border-ambar-hondo px-2.5 py-1 text-ambar-vivo">Modo demo: negocios ficticios</span>}
            <span className="text-niebla">
              Mensajes de hoy <span className="instrumento ml-1 text-base font-semibold text-hueso">{contactos.hoy}/{contactos.tope}</span>
            </span>
          </div>
        </header>

        <main>
        <form onSubmit={buscar} className="mt-5 flex flex-wrap items-end gap-3">
          <label className="flex min-w-44 flex-1 flex-col gap-1 text-sm text-niebla sm:flex-none">
            Sector
            <select value={sector} onChange={(e) => setSector(e.target.value)} className="control">
              {props.sectores.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
            </select>
          </label>
          <label className="flex min-w-44 flex-1 flex-col gap-1 text-sm text-niebla sm:flex-none">
            Ciudad
            <select value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="control">
              {props.ciudades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
          {!props.modoDemo && (
            <label className="flex flex-col gap-1 text-sm text-niebla">
              Clave de acceso
              <input type="password" autoComplete="current-password" value={token} onChange={(e) => setToken(e.target.value)} className="control" />
            </label>
          )}
          <button type="submit" disabled={cargando} className="instrumento rounded-md bg-ambar-vivo px-5 py-2.5 font-semibold text-noche hover:bg-[#ffb94d] disabled:opacity-70">
            {cargando ? "Rastreando…" : "Buscar negocios"}
          </button>
        </form>

        <p role="status" aria-live="polite" className="mt-2 min-h-6 text-sm text-coral">{error}</p>

        <div className="mt-2 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          <section aria-label="Plano del radar">
            <Sonar
              ciudad={ciudadPlano}
              lista={lista}
              elegido={elegido}
              onElegir={setElegido}
              cargando={cargando}
              ronda={ronda}
            />
            <ul aria-label="Leyenda" className="mt-4 flex flex-wrap gap-x-5 gap-y-1 text-sm text-niebla">
              {(["alta", "media", "baja"] as const).map((n) => (
                <li key={n} className="flex items-center gap-2">
                  <span aria-hidden className="inline-block rounded-full" style={{ width: tamano[n], height: tamano[n], background: tono[n], boxShadow: `0 0 8px ${tono[n]}` }} />
                  {textoNivel[n]}
                </li>
              ))}
            </ul>
            <p className="mt-1 text-xs text-niebla">Plano ilustrativo: cada negocio aparece en su barrio, no en su dirección exacta.</p>
          </section>

          <div className="min-w-0">
            {!lista && (
              <div className="border-l-2 border-ambar-hondo pl-5 text-niebla">
                <h2 className="instrumento text-xl text-hueso">Cómo funciona</h2>
                <ol className="mt-3 list-decimal space-y-2 pl-5">
                  <li>Elige un sector y una ciudad, y pulsa <strong className="text-hueso">Buscar negocios</strong>.</li>
                  <li>Cada punto del radar es un negocio. Cuanto más brilla, más margen de mejora digital tiene.</li>
                  <li>Elige uno para ver por qué es una oportunidad, su demo y el mensaje para enviarle a mano.</li>
                </ol>
              </div>
            )}

            {lista && lista.length === 0 && <p className="text-niebla">No se encontraron negocios para esa búsqueda. Prueba con otro sector o ciudad.</p>}

            {actual && (
              <Ficha
                p={actual}
                modoDemo={props.modoDemo}
                copiado={copiado}
                onCopiar={copiar}
                onContacto={contacto}
                onPresupuesto={descargarPresupuesto}
              />
            )}

            {lista && lista.length > 0 && (
              <section aria-labelledby="titulo-lista" className="mt-10">
                <h2 id="titulo-lista" className="instrumento text-lg">Negocios por prioridad</h2>
                <p className="text-xs text-niebla">Primero los que tienen teléfono; dentro de cada grupo, de más a menos oportunidad.</p>
                <ol className="mt-3 divide-y divide-calle border-y border-calle">
                  {lista.map((p, i) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => setElegido(p.id)}
                        aria-current={p.id === elegido}
                        className={`flex w-full items-center gap-3 px-2 py-2.5 text-left hover:bg-manzana ${p.id === elegido ? "bg-manzana" : ""}`}
                      >
                        <span className="instrumento w-5 text-right text-sm text-niebla">{i + 1}</span>
                        <span aria-hidden className="inline-block shrink-0 rounded-full" style={{ width: 9, height: 9, background: tono[p.puntuacion.nivel] }} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium">{p.negocio.nombre}</span>
                          <span className="block truncate text-xs text-niebla">
                            {barrioDe(p.negocio.direccion, ciudadPlano.barrios) ?? p.negocio.ciudad}
                            {!p.puntuacion.contactable && ", sin teléfono"}
                            {p.contactadoEl && ", ya contactado"}
                            {p.bloqueado && ", no contactar"}
                          </span>
                        </span>
                        <span className="instrumento text-lg font-semibold" style={{ color: tono[p.puntuacion.nivel] }}>
                          {p.puntuacion.total}
                          <span className="sr-only">, {textoNivel[p.puntuacion.nivel]}</span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </div>
        </main>
      </div>
    </div>
  );
}

function Sonar(props: {
  ciudad: OpcionCiudad;
  lista: VistaProspecto[] | null;
  elegido: string | null;
  onElegir: (id: string) => void;
  cargando: boolean;
  ronda: number;
}) {
  const { ciudad, lista } = props;
  const plano = useMemo(() => trazado(ciudad.id), [ciudad.id]);
  const anclas = useMemo(() => anclasDeBarrios(ciudad.id, ciudad.barrios), [ciudad.id, ciudad.barrios]);
  const r = RADIO * 1000;

  return (
    <div
      role="group"
      aria-label={lista ? `Plano de ${ciudad.nombre} con ${lista.length} negocios` : `Plano de ${ciudad.nombre}, sin búsqueda todavía`}
      className="sonar mx-auto max-w-[min(100%,640px)]"
      style={{ ["--periodo" as string]: `${PERIODO}s` }}
    >
      <svg aria-hidden viewBox="0 0 1000 1000" className="absolute inset-0 h-full w-full">
        <defs>
          <clipPath id="disco"><circle cx="500" cy="500" r={r} /></clipPath>
          <radialGradient id="vineta">
            <stop offset="60%" stopColor="#0d1512" stopOpacity="0" />
            <stop offset="100%" stopColor="#0d1512" stopOpacity=".85" />
          </radialGradient>
        </defs>
        <g clipPath="url(#disco)">
          <rect width="1000" height="1000" fill="var(--color-manzana)" />
          <g transform={`rotate(${plano.giro} 500 500)`}>
            <rect {...{ x: plano.parque.x, y: plano.parque.y, width: plano.parque.w, height: plano.parque.h }} fill="#1c2e24" />
            {plano.calles.map((c, i) => (
              <line key={i} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="var(--color-noche)" strokeWidth={c.avenida ? 15 : 7} />
            ))}
          </g>
          {anclas.map((a) => (
            <text key={a.nombre} x={a.x * 1000} y={a.y * 1000 + 8} textAnchor="middle" fontSize="22" letterSpacing="1" fill="var(--color-niebla)" fillOpacity=".75" className="instrumento">
              {a.nombre}
            </text>
          ))}
          <rect width="1000" height="1000" fill="url(#vineta)" />
        </g>
        {/* Anillos de distancia y retícula */}
        <g fill="none" stroke="var(--color-ambar-vivo)">
          {[0.25, 0.5, 0.75].map((k) => <circle key={k} cx="500" cy="500" r={r * k} strokeOpacity=".16" />)}
          <circle cx="500" cy="500" r={r} strokeOpacity=".55" strokeWidth="2" />
          <line x1="500" y1={500 - r} x2="500" y2={500 + r} strokeOpacity=".12" />
          <line x1={500 - r} y1="500" x2={500 + r} y2="500" strokeOpacity=".12" />
          {Array.from({ length: 72 }, (_, i) => {
            const a = (i * 5 * Math.PI) / 180;
            const largo = i % 6 === 0 ? 18 : 8;
            return (
              <line key={i} x1={500 + Math.sin(a) * r} y1={500 - Math.cos(a) * r} x2={500 + Math.sin(a) * (r + largo)} y2={500 - Math.cos(a) * (r + largo)} strokeOpacity=".5" />
            );
          })}
        </g>
      </svg>

      <div key={`haz-${props.ronda}`} className={`sonar-haz ${props.cargando ? "buscando" : ""}`} />

      {lista?.map((p) => {
        const pos = posicionNegocio(p.id, p.negocio.direccion, ciudad.id, ciudad.barrios);
        const n = p.puntuacion.nivel;
        return (
          <button
            key={`${props.ronda}-${p.id}`}
            type="button"
            className="eco"
            aria-pressed={p.id === props.elegido}
            aria-label={`${p.negocio.nombre}: ${p.puntuacion.total} puntos, ${textoNivel[n].toLowerCase()}`}
            onClick={() => props.onElegir(p.id)}
            style={{
              left: `${pos.x * 100}%`,
              top: `${pos.y * 100}%`,
              ["--tono" as string]: tono[n],
              ["--retardo" as string]: `${(pos.angulo / 360) * PERIODO}s`,
            }}
          >
            <span aria-hidden className="eco-punto" style={{ width: tamano[n], height: tamano[n] }} />
            <span aria-hidden className="eco-rotulo">{p.negocio.nombre}</span>
          </button>
        );
      })}

      {!lista && !props.cargando && (
        <p className="absolute inset-x-0 bottom-[18%] z-[3] text-center text-sm text-niebla">
          <span className="rounded bg-noche/80 px-3 py-1">Sin búsqueda: elige un sector y pulsa Buscar negocios</span>
        </p>
      )}
    </div>
  );
}

function Ficha(props: {
  p: VistaProspecto;
  modoDemo: boolean;
  copiado: boolean;
  onCopiar: (texto: string) => void;
  onContacto: (id: string, accion: "enviado" | "no-contactar") => void;
  onPresupuesto: (p: VistaProspecto) => void;
}) {
  const { p } = props;
  const n = p.negocio;
  const nivel = p.puntuacion.nivel;
  return (
    <article aria-labelledby="ficha-nombre" className="space-y-7">
      <div className="flex items-start gap-5">
        <p className="instrumento leading-none" style={{ color: tono[nivel] }}>
          <span className="text-7xl font-bold">{p.puntuacion.total}</span>
          <span className="block pt-1 text-sm text-niebla">de 100</span>
        </p>
        <div className="min-w-0 pt-1">
          <p className="text-sm" style={{ color: tono[nivel] }}>{textoNivel[nivel]}</p>
          <h2 id="ficha-nombre" className="instrumento text-3xl font-semibold leading-tight">{n.nombre}</h2>
          <p className="mt-1 text-sm text-niebla">{n.direccion}</p>
        </div>
      </div>

      <dl className="grid grid-cols-3 gap-4 border-y border-calle py-3 text-sm">
        <div className="min-w-0">
          <dt className="text-niebla">Teléfono</dt>
          <dd className="truncate">{n.telefono ?? "Sin teléfono"}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-niebla">Web</dt>
          <dd className="truncate" title={n.web ?? undefined}>{n.web ? n.web.replace(/^https?:\/\/(www\.)?/, "") : "Sin web"}</dd>
        </div>
        <div>
          <dt className="text-niebla">Reseñas</dt>
          <dd>{n.valoracion !== null ? <><span className="instrumento">{n.valoracion.toFixed(1)}</span> de 5 ({n.totalResenas})</> : "Sin datos"}</dd>
        </div>
      </dl>

      <section aria-labelledby="titulo-motivos">
        <h3 id="titulo-motivos" className="instrumento text-lg">Por qué es una oportunidad</h3>
        <ul className="mt-3 space-y-3">
          {p.puntuacion.motivos.map((m) => (
            <li key={m.id} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className={m.sinDatos ? "text-niebla italic" : ""}>{m.etiqueta}</span>
                <span className="instrumento text-niebla">{m.sinDatos ? "sin datos" : `+${m.puntos}`}</span>
              </div>
              <div className="barra-motivo mt-1" aria-hidden>
                <span style={{ width: `${(m.puntos / m.max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <a href={p.urlDemo} target="_blank" rel="noopener" className="instrumento block rounded-md bg-ambar-vivo px-4 py-3 text-center font-semibold text-noche hover:bg-[#ffb94d]">
        Ver la demo de {n.nombre}
        <span className="sr-only"> (se abre en otra pestaña)</span>
      </a>

      <section aria-labelledby="titulo-mensaje">
        <div className="flex items-center justify-between">
          <h3 id="titulo-mensaje" className="instrumento text-lg">Mensaje de WhatsApp</h3>
          <button type="button" onClick={() => props.onCopiar(p.mensaje.texto)} className="text-sm font-medium text-ambar-vivo underline-offset-4 hover:underline">
            {props.copiado ? "Copiado" : "Copiar"}
          </button>
        </div>
        <p className="mt-2 whitespace-pre-wrap rounded-md rounded-tl-none bg-hueso p-4 text-sm leading-relaxed text-noche">{p.mensaje.texto}</p>
        {props.modoDemo && <p className="mt-2 text-xs text-niebla">Modo demo: el enlace abre WhatsApp sin número para que nadie real reciba el mensaje.</p>}
      </section>

      <div className="flex flex-wrap items-center gap-2">
        {p.puntuacion.contactable && !p.contactadoEl && !p.bloqueado ? (
          <>
            <a href={p.mensaje.enlace} target="_blank" rel="noopener noreferrer" className="rounded-md border border-ambar-vivo px-4 py-2 font-semibold text-ambar-vivo hover:bg-ambar-vivo hover:text-noche">
              Abrir en WhatsApp
            </a>
            <button type="button" onClick={() => props.onContacto(p.id, "enviado")} className="rounded-md border border-calle px-4 py-2 font-semibold hover:border-hueso">
              Marcar como enviado
            </button>
          </>
        ) : (
          <p className="rounded-md bg-manzana px-4 py-2 text-sm">
            {p.bloqueado ? "Pidió no recibir mensajes." : p.contactadoEl ? `Contactado el ${new Date(p.contactadoEl).toLocaleDateString("es")}.` : "Sin teléfono: no se puede escribir por WhatsApp."}
          </p>
        )}
        {p.puntuacion.contactable && !p.bloqueado && (
          <button type="button" onClick={() => props.onContacto(p.id, "no-contactar")} className="px-3 py-2 text-sm text-niebla hover:text-coral">
            No volver a contactar
          </button>
        )}
      </div>

      <button type="button" onClick={() => props.onPresupuesto(p)} className="text-sm font-medium text-niebla underline underline-offset-4 hover:text-hueso">
        Descargar datos para el presupuesto (JSON)
      </button>
    </article>
  );
}
