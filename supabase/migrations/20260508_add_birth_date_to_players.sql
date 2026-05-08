-- Add birth_date column to players if it doesn't exist
ALTER TABLE public.players ADD COLUMN IF NOT EXISTS birth_date DATE;
