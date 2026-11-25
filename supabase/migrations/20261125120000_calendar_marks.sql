create table if not exists public.calendar_marks (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  start_date date not null,
  end_date date not null,
  color text not null default 'sable',
  kind text not null default 'event',
  yearly boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint calendar_marks_dates check (end_date >= start_date),
  constraint calendar_marks_kind check (kind in ('event', 'holiday', 'bridge')),
  constraint calendar_marks_color check (color in ('sable', 'lavande', 'olive', 'ciel', 'rose'))
);

create index if not exists calendar_marks_user_idx on public.calendar_marks (user_id, start_date);

alter table public.calendar_marks enable row level security;

drop policy if exists calendar_marks_read on public.calendar_marks;
create policy calendar_marks_read on public.calendar_marks for select
  using (user_id = auth.uid() or user_id = get_owner_id(auth.uid()));

drop policy if exists calendar_marks_insert on public.calendar_marks;
create policy calendar_marks_insert on public.calendar_marks for insert
  with check (user_id = auth.uid());

drop policy if exists calendar_marks_update on public.calendar_marks;
create policy calendar_marks_update on public.calendar_marks for update
  using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists calendar_marks_delete on public.calendar_marks;
create policy calendar_marks_delete on public.calendar_marks for delete
  using (user_id = auth.uid());

drop trigger if exists trg_calendar_marks_updated_at on public.calendar_marks;
create trigger trg_calendar_marks_updated_at before update on public.calendar_marks
  for each row execute function public.update_updated_at();
