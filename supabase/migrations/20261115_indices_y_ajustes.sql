-- Índices y ajustes que pedía el revisor de Supabase (15/11/2026).
-- Nada de esto cambia quién puede ver o editar qué: solo velocidad y orden.

-- ── 1. Índices para las relaciones entre tablas ─────────────────────────────
-- Sin ellos, cada "tráeme lo de este equipo / partido / jugador" recorre la
-- tabla entera, y las reglas de acceso por equipo hacen esa pregunta en casi
-- todas las consultas. Hoy no se nota (pocas filas); con más equipos sí.
create index if not exists attendance_match_id_idx on public.attendance (match_id);
create index if not exists cash_incomes_team_id_idx on public.cash_incomes (team_id);
create index if not exists expenses_team_id_idx on public.expenses (team_id);
create index if not exists friendly_requests_team_id_idx on public.friendly_requests (team_id);
create index if not exists friendly_requests_challenger_team_id_idx on public.friendly_requests (challenger_team_id);
create index if not exists generated_teams_match_id_idx on public.generated_teams (match_id);
create index if not exists intergen_participants_player_id_idx on public.intergen_participants (player_id);
create index if not exists match_guests_match_id_idx on public.match_guests (match_id);
create index if not exists match_mvp_votes_voted_player_id_idx on public.match_mvp_votes (voted_player_id);
create index if not exists match_mvp_votes_voter_player_id_idx on public.match_mvp_votes (voter_player_id);
create index if not exists matches_team_id_idx on public.matches (team_id);
create index if not exists mvp_winners_player_id_idx on public.mvp_winners (player_id);
create index if not exists players_team_id_idx on public.players (team_id);
create index if not exists players_user_id_idx on public.players (user_id);
create index if not exists team_settings_owner_id_idx on public.team_settings (owner_id);

-- ── 2. Regla repetida en pagos ──────────────────────────────────────────────
-- "Un pago por jugador, mes y año" estaba declarada dos veces con nombres
-- distintos. Se queda una; la protección es la misma.
alter table public.payments drop constraint if exists payments_player_month_year_unique;

-- ── 3. Función sin esquema fijo ─────────────────────────────────────────────
-- Solo usa funciones internas de Postgres, así que no necesita buscar en
-- ningún esquema.
alter function public.equipo_de_ruta(text) set search_path = '';

-- ── 4. Reglas de acceso que se recalculaban fila por fila ───────────────────
-- Mismas condiciones que antes; envolver auth.uid() en (select …) hace que
-- Postgres lo calcule una vez por consulta y no una vez por fila.
alter policy "jugadores: cada uno edita su ficha" on public.players
  using (
    user_id = (select auth.uid())
    or (user_id is null and lower(email) = lower((select auth.email())))
  )
  with check (user_id = (select auth.uid()));

alter policy "usuarios: ver mi rol" on public.users
  using (id = (select auth.uid()) or public.es_superadmin());

alter policy "intergen media: miembro sube" on public.intergen_media
  with check (
    public.es_miembro(public.equipo_de_edicion(edition_id))
    and uploaded_by = (select auth.uid())
  );

alter policy "intergen media: borrar" on public.intergen_media
  using (
    uploaded_by = (select auth.uid())
    or public.es_admin_equipo(public.equipo_de_edicion(edition_id))
  );

alter policy "service role full access" on public.flow_payments
  using ((select auth.role()) = 'service_role');
