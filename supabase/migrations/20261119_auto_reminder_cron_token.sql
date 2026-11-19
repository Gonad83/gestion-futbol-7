-- El recordatorio automático de partidos fallaba con 401: el cron mandaba la
-- llave antigua de servicio, que el proyecto ya no acepta. Ahora usa su propio
-- token (tabla cron_tokens), igual que los avisos de cuota.

insert into public.cron_tokens (nombre, token)
select 'auto-reminder', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
where not exists (select 1 from public.cron_tokens where nombre = 'auto-reminder');

select cron.unschedule('auto-reminder-daily')
where exists (select 1 from cron.job where jobname = 'auto-reminder-daily');

select cron.schedule('auto-reminder-daily', '0 12 * * *', $$
  select net.http_post(
    url := 'https://wmcycxnydunfjnirmjuy.supabase.co/functions/v1/auto-reminder',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-token', (select token from public.cron_tokens where nombre = 'auto-reminder')
    ),
    body := '{}'::jsonb
  );
$$);
