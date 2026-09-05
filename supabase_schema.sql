-- Run this script in Supabase Dashboard -> SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.symptoms_log (
  id uuid primary key default gen_random_uuid(),
  symptom text not null,
  duration text,
  severity text,
  source text not null default 'web',
  created_at timestamptz not null default now()
);

create table if not exists public.triage_results (
  id uuid primary key default gen_random_uuid(),
  symptom_log_id uuid references public.symptoms_log(id) on delete set null,
  triage_level text not null check (triage_level in ('mild', 'urgent', 'critical')),
  message text,
  source text not null default 'web',
  created_at timestamptz not null default now()
);

create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.patients(id) on delete cascade,
  department text not null,
  preferred_date date not null,
  preferred_time time not null,
  status text not null default 'confirmed'
    check (status in ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz not null default now()
);

alter table public.symptoms_log enable row level security;
alter table public.triage_results enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;

-- The backend only needs to create records. It generates UUIDs itself, so it
-- does not need SELECT access and no patient data is exposed to the browser.
drop policy if exists "backend can insert symptoms" on public.symptoms_log;
create policy "backend can insert symptoms"
  on public.symptoms_log for insert
  to anon, authenticated
  with check (true);

drop policy if exists "backend can insert triage results" on public.triage_results;
create policy "backend can insert triage results"
  on public.triage_results for insert
  to anon, authenticated
  with check (true);

drop policy if exists "backend can insert patients" on public.patients;
create policy "backend can insert patients"
  on public.patients for insert
  to anon, authenticated
  with check (true);

drop policy if exists "backend can insert appointments" on public.appointments;
create policy "backend can insert appointments"
  on public.appointments for insert
  to anon, authenticated
  with check (true);
