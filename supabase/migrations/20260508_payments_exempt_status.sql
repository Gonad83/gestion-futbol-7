-- Allow 'Exento' as a valid payment status for manual exemptions
ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
ALTER TABLE public.payments ADD CONSTRAINT payments_status_check
  CHECK (status IN ('Pendiente', 'Pagado', 'Atrasado', 'Exento'));
