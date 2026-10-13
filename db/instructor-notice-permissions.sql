create table public.instructor_permissions (user_id uuid primary key, can_edit_notices boolean not null default false, active boolean not null default false);
alter table public.instructor_permissions enable row level security;
revoke all on public.instructor_permissions from public, anon, authenticated;
grant select on public.instructor_permissions to service_role;
create table public.instructor_notices (notice_id uuid primary key default gen_random_uuid(), title text not null, content text not null, created_at timestamptz not null default now());
alter table public.instructor_notices enable row level security;
revoke all on public.instructor_notices from public, anon, authenticated;
grant select, insert, update, delete on public.instructor_notices to service_role;
