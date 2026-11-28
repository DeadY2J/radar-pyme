# Estado · Radar Pyme

Revisión del 27/11/2026.

## Revisión del 28/11/2026 (auditoría fase 4)
- CSP completa con nonce por petición (`src/proxy.ts`), verificada en navegador sin errores.
- Typecheck, 56 tests, build y `npm audit` (0 vulnerabilidades) en verde; axe sin incidencias en la vista inicial; sin desbordamiento a 375 px.
- Pendiente con cuentas reales (no se da por bueno): Google Places con `GOOGLE_PLACES_API_KEY` y `RADAR_TOKEN` reales (Jorge aún no tiene la clave), y persistir la lista de no contactar (Supabase).
- Detalle en `AUDITORIA.md`. No desplegado.

## Hecho
- Prospección en modo demo sin clave de Google: busca negocios ficticios por sector y ciudad, puntúa su presencia digital
  (sin inventar datos), genera una demo personalizada por negocio y un mensaje de WhatsApp uno a uno para enviar a mano.
- Reglas de contacto: una vez por negocio, tope diario y lista de no contactar.
- Salida tipada `EntradaPresupuesto` para el presupuesto en PDF (fase 5).
- Fuente real con Google Places API (New), probada solo con respuestas simuladas.
- Comprobado hoy: 53 tests, typecheck, build y `npm audit` (0 vulnerabilidades) en local; CI en verde en `main`.
  Sin voseo ni modismos en los textos de la app. `AUDITORIA.md` al día: sin críticos ni altos abiertos.
- En esta revisión no hizo falta corregir nada.

## Pendiente
- Probar una búsqueda real con `GOOGLE_PLACES_API_KEY` y definir `RADAR_TOKEN` (el modo real queda cerrado sin él).
- Supabase para contactos y lista de no contactar (hoy en memoria).
- Generador del presupuesto en PDF que consuma `EntradaPresupuesto`.
- Límite de peticiones compartido antes de producción (ver AUDITORIA.md). No desplegado.

## Cómo probarlo
```bash
npm ci
npm run dev        # http://localhost:3000, modo demo sin claves
npm test && npm run typecheck && npm run build
```
