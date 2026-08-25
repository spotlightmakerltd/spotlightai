-- SpotlightMaker — run this once in your Supabase SQL editor
-- Project: https://xhzmwcevyxaphsxibnxg.supabase.co

-- 1. PROFILES ---------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  credits numeric not null default 5,
  subscription_tier text not null default 'free',
  created_at timestamptz not null default now()
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

drop policy if exists "own profile select" on public.profiles;
create policy "own profile select" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- 2. AUTO-CREATE PROFILE ON SIGNUP -----------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, credits, subscription_tier)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    5,
    'free'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. VIDEO GENERATIONS ------------------------------------------------------
create table if not exists public.video_generations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  niche text not null,
  campaign_goal text not null,
  target_audience text not null,
  duration_seconds int not null default 30,
  credits_used numeric not null default 0,
  prompt_input text not null default '',
  status text not null default 'pending',
  script jsonb,
  created_at timestamptz not null default now()
);

grant select, insert, update, delete on public.video_generations to authenticated;
grant all on public.video_generations to service_role;

alter table public.video_generations enable row level security;

drop policy if exists "own generations" on public.video_generations;
create policy "own generations" on public.video_generations
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists video_generations_user_idx
  on public.video_generations (user_id, created_at desc);

-- 4. ATOMIC CREDIT DEDUCTION -----------------------------------------------
create or replace function public.deduct_credits(amount numeric)
returns numeric
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining numeric;
begin
  update public.profiles
     set credits = credits - amount
   where id = auth.uid() and credits >= amount
   returning credits into remaining;

  if remaining is null then
    raise exception 'INSUFFICIENT_CREDITS';
  end if;

  return remaining;
end;
$$;

grant execute on function public.deduct_credits(numeric) to authenticated;
