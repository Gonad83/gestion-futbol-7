-- supabase_schema_multitenant.sql
-- Run this to upgrade your database to support multiple teams

create table public.teams (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  join_code text unique default substr(md5(random()::text), 1, 6),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create table public.team_members (
  id uuid default uuid_generate_v4() primary key,
  team_id uuid references public.teams(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('admin', 'player')) default 'player',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(team_id, user_id)
);

-- Note: In a real migration, you would want to migrate existing data.
-- If starting fresh, you can drop the old tables or add team_id columns to them.
--
-- ALTER TABLE players ADD COLUMN team_id UUID REFERENCES teams(id);
-- ALTER TABLE matches ADD COLUMN team_id UUID REFERENCES teams(id);
-- ALTER TABLE expenses ADD COLUMN team_id UUID REFERENCES teams(id);
-- ...etc
--
-- Then update Row Level Security policies to filter based on team_members.
