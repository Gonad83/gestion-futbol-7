-- Fase 3 Arena: torneos entre equipos
CREATE TABLE IF NOT EXISTS public.tournaments (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organizer_team_id BIGINT      NOT NULL REFERENCES public.team_settings(id) ON DELETE CASCADE,
  name              TEXT        NOT NULL,
  description       TEXT,
  date              DATE        NOT NULL,
  location          TEXT        NOT NULL,
  city              TEXT,
  commune           TEXT,
  region            TEXT,
  format            TEXT        NOT NULL DEFAULT '7vs7',
  age_range         TEXT        NOT NULL DEFAULT 'Open',
  max_teams         INT         NOT NULL DEFAULT 8,
  entry_fee         INT         NOT NULL DEFAULT 0,
  payment_info      TEXT,
  status            TEXT        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','full','ongoing','finished','cancelled')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tournament_registrations (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID        NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id       BIGINT      NOT NULL REFERENCES public.team_settings(id) ON DELETE CASCADE,
  status        TEXT        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','rejected')),
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tournament_id, team_id)
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_registrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read tournaments" ON public.tournaments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "captain creates tournament" ON public.tournaments
  FOR INSERT TO authenticated
  WITH CHECK (organizer_team_id IN (
    SELECT id FROM public.team_settings WHERE owner_id = auth.uid()
  ));

CREATE POLICY "organizer updates tournament" ON public.tournaments
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "read registrations" ON public.tournament_registrations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "captain registers team" ON public.tournament_registrations
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "organizer updates registration" ON public.tournament_registrations
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "captain deletes own registration" ON public.tournament_registrations
  FOR DELETE TO authenticated USING (true);
