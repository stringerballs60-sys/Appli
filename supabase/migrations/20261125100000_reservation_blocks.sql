alter table public.reservations
  add column if not exists kind text not null default 'stay',
  add column if not exists block_reason text;

alter table public.reservations drop constraint if exists reservations_kind_check;
alter table public.reservations add constraint reservations_kind_check check (kind in ('stay', 'block'));

alter table public.reservations drop constraint if exists reservations_block_reason_check;
alter table public.reservations add constraint reservations_block_reason_check
  check (block_reason is null or block_reason in ('personal', 'owner', 'works', 'other'));

create index if not exists reservations_kind_idx on public.reservations (user_id, kind);

create or replace function public.trg_auto_create_cleaning_task()
returns trigger
language plpgsql
security definer
as $function$
declare
  prop_name   text;
  new_task_id uuid;
begin
  if NEW.kind = 'block' then return NEW; end if;
  if NEW.status = 'cancelled' then return NEW; end if;
  if TG_OP = 'UPDATE' and OLD.status != 'cancelled' then return NEW; end if;

  if exists (
    select 1 from tasks where reservation_id = NEW.id and type = 'cleaning'
  ) then return NEW; end if;

  select name into prop_name from properties where id = NEW.property_id;

  insert into tasks (user_id, property_id, reservation_id, type, title, scheduled_date, status)
  values (
    NEW.user_id, NEW.property_id, NEW.id, 'cleaning',
    'Ménage – ' || coalesce(prop_name, 'Logement'),
    NEW.check_out, 'pending'
  )
  returning id into new_task_id;

  insert into task_checklist_items (task_id, user_id, label, order_index)
  select new_task_id, NEW.user_id, label, order_index
  from   property_checklist_templates
  where  property_id = NEW.property_id
    and  user_id     = NEW.user_id
  order  by order_index;

  return NEW;
end;
$function$;

create or replace function public.compute_property_cleaning_status(prop_id uuid)
returns text
language plpgsql
stable security definer
as $function$
declare
  today            date := current_date;
  has_active_resa  boolean;
  pending_status   text;
begin
  select exists(
    select 1 from reservations
    where property_id = prop_id
      and status not in ('cancelled')
      and kind = 'stay'
      and check_in  <= today
      and check_out  > today
  ) into has_active_resa;

  if has_active_resa then return 'occupied'; end if;

  select status into pending_status
  from tasks
  where property_id = prop_id
    and type   = 'cleaning'
    and status != 'done'
  order by scheduled_date desc, created_at desc
  limit 1;

  if pending_status in ('in_progress', 'paused') then return 'in_progress'; end if;
  if pending_status = 'pending'                  then return 'to_do';       end if;
  return 'ready';
end;
$function$;

alter table public.reservations drop constraint if exists at_least_one_guest;
alter table public.reservations add constraint at_least_one_guest
  check (kind = 'block' or (nb_couples + nb_solo_adults + nb_children + nb_babies) > 0);
