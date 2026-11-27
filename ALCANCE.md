# Alcance · Radar Pyme

Fase 6 (prospección) del flujo de la Fábrica. Fecha: 27/11/2026.

## Problema del negocio

Para vender software a pymes de Latinoamérica hace falta encontrar a las que lo necesitan y llegar con algo
mejor que un mensaje genérico. Hoy eso es manual: buscar en Google Maps, abrir ficha por ficha, mirar si
tienen web, armar una propuesta y escribir. Radar Pyme lo hace en minutos y, sobre todo, llega con una
**demo ya personalizada** para cada negocio: su nombre, sus servicios y sus horarios.

## Usuarios

- **Jorge (prospector)**: busca, revisa la lista priorizada, abre la demo y envía el mensaje uno a uno desde su WhatsApp.
- **Dueño del negocio (receptor)**: recibe un único mensaje con un enlace a "su" demo, claramente marcada como propuesta.

## Funcionalidades del MVP

1. **Búsqueda** por sector y ciudad (Google Places API, Text Search). Sin `GOOGLE_PLACES_API_KEY` funciona el
   **modo demo** con negocios ficticios pero creíbles de varias ciudades (Buenos Aires, Ciudad de México, Bogotá, Lima, Santiago, Montevideo).
2. **Puntuación de oportunidad (0-100)** con desglose explicable: sin web, web que es solo una red social,
   sin reservas en línea, reseñas sin responder, valoración baja o pocas reseñas, sin teléfono de contacto.
   Pesos en el archivo de configuración. Motor puro con tests.
3. **Demo personalizada por negocio** (`/demo/[id]`): nombre, servicios del sector, horarios reales de la ficha
   (o estimados y marcados como tales) y una conversación de ejemplo con su asistente. Banner visible de
   "propuesta de demostración, no es el sitio oficial".
4. **Mensaje de WhatsApp uno a uno**: texto en español neutro adaptado a los puntos débiles detectados,
   con enlace `wa.me` que abre el chat para enviarlo a mano. Sin envío automático, sin envío masivo:
   un mensaje por negocio, tope diario configurable y frase de baja ("si no te interesa, no vuelvo a escribirte").
5. **Enlace con la fase 5**: cada prospecto exporta un objeto `EntradaPresupuesto` (JSON tipado: negocio,
   módulos propuestos, horas estimadas) listo para el generador de presupuesto en PDF.
6. Calidad: TypeScript estricto, Vitest, CI en GitHub Actions (typecheck, tests, build), `AUDITORIA.md`.

## Fase 2 (fuera de este alcance)

- Persistencia en Supabase (hoy almacén en memoria, como en Recepción 24/7).
- Generador del presupuesto PDF (fase 5), que consumirá `EntradaPresupuesto`.
- Comprobación real de reseñas sin responder (Google Business Profile API, solo con permiso del dueño) y análisis de la web.
- Textos de mensaje generados con IA (hoy plantillas deterministas: gratis y sin riesgo de inventar datos).
- Panel de seguimiento (contactado, respondió, reunión, cliente).

## Criterios de aceptación

- `npm install && npm run dev` funciona sin ninguna clave y muestra resultados en modo demo.
- Buscar "kinesiología" en "Buenos Aires" devuelve negocios ordenados por oportunidad, cada uno con el desglose de puntos.
- Cada resultado abre una demo con su nombre, servicios y horarios, y genera un mensaje de WhatsApp listo para enviar.
- No se puede marcar como contactado dos veces el mismo negocio ni superar el tope diario (test).
- Ningún texto visible contiene voseo ni modismos regionales (test sobre todas las plantillas).
- Con `GOOGLE_PLACES_API_KEY` se usa Places API (New); la clave nunca llega al navegador ni aparece en errores (test con `fetch` simulado).
- `npm run typecheck`, `npm test` y `npm run build` pasan en la CI.

## Riesgos (honestos)

| Riesgo | Impacto | Mitigación |
|---|---|---|
| **No tengo clave de Google Places**: la integración real se prueba solo con respuestas simuladas, no contra la API. | Alto hasta que se pruebe | Cliente aislado y testeado; probar con una clave real antes de usarlo con clientes. |
| Places API **no devuelve si las reseñas tienen respuesta del dueño**. | Medio | En modo real ese criterio queda "sin datos" y no suma puntos; nunca se inventa. |
| Coste de Places: los campos de contacto y valoración están en los SKU más caros. | Medio | Field mask mínima, tope de resultados por búsqueda en la configuración y límite de peticiones. Revisar precios vigentes. |
| Uso del nombre de un negocio real en la demo. | Medio (reputación) | Banner fijo de "propuesta, no es el sitio oficial", sin logos ni fotos del negocio, enlace no indexable. |
| WhatsApp y leyes de protección de datos / spam. | Alto si se abusa | Solo números públicos de empresas, envío manual uno a uno, tope diario, frase de baja y lista de "no contactar". |
| Almacén en memoria: se pierde al reiniciar. | Bajo en demo | Fase 2: Supabase. |

## Estimación

| Parte | Horas |
|---|---|
| Alcance y andamiaje (Next.js, CI) | 2 |
| Motor de puntuación + datos demo + tests | 4 |
| Cliente Google Places + búsqueda + tests | 3 |
| Demo personalizada + mensaje de WhatsApp + tope y lista de no contactar + tests | 5 |
| Interfaz (búsqueda, lista, ficha, demo) + API | 6 |
| Auditoría y README | 2 |
| **Total** | **22 h** |
