-- 错题本 · 2026-11-03
-- 笔记本按账号上云、旧笔记本还能看、知识点收藏上云、笔记图片进 Storage。
--
-- 怎么跑：Supabase 后台 → SQL Editor → 新建查询 → 把本文件全部粘贴 → Run。
-- 只跑一次。可以重复跑，不会把已有笔记清掉。
-- 跑完之前网站也能用：笔记会先塞进原来的 content 字段，收藏先留在手机上；
-- 跑完之后刷新页面，笔记字段、收藏、图片就会走新结构。

-- 1) 笔记本：在原来的 notebook_items 上加列。
--    旧行只有 content / color，网站会继续把它们显示成笔记。
--    content 仍保留，当作纯文字备份（不能为空）。
alter table public.notebook_items add column if not exists title text;
alter table public.notebook_items add column if not exists body text;
alter table public.notebook_items add column if not exists body_html text;
alter table public.notebook_items add column if not exists images jsonb not null default '[]'::jsonb;

-- 2) 知识点收藏：按账号存，一个人只能读写自己的。
create table if not exists public.knowledge_favorites (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kp_id text not null,
  name text not null default '',
  subject text not null default '',
  chapter text not null default '',
  summary text not null default '',
  detail text not null default '',
  question_ids jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (owner_id, kp_id)
);
alter table public.knowledge_favorites enable row level security;
drop policy if exists "favorites_owner_all" on public.knowledge_favorites;
create policy "favorites_owner_all" on public.knowledge_favorites
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- 3) 笔记图片：私有桶，文件放在「自己的用户 id / 文件名」下面，别人读不到。
insert into storage.buckets (id, name, public)
values ('note-images', 'note-images', false)
on conflict (id) do nothing;

drop policy if exists "note_images_select_own" on storage.objects;
create policy "note_images_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'note-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "note_images_insert_own" on storage.objects;
create policy "note_images_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'note-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "note_images_update_own" on storage.objects;
create policy "note_images_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'note-images'
    and split_part(name, '/', 1) = auth.uid()::text
  )
  with check (
    bucket_id = 'note-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );

drop policy if exists "note_images_delete_own" on storage.objects;
create policy "note_images_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'note-images'
    and split_part(name, '/', 1) = auth.uid()::text
  );
