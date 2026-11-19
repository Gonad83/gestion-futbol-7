-- La protección de 20260602_preserve_paid_payments nunca llegó a producción:
-- el flujo de n8n "Pagos - Cobros y Recordatorios" podía pasar a "Pendiente
-- $8.000" un mes ya pagado (por ejemplo, uno pagado por adelantado). Desde aquí
-- un mes Pagado o Exento no vuelve a Pendiente con monto. Anular un pago desde
-- la app (Pendiente con monto 0) sigue funcionando.
create or replace function public.preserve_paid_payments_fn()
returns trigger language plpgsql set search_path = public as $$
begin
  if (old.status = 'Pagado' or old.status = 'Exento')
     and (new.status = 'Pendiente' or new.status = 'Atrasado')
     and coalesce(new.amount, 0) > 0 then
    new.status := old.status;
    new.amount := old.amount;
    new.payment_method := old.payment_method;
  end if;
  return new;
end;
$$;
drop trigger if exists preserve_paid_payments_trigger on public.payments;
create trigger preserve_paid_payments_trigger before update on public.payments
  for each row execute function public.preserve_paid_payments_fn();
revoke all on function public.preserve_paid_payments_fn() from public, anon, authenticated;
