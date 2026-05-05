create table if not exists public.match_guests (
  id         uuid primary key default gen_random_uuid(),
  match_id   uuid not null references public.matches(id) on delete cascade,
  team_id    uuid not null references public.team_settings(id) on delete cascade,
  name       text not null,
  created_at timestamptz default now()
);

alter table public.match_guests enable row level security;

create policy "authenticated can manage guests" on public.match_guests
  for all using (auth.uid() is not null);
