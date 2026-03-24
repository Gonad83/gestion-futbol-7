-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE (Extends Supabase Auth users)
create table public.users (
  id uuid references auth.users not null primary key,
  role text check (role in ('admin', 'player')) default 'player',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- PLAYERS TABLE
create table public.players (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id),
  name text not null,
  nickname text,
  position text not null,
  rating integer check (rating >= 1 and rating <= 7) default 4,
  photo_url text,
  status text check (status in ('Activo', 'Inactivo', 'Lesionado')) default 'Activo',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- MATCHES TABLE
create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  date timestamp with time zone not null,
  location text not null,
  status text check (status in ('Programado', 'Jugado', 'Cancelado')) default 'Programado',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ATTENDANCE TABLE
create table public.attendance (
  id uuid default uuid_generate_v4() primary key,
  player_id uuid references public.players(id) not null,
  match_id uuid references public.matches(id) not null,
  status text check (status in ('Voy', 'No voy', 'Tal vez')) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (player_id, match_id)
);

-- PAYMENTS TABLE
create table public.payments (
  id uuid default uuid_generate_v4() primary key,
  player_id uuid references public.players(id) not null,
  amount numeric(10,2) not null,
  month integer check (month >= 1 and month <= 12) not null,
  year integer not null,
  status text check (status in ('Pagado', 'Pendiente', 'Atrasado')) default 'Pendiente',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- EXPENSES TABLE
create table public.expenses (
  id uuid default uuid_generate_v4() primary key,
  concept text not null,
  amount numeric(10,2) not null,
  date date not null default CURRENT_DATE,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- TEAM SETTINGS TABLE (quota_amount, etc.)
create table public.team_settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
-- Default quota
insert into public.team_settings (key, value) values ('quota_amount', '8000');

-- CASH INCOMES TABLE (ingresos manuales: saldo anterior, ventas, etc.)
create table public.cash_incomes (
  id uuid default uuid_generate_v4() primary key,
  concept text not null,
  amount numeric(10,2) not null,
  date date not null default CURRENT_DATE,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- GENERATED TEAMS
create table public.generated_teams (
  id uuid default uuid_generate_v4() primary key,
  match_id uuid references public.matches(id) not null,
  team_a jsonb not null,
  team_b jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ROW LEVEL SECURITY (RLS) SETUP
alter table public.users enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;
alter table public.attendance enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;
alter table public.cash_incomes enable row level security;
alter table public.team_settings enable row level security;
alter table public.generated_teams enable row level security;

-- Admin role function
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- POLICIES

-- EVERYONE CAN READ PLAYERS AND MATCHES
create policy "Anyone can view players" on players for select using (true);
create policy "Anyone can view matches" on matches for select using (true);
create policy "Anyone can view generated_teams" on generated_teams for select using (true);

-- ADMIN CAN DO EVERYTHING
create policy "Admins can do everything on users" on users for all using (is_admin());
create policy "Admins can do everything on players" on players for all using (is_admin());
create policy "Admins can do everything on matches" on matches for all using (is_admin());
create policy "Admins can do everything on attendance" on attendance for all using (is_admin());
create policy "Admins can do everything on payments" on payments for all using (is_admin());
create policy "Admins can do everything on expenses" on expenses for all using (is_admin());
create policy "Admins can do everything on cash_incomes" on cash_incomes for all using (is_admin());
create policy "Admins can manage team_settings" on team_settings for all using (is_admin());
create policy "Anyone can read team_settings" on team_settings for select using (true);
create policy "Admins can do everything on generated_teams" on generated_teams for all using (is_admin());

-- PLAYERS CAN MANAGE THEIR OWN DATA
create policy "Players can update their own attendance" on attendance for all using (auth.uid() = (select user_id from players where id = player_id));
create policy "Players can view their own payments" on payments for select using (auth.uid() = (select user_id from players where id = player_id));
create policy "Users can read own role" on users for select using (auth.uid() = id);
