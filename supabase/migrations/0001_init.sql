-- Blue Violet Physician Services — schema, RLS, and private storage.
-- Run this in the Supabase SQL editor, or `supabase db push` with the CLI.
--
-- Every table is owned by an authenticated user (auth.uid()) and protected by
-- row-level security so a user can only ever read or write their own rows.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.settings (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  filing_status        text    not null default 'single',
  state                text    not null default 'New Jersey',
  cme_target           integer not null default 100,
  cycle_ends           date    not null default '2027-06-30',
  solo401k_monthly     integer not null default 2500,
  solo401k_effective_from date not null default date_trunc('month', current_date)::date,
  physician_name       text    not null default 'Dr. Alex Morgan',
  spouse_wages         integer not null default 0,
  spouse_fed_withheld  integer not null default 0,
  spouse_state_withheld integer not null default 0,
  other_withheld       integer not null default 0,
  seeded               boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.income (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  amount     numeric not null default 0,
  source     text not null default '',
  note       text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.deductions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  amount     numeric not null default 0,
  category   text not null default 'Other',
  note       text not null default '',
  receipt    jsonb,                 -- FileRef object, or null
  k401       boolean not null default false,
  edited     boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.cme (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  date       date not null,
  activity   text not null default '',
  hours      numeric not null default 0,
  cost       numeric not null default 0,
  receipt    jsonb,                 -- FileRef object, or null
  created_at timestamptz not null default now()
);

create table if not exists public.credentials (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  type       text not null default '',
  label      text not null default '',
  issue      date,
  exp        date not null,
  number     text not null default '',
  note       text not null default '',
  doc        jsonb,                 -- FileRef object, or null
  created_at timestamptz not null default now()
);

create table if not exists public.quarter_payments (
  user_id    uuid not null references auth.users(id) on delete cascade,
  year       integer not null,
  quarter    text not null,          -- 'Q1'..'Q4'
  amount     numeric not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, year, quarter)
);

create index if not exists income_user_idx      on public.income(user_id);
create index if not exists deductions_user_idx  on public.deductions(user_id);
create index if not exists cme_user_idx          on public.cme(user_id);
create index if not exists credentials_user_idx  on public.credentials(user_id);

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table public.settings          enable row level security;
alter table public.income            enable row level security;
alter table public.deductions        enable row level security;
alter table public.cme               enable row level security;
alter table public.credentials       enable row level security;
alter table public.quarter_payments  enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'settings','income','deductions','cme','credentials','quarter_payments'
  ]
  loop
    execute format($f$
      drop policy if exists "own rows select" on public.%1$I;
      create policy "own rows select" on public.%1$I
        for select using (auth.uid() = user_id);

      drop policy if exists "own rows insert" on public.%1$I;
      create policy "own rows insert" on public.%1$I
        for insert with check (auth.uid() = user_id);

      drop policy if exists "own rows update" on public.%1$I;
      create policy "own rows update" on public.%1$I
        for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

      drop policy if exists "own rows delete" on public.%1$I;
      create policy "own rows delete" on public.%1$I
        for delete using (auth.uid() = user_id);
    $f$, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- Private storage bucket for receipts & credential documents
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Users may only touch objects under a top-level folder equal to their uid,
-- e.g. "<uid>/receipts/uuid.png".
drop policy if exists "documents own read" on storage.objects;
create policy "documents own read" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents own insert" on storage.objects;
create policy "documents own insert" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents own update" on storage.objects;
create policy "documents own update" on storage.objects
  for update using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "documents own delete" on storage.objects;
create policy "documents own delete" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
