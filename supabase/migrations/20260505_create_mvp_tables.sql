-- Votos MVP por partido
create table if not exists public.match_mvp_votes (
  id                uuid primary key default gen_random_uuid(),
  match_id          uuid references public.matches(id) on delete cascade,
  voter_player_id   uuid references public.players(id) on delete cascade,
  voted_player_id   uuid references public.players(id) on delete cascade,
  created_at        timestamptz default now(),
  unique(match_id, voter_player_id)
);

alter table public.match_mvp_votes enable row level security;

create policy "authenticated can vote" on public.match_mvp_votes
  for insert with check (auth.uid() is not null);

create policy "anyone can view votes" on public.match_mvp_votes
  for select using (true);

-- Ganadores MVP histórico
create table if not exists public.mvp_winners (
  id               uuid primary key default gen_random_uuid(),
  match_id         uuid references public.matches(id),
  player_id        uuid not null references public.players(id),
  player_name      text not null,
  player_photo_url text,
  vote_count       integer,
  week_date        date,
  created_at       timestamptz default now(),
  unique(match_id)
);

alter table public.mvp_winners enable row level security;

create policy "anyone can view mvp winners" on public.mvp_winners
  for select using (true);

create policy "authenticated can insert mvp winners" on public.mvp_winners
  for insert with check (auth.uid() is not null);
