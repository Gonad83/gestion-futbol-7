-- Convocatoria del Inter Generaciones: separa al que avisó que no puede ('no_va')
-- del que confirmó y no llegó al partido ('no_llego').
alter table public.intergen_callups drop constraint if exists intergen_callups_status_check;
alter table public.intergen_callups add constraint intergen_callups_status_check check (status in ('va', 'no_va', 'no_llego'));
