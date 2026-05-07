-- Fase 2 Arena: tabla de solicitudes de amistosos entre equipos
CREATE TABLE IF NOT EXISTS public.friendly_requests (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id             BIGINT      NOT NULL REFERENCES public.team_settings(id) ON DELETE CASCADE,
  date                DATE        NOT NULL,
  time                TEXT        NOT NULL DEFAULT '20:00',
  location            TEXT        NOT NULL,
  format              TEXT        NOT NULL DEFAULT '7vs7',
  notes               TEXT,
  status              TEXT        NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'challenged', 'matched', 'cancelled')),
  challenger_team_id  BIGINT      REFERENCES public.team_settings(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.friendly_requests ENABLE ROW LEVEL SECURITY;

-- Cualquier usuario autenticado puede leer
CREATE POLICY "authenticated read friendly_requests" ON public.friendly_requests
  FOR SELECT TO authenticated USING (true);

-- Capitán puede insertar solicitudes de su propio equipo
CREATE POLICY "captain insert friendly_requests" ON public.friendly_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    team_id IN (SELECT id FROM public.team_settings WHERE owner_id = auth.uid())
  );

-- Capitán dueño puede actualizar su solicitud; cualquier autenticado puede desafiar (status open)
CREATE POLICY "update friendly_requests" ON public.friendly_requests
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
