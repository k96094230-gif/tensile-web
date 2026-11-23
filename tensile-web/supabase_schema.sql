-- Tensile 製片台 Web — Supabase Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ── Projects ──────────────────────────────────────────────────────────────────
create table if not exists projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null default '新專案',
  brief       text not null default '',
  updated_at  timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ── Shots ─────────────────────────────────────────────────────────────────────
create table if not exists shots (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  ord             integer not null default 0,

  -- Basic
  scene           text not null default '',
  description     text not null default '',
  notes           text not null default '',
  duration        integer not null default 5,         -- seconds

  -- P0: Camera language
  shot_size       text not null default '',            -- CU/MCU/MS/MWS/WS/EWS
  camera_height   text not null default '',            -- eye/low/high/bird/worm
  focal_length    text not null default '',            -- 24/35/50/85/135mm
  camera_move     text not null default '',            -- static/pan/tilt/dolly/truck/handheld/crane/drone
  subject_move    text not null default '',            -- free text: 人物走位描述

  -- Active variant (null = base shot)
  active_variant  text,                                -- 'a'/'b'/'c' or null

  -- Generation
  gi              text not null default '',            -- generated image URL
  gv              text not null default '',            -- generated video URL
  refs            jsonb not null default '[]',         -- [{url, name}]

  -- Status
  status          text not null default 'draft',       -- draft/approved/locked

  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create index if not exists shots_project_ord on shots(project_id, ord);

-- ── Shot Variants (A/B/C) ─────────────────────────────────────────────────────
create table if not exists shot_variants (
  id              uuid primary key default gen_random_uuid(),
  shot_id         uuid not null references shots(id) on delete cascade,
  variant_key     text not null,                       -- 'a'/'b'/'c'

  description     text not null default '',
  notes           text not null default '',
  shot_size       text not null default '',
  camera_height   text not null default '',
  focal_length    text not null default '',
  camera_move     text not null default '',
  subject_move    text not null default '',
  gi              text not null default '',
  gv              text not null default '',
  refs            jsonb not null default '[]',

  created_at      timestamptz not null default now(),
  unique(shot_id, variant_key)
);

-- ── Reference Library (P1) ───────────────────────────────────────────────────
create table if not exists project_refs (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references projects(id) on delete cascade,
  type        text not null default 'character',       -- character/costume/scene/product
  name        text not null default '',
  image_url   text not null default '',
  notes       text not null default '',
  created_at  timestamptz not null default now()
);

-- ── Shot Comments / Client Review (P1) ────────────────────────────────────────
create table if not exists shot_comments (
  id          uuid primary key default gen_random_uuid(),
  shot_id     uuid not null references shots(id) on delete cascade,
  author      text not null default '客戶',
  content     text not null default '',
  type        text not null default 'comment',         -- comment/approve/request_change
  created_at  timestamptz not null default now()
);

-- ── Project Versions / Snapshots (P1) ────────────────────────────────────────
create table if not exists project_versions (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references projects(id) on delete cascade,
  version_number  integer not null default 1,
  label           text not null default '',
  snapshot_json   jsonb not null default '{}',
  created_at      timestamptz not null default now()
);

-- ── RLS: 暫時開放（上線前記得設 Auth）────────────────────────────────────────
alter table projects enable row level security;
alter table shots enable row level security;
alter table shot_variants enable row level security;
alter table project_refs enable row level security;
alter table shot_comments enable row level security;
alter table project_versions enable row level security;

-- 開發用：全開（之後換成 auth.uid() 規則）
create policy "dev_all_projects" on projects for all using (true) with check (true);
create policy "dev_all_shots" on shots for all using (true) with check (true);
create policy "dev_all_variants" on shot_variants for all using (true) with check (true);
create policy "dev_all_refs" on project_refs for all using (true) with check (true);
create policy "dev_all_comments" on shot_comments for all using (true) with check (true);
create policy "dev_all_versions" on project_versions for all using (true) with check (true);

-- ── Storage buckets ────────────────────────────────────────────────────────────
-- Run separately in Supabase Dashboard > Storage:
-- Create bucket "media" (public)
