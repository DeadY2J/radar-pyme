# Fábrica · Radar Pyme

Proyecto de Jorge Lamelas: fase 6 (prospección) de la Fábrica de software para pymes de Latinoamérica.
Busca negocios de un sector en una ciudad (Google Places API), puntúa su presencia digital y genera para
cada uno una demo personalizada y un mensaje de WhatsApp uno a uno. Alcance en `ALCANCE.md`.

## Comandos
- `npm run dev`: servidor en http://localhost:3000 (sin claves funciona el modo demo).
- `npm test`: tests (Vitest). Deben pasar siempre antes de commitear.
- `npm run typecheck` y `npm run build`: los ejecuta también la CI.

## Arquitectura (respétala)
- `src/radar/config.ts`: lo ÚNICO que cambia para adaptar la prospección (sectores, ciudades, pesos, límites, firma).
- `src/radar/puntuacion.ts`: motor de puntuación puro y testeable. Nunca inventa datos: lo que no se sabe es "sin datos".
- `src/radar/neutro.ts`: detector de voseo y modismos; los tests lo pasan sobre todas las plantillas.
- `src/radar/fuentes/`: `demo.ts` (negocios ficticios deterministas, webs `.example`) y `places.ts` (Google Places API New).
- `src/radar/busqueda.ts`: elige fuente, puntúa, guarda y ordena. `almacen.ts`: en memoria, con las reglas de contacto
  (una vez por negocio, tope diario, lista de no contactar). Para producción se sustituye por Supabase.
- `src/radar/demo-personalizada.ts`, `mensaje.ts`: la demo por negocio y el mensaje de WhatsApp (plantillas, sin IA).
- `src/radar/presupuesto.ts`: `EntradaPresupuesto`, la salida tipada hacia el presupuesto en PDF (fase 5). Sin precios.
- `src/radar/seguridad.ts`: clave de acceso en modo real (RADAR_TOKEN), límite de peticiones, origen público.
- `src/app/`: interfaz (`radar.tsx`), demo por negocio (`demo/[id]`) y rutas API (`api/buscar`, `api/prospectos/[id]/…`).

## Convenciones
- Código y comentarios en español. Todos los textos visibles (interfaz, demos, mensajes) en español latinoamericano
  neutro con tuteo: sin voseo ni modismos regionales ("cita", no "turno"; "anticipo", no "seña").
- Toda regla de negocio nueva va en el motor con su test, no en la UI.
- Mensajes de WhatsApp: siempre uno a uno y enviados a mano por una persona. Nada de envíos masivos ni automáticos.
- La clave de Google Places solo se usa en el servidor y nunca aparece en respuestas ni errores.
