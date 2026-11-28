import type { Metadata } from "next";
import localFont from "next/font/local";
import { connection } from "next/server";
import "./globals.css";

// Bricolage Grotesque (OFL), alojada en el proyecto: sin dependencia de Google Fonts.
const texto = localFont({
  src: "./fuentes/bricolage-grotesque-latin-opsz-normal.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});
const cifras = localFont({
  src: "./fuentes/bricolage-grotesque-latin-wdth-normal.woff2",
  variable: "--font-cifras",
  weight: "200 800",
  display: "swap",
});

// Oxanium (OFL): lectura de instrumento para cifras y títulos de la herramienta.
const instrumento = localFont({
  src: "./fuentes/oxanium-latin-wght-normal.woff2",
  variable: "--font-oxanium",
  weight: "200 800",
  display: "swap",
});
// Instrument Sans (OFL): texto corrido de la herramienta.
const cuerpo = localFont({
  src: "./fuentes/instrument-sans-latin-wght-normal.woff2",
  variable: "--font-instrument",
  weight: "400 700",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Radar Pyme",
  description: "Encuentra pymes con poca presencia digital y prepara una demo personalizada y un mensaje de WhatsApp uno a uno para cada una.",
  robots: { index: false, follow: false },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Render dinámico: la CSP lleva un nonce nuevo en cada petición (ver src/proxy.ts).
  await connection();
  return (
    <html lang="es" className={`${texto.variable} ${cifras.variable} ${instrumento.variable} ${cuerpo.variable}`}>
      <body>{children}</body>
    </html>
  );
}
