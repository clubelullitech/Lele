-- Esquema inicial planejado para Supabase (não necessário para testar o protótipo local)
create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid references families(id) on delete cascade,
  role text check (role in ('parent','child')) not null,
  display_name text not null,
  birth_date date,
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  child_id uuid references profiles(id) on delete cascade,
  title text not null,
  category text,
  scheduled_time time,
  duration_minutes int default 10,
  task_type text default 'fixed',
  voice_enabled boolean default true,
  shared boolean default false,
  status text default 'pending',
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

create table school_projects (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  child_id uuid references profiles(id) on delete cascade,
  title text not null,
  subject text,
  due_date date,
  materials jsonb default '[]'::jsonb,
  notes text,
  created_at timestamptz default now()
);

create table messages (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families(id) on delete cascade,
  child_id uuid references profiles(id) on delete cascade,
  sender_id uuid references profiles(id),
  message_type text check (message_type in ('text','audio','system')) default 'text',
  body text,
  audio_path text,
  created_at timestamptz default now()
);

-- IMPORTANTE:
-- Em produção, ativar RLS em TODAS as tabelas e criar políticas por family_id.
-- Nunca liberar SELECT/INSERT/UPDATE global para usuários autenticados.
