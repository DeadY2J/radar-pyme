"use client";

import { useEffect, useState } from "react";
import type { VistaProspecto } from "@/radar/vista";

type Opcion = { id: string; nombre: string };
type Contactos = { hoy: number; tope: number };

const colorNivel = {
  alta: "bg-jacaranda text-white",
  media: "bg-jacaranda-claro text-jacaranda",
  baja: "bg-salvia text-tinta-suave",
} as const;

const textoNivel = { alta: "Oportunidad alta", media: "Oportunidad media", baja: "Oportunidad baja" } as const;

function leerToken(): string {
  try {
    return sessionStorage.getItem("radar-token") ?? "";
  } catch {
    return "";
  }
}

export function Radar(props: { modoDemo: boolean; sectores: Opcion[]; ciudades: Opcion[]; topeDiario: number }) {
  const [sector, setSector] = useState(props.sectores[0].id);
  const [ciudad, setCiudad] = useState(props.ciudades[0].id);
  const [token, setToken] = useState("");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lista, setLista] = useState<VistaProspecto[] | null>(null);
  const [elegido, setElegido] = useState<string | null>(null);
  const [contactos, setContactos] = useState<Contactos>({ hoy: 0, tope: props.topeDiario });
  const [copiado, setCopiado] = useState(false);

  useEffect(() => setToken(leerToken()), []);

  const cabeceras = (): HeadersInit => ({ "Content-Type": "application/json", ...(token ? { "x-radar-token": token } : {}) });

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      try { sessionStorage.setItem("radar-token", token); } catch { /* sin almacenamiento: no pasa nada */ }
      const [res] = await Promise.all([
        fetch("/api/buscar", { method: "POST", headers: cabeceras(), body: JSON.stringify({ sector, ciudad }) }),
        new Promise((r) => setTimeout(r, 900)), // deja ver el barrido del radar
      ]);
      const datos = await res.json();
      if (!res.ok) throw new Error(datos.error ?? "Error en la búsqueda");
      setLista(datos.prospectos);
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

  const actual = lista?.find((p) => p.id === elegido) ?? null;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold text-bosque">Radar Pyme</h1>
          <p className="text-tinta-suave">Encuentra negocios con poca presencia digital y prepárales una demo a medida.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {props.modoDemo && <span className="rounded-full bg-ambar/15 px-3 py-1 font-medium text-ambar">Modo demo · negocios ficticios</span>}
          <span className="rounded-full bg-salvia px-3 py-1">
            Mensajes hoy: <span className="cifra font-semibold">{contactos.hoy}/{contactos.tope}</span>
          </span>
        </div>
      </header>

      <form onSubmit={buscar} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl border border-salvia-borde bg-white p-4">
        <label className="flex flex-col text-sm font-medium">
          Sector
          <select value={sector} onChange={(e) => setSector(e.target.value)} className="mt-1 rounded-lg border border-salvia-borde bg-papel px-3 py-2">
            {props.sectores.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-sm font-medium">
          Ciudad
          <select value={ciudad} onChange={(e) => setCiudad(e.target.value)} className="mt-1 rounded-lg border border-salvia-borde bg-papel px-3 py-2">
            {props.ciudades.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        {!props.modoDemo && (
          <label className="flex flex-col text-sm font-medium">
            Clave de acceso
            <input type="password" autoComplete="current-password" value={token} onChange={(e) => setToken(e.target.value)} className="mt-1 rounded-lg border border-salvia-borde bg-papel px-3 py-2" />
          </label>
        )}
        <button type="submit" disabled={cargando} className="flex items-center gap-2 rounded-lg bg-bosque px-5 py-2 font-semibold text-papel hover:bg-bosque-claro disabled:opacity-70">
          <svg aria-hidden viewBox="0 0 24 24" className={`h-5 w-5 ${cargando ? "barrido" : ""}`}>
            <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeOpacity=".4" />
            <circle cx="12" cy="12" r="5" fill="none" stroke="currentColor" strokeOpacity=".4" />
            <path d="M12 12 L12 2 A10 10 0 0 1 21 8 Z" fill="currentColor" fillOpacity=".7" />
          </svg>
          {cargando ? "Buscando…" : "Buscar negocios"}
        </button>
      </form>

      <p role="status" aria-live="polite" className="mt-3 min-h-6 text-sm text-alerta">{error}</p>

      {lista && lista.length === 0 && <p className="mt-6 text-tinta-suave">No se encontraron negocios para esa búsqueda.</p>}

      {lista && lista.length > 0 && (
        <div className="mt-2 grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
          <ol aria-label="Negocios encontrados" className="space-y-2">
            {lista.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => setElegido(p.id)}
                  aria-current={p.id === elegido}
                  className={`w-full rounded-xl border bg-white p-3 text-left transition ${p.id === elegido ? "border-jacaranda ring-2 ring-jacaranda/30" : "border-salvia-borde hover:border-bosque-claro"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{p.negocio.nombre}</p>
                      <p className="truncate text-xs text-tinta-suave">{p.negocio.direccion}</p>
                    </div>
                    <span className={`cifra shrink-0 rounded-lg px-2 py-1 text-lg font-bold ${colorNivel[p.puntuacion.nivel]}`} title={textoNivel[p.puntuacion.nivel]}>
                      {p.puntuacion.total}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-tinta-suave">
                    {textoNivel[p.puntuacion.nivel]}
                    {!p.puntuacion.contactable && " · sin teléfono"}
                    {p.contactadoEl && " · ya contactado"}
                    {p.bloqueado && " · no contactar"}
                  </p>
                </button>
              </li>
            ))}
          </ol>

          {actual && (
            <section aria-label={`Ficha de ${actual.negocio.nombre}`} className="h-fit space-y-5 rounded-2xl border border-salvia-borde bg-white p-5 md:sticky md:top-4">
              <div>
                <h2 className="text-2xl font-bold text-bosque">{actual.negocio.nombre}</h2>
                <p className="text-sm text-tinta-suave">
                  {actual.negocio.telefono ?? "Sin teléfono"}
                  {" · "}
                  {actual.negocio.web ? <span className="break-all">{actual.negocio.web}</span> : "Sin web"}
                  {actual.negocio.valoracion !== null && <> · <span className="cifra">{actual.negocio.valoracion.toFixed(1)}</span> ★ ({actual.negocio.totalResenas})</>}
                </p>
              </div>

              <div>
                <h3 className="font-semibold">Por qué es una oportunidad</h3>
                <ul className="mt-2 space-y-1.5">
                  {actual.puntuacion.motivos.map((m) => (
                    <li key={m.id} className="text-sm">
                      <div className="flex justify-between gap-2">
                        <span className={m.sinDatos ? "text-tinta-suave italic" : ""}>{m.etiqueta}</span>
                        <span className="cifra text-tinta-suave">{m.sinDatos ? "—" : `+${m.puntos}`}</span>
                      </div>
                      <div className="mt-0.5 h-1.5 rounded bg-salvia" aria-hidden>
                        <div className="h-1.5 rounded bg-jacaranda" style={{ width: `${(m.puntos / m.max) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <a href={actual.urlDemo} target="_blank" rel="noopener" className="block rounded-xl bg-jacaranda px-4 py-3 text-center font-semibold text-white hover:opacity-90">
                Ver la demo de {actual.negocio.nombre} ↗
              </a>

              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Mensaje de WhatsApp</h3>
                  <button type="button" onClick={() => copiar(actual.mensaje.texto)} className="text-sm font-medium text-jacaranda hover:underline">
                    {copiado ? "Copiado" : "Copiar"}
                  </button>
                </div>
                <p className="fondo-chat mt-2 whitespace-pre-wrap rounded-xl p-3 text-sm">
                  <span className="block rounded-lg bg-burbuja p-3 shadow-sm">{actual.mensaje.texto}</span>
                </p>
                {props.modoDemo && <p className="mt-1 text-xs text-ambar">Modo demo: el enlace abre WhatsApp sin número para que nadie real reciba el mensaje.</p>}
              </div>

              <div className="flex flex-wrap gap-2">
                {actual.puntuacion.contactable && !actual.contactadoEl && !actual.bloqueado ? (
                  <>
                    <a href={actual.mensaje.enlace} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-bosque px-4 py-2 font-semibold text-papel hover:bg-bosque-claro">
                      Abrir en WhatsApp
                    </a>
                    <button type="button" onClick={() => contacto(actual.id, "enviado")} className="rounded-lg border border-bosque px-4 py-2 font-semibold text-bosque hover:bg-salvia">
                      Marcar como enviado
                    </button>
                  </>
                ) : (
                  <p className="rounded-lg bg-salvia px-4 py-2 text-sm">
                    {actual.bloqueado ? "Pidió no recibir mensajes." : actual.contactadoEl ? `Contactado el ${new Date(actual.contactadoEl).toLocaleDateString("es")}.` : "Sin teléfono: no se puede escribir por WhatsApp."}
                  </p>
                )}
                {actual.puntuacion.contactable && !actual.bloqueado && (
                  <button type="button" onClick={() => contacto(actual.id, "no-contactar")} className="rounded-lg px-3 py-2 text-sm text-tinta-suave hover:text-alerta">
                    No volver a contactar
                  </button>
                )}
              </div>

              <button type="button" onClick={() => descargarPresupuesto(actual)} className="text-sm font-medium text-bosque underline-offset-2 hover:underline">
                Descargar datos para el presupuesto (JSON)
              </button>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
