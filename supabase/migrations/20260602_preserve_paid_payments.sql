-- Trigger to prevent automated scripts (like n8n monthly crons) from overwriting
-- already 'Pagado' or 'Exento' payments back to 'Pendiente' or 'Atrasado'.
-- Allows manual cancellation (setting amount to 0 and status to Pendiente).

CREATE OR REPLACE FUNCTION public.preserve_paid_payments_fn()
RETURNS TRIGGER AS $$
BEGIN
  -- If the payment was already 'Pagado' or 'Exento', and a script tries to
  -- reset it to 'Pendiente' or 'Atrasado' with a positive amount (i.e. not an annulment),
  -- we preserve the existing paid/exempt status, amount, and payment method.
  IF (OLD.status = 'Pagado' OR OLD.status = 'Exento') 
     AND (NEW.status = 'Pendiente' OR NEW.status = 'Atrasado') 
     AND NEW.amount > 0 THEN
    NEW.status := OLD.status;
    NEW.amount := OLD.amount;
    NEW.payment_method := OLD.payment_method;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS preserve_paid_payments_trigger ON public.payments;

CREATE TRIGGER preserve_paid_payments_trigger
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE FUNCTION public.preserve_paid_payments_fn();
