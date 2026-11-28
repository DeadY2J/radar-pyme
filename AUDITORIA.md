# Auditoría · Radar Pyme

Fecha: 27/11/2026 · Alcance: repositorio `radar-pyme` (Next.js 16, almacén en memoria, Google Places sin clave real).
Metodología: revisión del código de todas las rutas API y módulos, más comprobaciones ejecutadas (typecheck, tests,
build, `npm audit`, cabeceras, límite de peticiones y control de acceso contra `next start`, navegación con Playwright).

## Resultado

Sin fallos críticos ni altos abiertos. Los puntos medios y bajos están abajo con su estado.
**Limitación principal:** la integración con Google Places solo está probada con respuestas simuladas. Con una clave
falsa, la petición llega a Google y la app devuelve un error controlado (400 → 502 sin filtrar la clave), pero falta
una prueba con clave real antes de usarla con clientes.

## Seguridad

| # | Gravedad | Hallazgo | Estado |
|---|----------|----------|--------|
| S1 | Alta | Con `GOOGLE_PLACES_API_KEY` configurada y la app desplegada, cualquiera podría lanzar búsquedas y gastar la cuota de Google. | **Corregido**: en modo real todas las rutas API exigen `RADAR_TOKEN` (cabecera `x-radar-token`, comparación en tiempo constante). Sin `RADAR_TOKEN` se niegan con 503 (cerrado por defecto). Verificado: 503 sin token configurado, 401 con token incorrecto. Tests incluidos. |
| S2 | Alta | Riesgo de envío masivo de WhatsApp (spam, bloqueo del número, problemas legales). | **Corregido por diseño**: no hay envío automático; el enlace `wa.me` lo abre una persona. Un contacto por negocio y por teléfono, tope diario (`limites.maxContactosPorDia`), lista de "no contactar" y frase de baja en cada mensaje. Tests incluidos. |
| S3 | Media | En modo demo, un enlace `wa.me` con un número ficticio podría llegar a una persona real. | **Corregido**: en modo demo el enlace no lleva número. Las webs ficticias usan el dominio reservado `.example`. Test incluido. |
| S4 | Media | Filtrado de la clave de Google en errores o en la URL. | **Corregido**: la clave va en cabecera, solo en el servidor; los errores no propagan el cuerpo de Google. Tests con `fetch` simulado (403, caída de red, respuesta inválida) y verificado que la clave no aparece en los logs del servidor. |
| S5 | Media | Enumeración de prospectos reales por su id. | **Corregido**: los negocios reales llevan un UUID aleatorio; los ficticios usan su id legible (no hay datos reales) y solo se reconstruyen en modo demo. Test incluido. |
| S6 | Media | Uso del nombre de un negocio real en su demo (suplantación). | **Mitigado**: banner fijo "Propuesta de demostración… No es el sitio oficial", sin logos ni fotos del negocio, `noindex`. |
| S7 | Media | CSP completa (script-src/style-src) no aplicada: Next.js necesita nonces para scripts en línea. | **Corregido (28/11/2026)**: CSP completa con nonce por petición en `src/proxy.ts` (ver sección de revisión). |
| S8 | Baja | Límite de peticiones y almacén en memoria: con varias instancias (Vercel) no se comparten; el contador diario y la lista de no contactar se pierden al reiniciar. | Abierto. Fase 2: Supabase y límite compartido (Upstash/Redis). **No usar en producción real sin persistir la lista de no contactar.** |
| S9 | Baja | `x-forwarded-for` se puede falsear fuera de Vercel para esquivar el límite por IP. | Aceptado (en Vercel lo fija la plataforma). En modo real además hace falta `RADAR_TOKEN`. |
| S10 | Baja | La clave de acceso se guarda en `sessionStorage` del navegador. | Aceptado: se borra al cerrar la pestaña. Mejora futura: sesión con cookie `HttpOnly`. |

Comprobado sin hallazgos:
- **Validación de entradas**: Zod en todas las rutas (sector y ciudad como enumeraciones cerradas, acción de contacto cerrada, ids con longitud máxima). JSON inválido → 400.
- **Sin SSRF**: la app nunca descarga las webs de los negocios; solo analiza el dominio.
- **Secretos**: ninguno en el código; `.env.example` sin valores; `.gitignore` excluye `.env*`.
- **Cabeceras**: nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS, CSP mínima y sin `X-Powered-By` (verificado con `curl -I`).
- **Dependencias**: `npm audit` → 0 vulnerabilidades.

