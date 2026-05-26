-- Track whether an auto-reminder was already sent for a match (prevents duplicates)
ALTER TABLE public.matches ADD COLUMN IF NOT EXISTS auto_reminder_sent_at timestamptz;
