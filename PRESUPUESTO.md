# Presupuesto · Radar Pyme

Fase 5 del flujo de la Fábrica. Radar Pyme es ante todo una herramienta interna de prospección. Este presupuesto sirve
si se ofrece a un tercero (una agencia pequeña o un comercial que vende servicios digitales a pymes) como herramienta
propia, con sus sectores, ciudades y firma. Las tarifas quedan sin rellenar a propósito.

- Tarifa por hora: **[TARIFA_HORA_USD]** USD
- Cuota mensual de mantenimiento: **[CUOTA_MENSUAL_USD]** USD
- Moneda local del cliente: convertir al tipo de cambio del día de emisión e indicar la fecha del cambio.

## 1. Adaptación y puesta en producción

| Tarea | Horas |
|---|---|
| Configuración (sectores, ciudades, pesos de la puntuación, tope diario, firma) | 2 |
| Conexión con Google Places real y prueba con la clave del cliente | 2 |
| Persistencia en Supabase: contactos, historial y lista de no contactar | 6 |
| Inicio de sesión de usuarios en lugar de la clave única `RADAR_TOKEN` | 3 |
| Generador del presupuesto en PDF a partir de `EntradaPresupuesto` | 6 |
| Seguridad de producción (CSP con nonces) | 2 |
| Despliegue en Vercel con dominio | 2 |
| **Total** | **23 h** |

**Importe de implementación** = 23 h × [TARIFA_HORA_USD] = ____ USD (≈ ____ en moneda local).

## 2. Mantenimiento mensual

[CUOTA_MENSUAL_USD] USD al mes. Incluye: alojamiento gestionado, actualizaciones de seguridad, adaptación a cambios
de la API de Google Places, cambios menores de configuración y soporte por correo.

## 3. Costes de terceros (los paga el cliente, según la tarifa vigente del proveedor)

- Google Places API (New): cobro por petición según el tipo de búsqueda y los campos pedidos. Fijar un tope de gasto
  en la consola de Google Cloud antes de empezar.
- Supabase y Vercel: planes gratuitos al principio.

## Condiciones

- 50 % al aceptar y 50 % a la entrega. Garantía de 30 días sobre lo entregado.
- Validez del presupuesto: 15 días.
- El cliente se compromete a usarlo con mensajes uno a uno enviados a mano, sin envíos masivos ni automáticos.
