-- =====================================================================
--  Programación de la alerta: todos los lunes 7:00 a. m. (Guadalajara)
--
--  Pega los valores reales SOLO en el SQL Editor de Supabase, ejecútalos
--
--  Hora: pg_cron trabaja en UTC. Guadalajara es UTC-6 todo el año
-- =====================================================================

-- PASO 1: extensiones (si ya están activas, no pasa nada)
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- PASO 2: guardar los dos secretos en Vault (ejecutar UNA vez, con valores reales)
--   El primero es la llave "anon" (la de js/supabase.js).
--   El segundo es el MISMO texto que pondrás en el secreto CRON_SECRET de la función.
-- select vault.create_secret('PEGA_AQUI_LA_ANON_KEY',   'alerta_anon_key');
-- select vault.create_secret('PEGA_AQUI_EL_CRON_SECRET', 'alerta_cron_secret');

-- PASO 3: programar el trabajo
select cron.schedule(
  'alerta-reservas-bajas-lunes',
  '0 13 * * 1',   -- minuto 0, hora 13 UTC (= 7:00 a. m. Guadalajara), cualquier día del mes y mes, lunes
  $$
  select net.http_post(
    url := 'https://gjwbwwyblhuactfmyfse.supabase.co/functions/v1/alerta-reservas-bajas',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'alerta_anon_key'),
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'alerta_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) as request_id;
  $$
);

-- ---------------------------------------------------------------------
-- REVISAR (ejecutar por separado cuando quieras)
-- ---------------------------------------------------------------------
-- Ver el trabajo programado:
--   select jobid, jobname, schedule, active from cron.job;
-- Ver las últimas ejecuciones del Cron:
--   select status, return_message, start_time from cron.job_run_details order by start_time desc limit 5;
-- Ver qué respondió la función (200, 401, 500...):
--   select status_code, content, created from net._http_response order by created desc limit 5;
--
-- PAUSAR / BORRAR el trabajo:
--   select cron.unschedule('alerta-reservas-bajas-lunes');
