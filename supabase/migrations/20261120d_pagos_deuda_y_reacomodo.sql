-- Caja: abonos sin adivinar, y reacomodo de pagos en una sola transacción.
--
-- 1. Una fila "Pendiente" con monto podía ser dos cosas: un abono real (dinero
--    recibido) o la deuda que anotaba n8n ("Pendiente $8.000"). La app las
--    distinguía comparando con la cuota, así que cambiar la cuota cambiaba el
--    historial. Ahora la deuda anotada queda marcada (es_deuda) y el monto de
--    cualquier otra fila Pendiente es siempre dinero recibido.
-- 2. El reacomodo (los pagos cubren primero el mes más antiguo) borraba,
--    cambiaba e insertaba filas una por una desde el navegador: si fallaba a
--    medias, se perdían filas. Ahora se aplica todo o nada en aplicar_reacomodo.

alter table public.payments add column if not exists es_deuda boolean not null default false;

-- Las filas que hoy la app ya trataba como deuda (Pendiente con monto igual o
-- mayor a la cuota) quedan marcadas. No cambia nada de lo que se ve.
update public.payments p
   set es_deuda = true
  from public.players j
  left join public.team_settings t on t.id = j.team_id
 where j.id = p.player_id
   and p.status in ('Pendiente', 'Atrasado')
   and p.amount > 0
   and p.amount >= coalesce(t.quota_amount, 8000);

-- Corre con los permisos de quien llama: las reglas de payments (solo el admin
-- del equipo escribe) se aplican igual que antes.
create or replace function public.aplicar_reacomodo(p_borrar uuid[], p_cambios jsonb, p_nuevos jsonb)
returns void language plpgsql security invoker set search_path = public as $$
declare
  c jsonb;
  cambios jsonb;
begin
  if coalesce(array_length(p_borrar, 1), 0) > 0 then
    delete from public.payments where id = any(p_borrar);
  end if;

  for c in select * from jsonb_array_elements(coalesce(p_cambios, '[]'::jsonb)) loop
    cambios := c->'changes';
    update public.payments set
      month          = coalesce((cambios->>'month')::int, month),
      year           = coalesce((cambios->>'year')::int, year),
      status         = coalesce(cambios->>'status', status),
      amount         = coalesce((cambios->>'amount')::numeric, amount),
      payment_method = case when cambios ? 'payment_method' then cambios->>'payment_method' else payment_method end,
      es_deuda       = coalesce((cambios->>'es_deuda')::boolean, es_deuda)
    where id = (c->>'id')::uuid;
    if not found then
      raise exception 'No se encontró el pago % (o no tienes permiso)', c->>'id';
    end if;
  end loop;

  insert into public.payments (player_id, month, year, status, amount, payment_method)
  select x.player_id, x.month, x.year, x.status, x.amount, x.payment_method
  from jsonb_to_recordset(coalesce(p_nuevos, '[]'::jsonb))
    as x(player_id uuid, month int, year int, status text, amount numeric, payment_method text);
end;
$$;
revoke all on function public.aplicar_reacomodo(uuid[], jsonb, jsonb) from public, anon;
grant execute on function public.aplicar_reacomodo(uuid[], jsonb, jsonb) to authenticated;
