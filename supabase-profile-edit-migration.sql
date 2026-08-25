-- Lelê: permite que responsáveis editem perfis da própria família.
-- Execute uma vez no SQL Editor do Supabase.

alter table public.family_members enable row level security;

drop policy if exists "lele_parents_update_family_profiles" on public.family_members;
create policy "lele_parents_update_family_profiles"
on public.family_members
for update
to authenticated
using (
  exists (
    select 1
    from public.family_members current_member
    where current_member.user_id = auth.uid()
      and current_member.family_id = family_members.family_id
      and current_member.role = 'parent'
      and current_member.active = true
  )
)
with check (
  exists (
    select 1
    from public.family_members current_member
    where current_member.user_id = auth.uid()
      and current_member.family_id = family_members.family_id
      and current_member.role = 'parent'
      and current_member.active = true
  )
  and role in ('parent', 'child')
);

create table if not exists public.family_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null,
  event_date date not null,
  icon text not null default '🎉',
  annual boolean not null default true,
  created_by uuid references public.family_members(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.family_events enable row level security;

drop policy if exists "lele_family_read_events" on public.family_events;
create policy "lele_family_read_events"
on public.family_events for select to authenticated
using (
  exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and fm.family_id = family_events.family_id
      and fm.active = true
  )
);

drop policy if exists "lele_parents_manage_events" on public.family_events;
create policy "lele_parents_manage_events"
on public.family_events for all to authenticated
using (
  exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and fm.family_id = family_events.family_id
      and fm.role = 'parent'
      and fm.active = true
  )
)
with check (
  exists (
    select 1 from public.family_members fm
    where fm.user_id = auth.uid()
      and fm.family_id = family_events.family_id
      and fm.role = 'parent'
      and fm.active = true
  )
);
