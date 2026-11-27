import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { nombreRemitente } from "@/radar/config";
import { crearDemo } from "@/radar/demo-personalizada";
import { prospectoPorId } from "@/radar/vista";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

function demoDe(id: string) {
  const p = id.length <= 200 ? prospectoPorId(decodeURIComponent(id)) : undefined;
  return p ? crearDemo(p) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = demoDe((await params).id);
  return {
    title: d ? `Propuesta para ${d.negocio.nombre}` : "Demo no encontrada",
    robots: { index: false, follow: false },
  };
}

export default async function Demo({ params }: Props) {
  const d = demoDe((await params).id);
  if (!d) notFound();

  return (
    <div className="min-h-screen">
      <div role="note" className="bg-ambar/10 border-b border-ambar/30 px-4 py-2 text-center text-sm text-tinta">
        Propuesta de demostración preparada por {nombreRemitente()}. No es el sitio oficial de {d.negocio.nombre}.
      </div>

      <header className="bg-bosque text-papel">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
          <p className="text-sm uppercase tracking-widest text-salvia">{d.sector} · {d.negocio.ciudad}</p>
          <h1 className="mt-2 text-4xl font-extrabold sm:text-5xl">{d.negocio.nombre}</h1>
          <p className="mt-3 max-w-xl text-lg text-salvia">{d.negocio.direccion}</p>
          <p className="mt-6 inline-block rounded-full bg-jacaranda px-4 py-1.5 text-sm font-semibold">
            Con {d.producto.nombre}: {d.producto.promesa}
          </p>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-8 px-4 py-10 md:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          <section aria-labelledby="servicios">
            <h2 id="servicios" className="text-2xl font-bold text-bosque">Servicios</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {d.servicios.map((s) => (
                <li key={s.nombre} className="rounded-xl border border-salvia-borde bg-white p-4">
                  <p className="font-semibold">{s.nombre}</p>
                  <p className="text-sm text-tinta-suave"><span className="cifra">{s.duracionMin}</span> min</p>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="horarios">
            <h2 id="horarios" className="text-2xl font-bold text-bosque">Horarios</h2>
            {d.horariosEstimados && (
              <p className="mt-1 text-sm text-ambar">Horario estimado: la ficha del negocio no publica sus horarios.</p>
            )}
            <table className="mt-4 w-full max-w-md text-left">
              <tbody>
                {d.horarios.map((h) => (
                  <tr key={h.dia} className="border-b border-salvia-borde last:border-0">
                    <th scope="row" className="py-2 font-medium capitalize">{h.dia}</th>
                    <td className={`cifra py-2 text-right ${h.texto === "Cerrado" ? "text-tinta-suave" : ""}`}>{h.texto}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section aria-labelledby="mejoras">
            <h2 id="mejoras" className="text-2xl font-bold text-bosque">Qué ganarías</h2>
            <ul className="mt-4 space-y-2">
              {d.beneficios.map((b) => (
                <li key={b} className="flex gap-2"><span aria-hidden className="text-jacaranda">●</span>{b}</li>
              ))}
            </ul>
          </section>
        </div>

        <aside aria-label={`Conversación de ejemplo con ${d.asistente}`} className="h-fit overflow-hidden rounded-2xl border border-salvia-borde shadow-sm">
          <div className="flex items-center gap-3 bg-bosque px-4 py-3 text-papel">
            <div aria-hidden className="grid h-9 w-9 place-items-center rounded-full bg-jacaranda font-bold">{d.asistente[0]}</div>
            <div>
              <p className="font-semibold leading-tight">{d.negocio.nombre}</p>
              <p className="text-xs text-salvia">{d.asistente} · asistente con IA · en línea</p>
            </div>
          </div>
          <ol className="fondo-chat space-y-2 p-4">
            {d.conversacion.map((m, i) => (
              <li key={i} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${m.de === "cliente" ? "ml-auto bg-burbuja" : "bg-white"}`}>
                <span className="sr-only">{m.de === "cliente" ? "Cliente: " : `${d.asistente}: `}</span>
                {m.texto}
              </li>
            ))}
          </ol>
        </aside>
      </main>

      <footer className="border-t border-salvia-borde px-4 py-6 text-center text-sm text-tinta-suave">
        Demo preparada por {nombreRemitente()} con la Fábrica.{" "}
        {d.ficticio ? "Negocio ficticio, creado para mostrar el producto." : "Los datos salen de la ficha pública del negocio en Google Maps."}
      </footer>
    </div>
  );
}
