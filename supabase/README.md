# Alerta automática de reservas bajas (Persona 5)

Cada lunes a las 7:00 a. m. (hora de Guadalajara) se revisan las reservas del
martes siguiente. Si son menos del 50 % de la capacidad (100), se envía un
correo de alerta al comedor. Si son 50 % o más, no se envía nada.

## Archivos

| Archivo | Para qué sirve |
|---|---|
| `functions/alerta-reservas-bajas/index.ts` | Edge Function: seguridad, consultas, decisión y envío con Resend. |
| `functions/alerta-reservas-bajas/logica.ts` | Reglas puras: fechas, decisión del 50 % y texto del correo. |
| `functions/alerta-reservas-bajas/logica.test.ts` | Pruebas de la lógica (no envían correos). Se ejecutan con `deno test`. |
| `cron/programar_alerta_lunes.sql` | Programación de Supabase Cron (lunes 13:00 UTC = 7:00 a. m. Guadalajara). |

## Secretos necesarios (solo nombres; los valores NO van en GitHub)

Edge Functions → Secrets:

- `RESEND_API_KEY`: llave de Resend.
- `CRON_SECRET`: clave larga generada con `openssl rand -hex 32`.
- `ALERT_MODE`: `prueba` o `real`.
- `ALERT_TO_TEST`: correo para pruebas.
- `ALERT_TO_REAL`: correo que recibe la alerta.
- `ALERT_FROM_REAL`: remitente (por ejemplo `Comedor CUCEI <onboarding@resend.dev>`).

Vault (SQL Editor):

- `alerta_anon_key`: llave anon del proyecto.
- `alerta_cron_secret`: mismo valor que `CRON_SECRET`.

## Despliegue

1. Crear la Edge Function `alerta-reservas-bajas` con `index.ts` y `logica.ts`,
   con la verificación JWT activada (no usar `--no-verify-jwt`).
2. Crear los secretos anteriores.
3. Ejecutar `cron/programar_alerta_lunes.sql` en el SQL Editor, bloque por bloque.

## Dependencias del proyecto

La alerta lee `menus.fecha` y usa la función SQL `reservas_del_menu`. Si cambian,
hay que revisar esta función.
