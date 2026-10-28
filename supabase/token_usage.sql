-- 错题本 · token 用量表（2026-10-28）
-- 用法：在 Supabase 后台 → SQL Editor 粘贴运行一次即可。
-- 之后再重新部署 explain / vision 函数（supabase functions deploy explain / vision），前端才会收到用量并按账号写进这张表。
-- 以前的调用没有记录用量，无法找回历史总量，只能从部署后开始累计。
create table if not exists public.token_usage (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references public.profiles(id) on delete cascade,
  username text,
  model text,
  function_name text,
  prompt_tokens integer not null default 0,
  completion_tokens integer not null default 0,
  total_tokens integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.token_usage enable row level security;
drop policy if exists "token_usage_own_insert" on public.token_usage;
create policy "token_usage_own_insert" on public.token_usage for insert with check (owner_id = auth.uid());
drop policy if exists "token_usage_own_or_admin_select" on public.token_usage;
create policy "token_usage_own_or_admin_select" on public.token_usage for select using (owner_id = auth.uid() or public.is_admin());
