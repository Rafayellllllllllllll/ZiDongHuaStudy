-- 错题本 · Supabase 建表 SQL v2（修正顺序：先建账号表，再建管理员判断函数，再建其他表）
-- SQL Editor 里粘贴运行一次即可；上一版报错是因为函数先引用了还没建的账号表，本版已调换顺序。

-- 1) 账号表：先建表
create table if not exists public.profiles (
  id uuid primary key,
  username text not null unique,
  email text unique,
  avatar_url text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

-- 2) 管理员判断函数：表建好后再建，函数里查的就是上面这张表
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 3) 账号表锁和规则
alter table public.profiles enable row level security;
drop policy if exists "profiles_own_select" on public.profiles;
create policy "profiles_own_select" on public.profiles for select using (id = auth.uid() or public.is_admin());
drop policy if exists "profiles_own_insert" on public.profiles;
create policy "profiles_own_insert" on public.profiles for insert with check (id = auth.uid());
drop policy if exists "profiles_own_update" on public.profiles;
create policy "profiles_own_update" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- 4) 错题表
create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  subject text,
  qkind text check (qkind in ('选择题', '判断题', '主观题')),
  stem text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer text,
  explain text,
  explain_edited boolean not null default false,
  explain_type text,
  error_reason text,
  batch text,
  starred boolean not null default false,
  mastered boolean not null default false,
  consecutive_correct integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.questions enable row level security;
drop policy if exists "questions_owner_all" on public.questions;
create policy "questions_owner_all" on public.questions for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 5) 笔记本表
create table if not exists public.notebook_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  color text not null default 'black' check (color in ('black', 'red', 'blue')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.notebook_items enable row level security;
drop policy if exists "notebook_owner_all" on public.notebook_items;
create policy "notebook_owner_all" on public.notebook_items for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 6) 登录记录表
create table if not exists public.login_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  username text,
  login_at timestamptz not null default now(),
  last_active_at timestamptz,
  duration_seconds integer,
  created_at timestamptz not null default now()
);
alter table public.login_records enable row level security;
drop policy if exists "login_records_own_insert" on public.login_records;
create policy "login_records_own_insert" on public.login_records for insert with check (owner_id = auth.uid());
drop policy if exists "login_records_admin_select" on public.login_records;
create policy "login_records_admin_select" on public.login_records for select using (public.is_admin());
drop policy if exists "login_records_own_select" on public.login_records;
create policy "login_records_own_select" on public.login_records for select using (owner_id = auth.uid());

-- 7) 管理员账号以后这样标（现在先不要运行，等你用管理员账号在网站上注册成功后再运行下面这一行）：
-- update public.profiles set role = 'admin' where username = 'Rafayellllllllllllll';
