-- Lelê: chat familiar seguro e estrutura para notificações Web Push.
-- Execute uma vez no SQL Editor do projeto Supabase do Lelê.

create extension if not exists pgcrypto;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  child_id uuid references public.family_members(id) on delete cascade,
  sender_id uuid not null references public.family_members(id) on delete cascade,
  message_type text not null default 'text'
    check (message_type in ('text', 'audio', 'system')),
  body text,
  audio_path text,
  created_at timestamptz not null default now()
);

create index if not exists messages_family_created_idx
  on public.messages (family_id, created_at desc);

alter table public.messages enable row level security;

drop policy if exists "lele_family_read_messages" on public.messages;
create policy "lele_family_read_messages"
on public.messages for select to authenticated
using (
  exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and fm.family_id = messages.family_id
      and fm.active = true
  )
);

drop policy if exists "lele_family_send_messages" on public.messages;
create policy "lele_family_send_messages"
on public.messages for insert to authenticated
with check (
  exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and fm.id = messages.sender_id
      and fm.family_id = messages.family_id
      and fm.active = true
  )
);

drop policy if exists "lele_family_delete_expired_messages" on public.messages;
create policy "lele_family_delete_expired_messages"
on public.messages for delete to authenticated
using (
  created_at < now() - interval '48 hours'
  and exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and fm.family_id = messages.family_id
      and fm.active = true
  )
);

drop policy if exists "lele_family_read_chat_audio" on storage.objects;
create policy "lele_family_read_chat_audio"
on storage.objects for select to authenticated
using (
  bucket_id = 'task-evidence'
  and exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and fm.family_id::text = (storage.foldername(name))[1]
      and fm.active = true
  )
);

drop policy if exists "lele_family_upload_chat_audio" on storage.objects;
create policy "lele_family_upload_chat_audio"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'task-evidence'
  and exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and fm.family_id::text = (storage.foldername(name))[1]
      and fm.active = true
  )
);

drop policy if exists "lele_family_delete_chat_audio" on storage.objects;
create policy "lele_family_delete_chat_audio"
on storage.objects for delete to authenticated
using (
  bucket_id = 'task-evidence'
  and exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and fm.family_id::text = (storage.foldername(name))[1]
      and fm.active = true
  )
);

do $$
begin
  alter publication supabase_realtime add table public.messages;
exception
  when duplicate_object then null;
end $$;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  member_id uuid not null references public.family_members(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "lele_manage_own_push_subscription" on public.push_subscriptions;
create policy "lele_manage_own_push_subscription"
on public.push_subscriptions for all to authenticated
using (
  exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and fm.id = push_subscriptions.member_id
      and fm.family_id = push_subscriptions.family_id
      and fm.active = true
  )
)
with check (
  exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and fm.id = push_subscriptions.member_id
      and fm.family_id = push_subscriptions.family_id
      and fm.active = true
  )
);