## Calidad

| Comprobación | Resultado |
|---|---|
| `npm run typecheck` | OK |
| `npm test` | OK · 53 tests (puntuación, español neutro, fuentes y Google Places simulado, contacto, demo, mensaje, presupuesto, API y seguridad) |
| `npm run build` | OK · 6 rutas |
| CI | `.github/workflows/ci.yml` (typecheck, tests, build) en cada PR |
| Límite de peticiones | Verificado contra `next start`: la búsqueda 11 en un minuto devuelve 429 |
| Navegación | Playwright: búsqueda → ficha → demo, sin errores en consola |
| Móvil | Sin scroll horizontal a 390 px en la búsqueda y en la demo |
| Accesibilidad | Etiquetas en todos los campos, `aria-live` para errores, `aria-current` en la lista, conversación con lector de pantalla (autor de cada mensaje), foco visible, `prefers-reduced-motion`. Contraste del texto ámbar corregido de 4,36:1 a 5,54:1; el resto ≥ 4,5:1 (la insignia "media", jacarandá sobre lila, da 4,14:1 pero es texto grande en negrita, ≥ 3:1). |
| Textos | Test que pasa el detector de voseo y modismos por todos los mensajes, demos, guiones y nombres posibles (6 sectores × 6 ciudades). |

## Pendiente antes de usarlo con negocios reales

1. Probar con una `GOOGLE_PLACES_API_KEY` real (restringida a Places API New) y revisar el coste por búsqueda.
2. Persistir contactos y la lista de no contactar (Supabase).
3. Revisar la normativa de protección de datos del país de destino antes de escribir.

## Revisión del 28/11/2026 (fase 4 completa)

Pasada de auditoría sobre `main` de las seis apps de la Fábrica, en la nube. Resultado: **sin críticos, altos ni medios
abiertos que se puedan corregir sin cuentas reales**. Lo que depende de cuentas reales queda pendiente y no se da por bueno.

Corregido en esta pasada:
- **CSP completa** (S7): `src/proxy.ts` genera un nonce por petición y aplica `default-src 'self'; script-src 'self' 'nonce-…' 'strict-dynamic'`
  (sin `unsafe-inline` ni `unsafe-eval` en producción), `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`
  y `upgrade-insecure-requests`. `style-src` mantiene `'unsafe-inline'` porque React usa atributos `style` (riesgo bajo). Las páginas
  pasan a render dinámico (`connection()` en el layout) para que el nonce sea nuevo en cada visita. Las rutas API llevan
  `frame-ancestors 'none'; object-src 'none'; base-uri 'none'`. Política en `src/*/csp.ts` con test (`tests/csp.test.ts`).

Comprobado (todo contra `next build` + `next start`, Chromium sin cabeza):

| Comprobación | Resultado |
|---|---|
| Typecheck · tests · build | OK · 56 tests en verde · OK |
| `npm audit` | 0 vulnerabilidades |
| CSP en navegador | Cabecera con nonce en la página; scripts de Next con nonce; React hidrata y responde a clics; 0 errores en consola |
| Accesibilidad (axe-core 4.10, WCAG 2 A/AA, vista inicial) | 0 incidencias |
| Móvil (375 px) | Sin desbordamiento horizontal |
| Rendimiento (Pixel 5 emulado, CPU ×4, red lenta) | LCP 0,6 s · CLS 0 · TTFB ≈ 150 ms (local) |
| Voseo y modismos | Ninguno fuera de los tests de modismos y de los patrones que sirven para entender al usuario |
| Documentos de la Fábrica | ALCANCE, AUDITORIA, PRESUPUESTO (marcadores `[TARIFA_HORA_USD]` y `[CUOTA_MENSUAL_USD]` sin rellenar), PROSPECCION y STATUS presentes |

Límites honestos de esta pasada: axe solo cubre la vista inicial (no todos los estados), el rendimiento se midió en local
(no en Vercel ni con Lighthouse) y no hubo prueba en móviles físicos.

**Pendiente que no se puede dar por bueno sin cuentas reales:** Google Places con `GOOGLE_PLACES_API_KEY` y `RADAR_TOKEN` reales (Jorge aún no tiene la clave), y persistir la lista de no contactar (Supabase).
