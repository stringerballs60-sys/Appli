alter table public.properties
  add column if not exists cleaning_fee numeric(10,2),
  add column if not exists cleaning_fee_peak numeric(10,2),
  add column if not exists peak_months smallint[] not null default '{7,8}',
  add column if not exists bed_double_fee numeric(10,2),
  add column if not exists bed_single_fee numeric(10,2),
  add column if not exists commission_rate numeric(5,2),
  add column if not exists cleaning_payer text not null default 'platform',
  add column if not exists beds_payer text not null default 'platform';

alter table public.properties drop constraint if exists properties_cleaning_payer_check;
alter table public.properties add constraint properties_cleaning_payer_check check (cleaning_payer in ('platform', 'owner', 'onsite'));
alter table public.properties drop constraint if exists properties_beds_payer_check;
alter table public.properties add constraint properties_beds_payer_check check (beds_payer in ('platform', 'owner', 'onsite'));

alter table public.reservations
  add column if not exists cleaning_amount numeric(10,2),
  add column if not exists beds_amount numeric(10,2),
  add column if not exists commission_amount numeric(10,2);

alter table public.reservations drop constraint if exists reservations_amounts_check;
alter table public.reservations add constraint reservations_amounts_check
  check (coalesce(cleaning_amount, 0) >= 0 and coalesce(beds_amount, 0) >= 0 and coalesce(commission_amount, 0) >= 0);

create or replace function public.trg_reservation_total_price()
returns trigger
language plpgsql
as $function$
begin
  if NEW.cleaning_amount is null and NEW.beds_amount is null and NEW.commission_amount is null then
    NEW.price := null;
  else
    NEW.price := coalesce(NEW.cleaning_amount, 0) + coalesce(NEW.beds_amount, 0) + coalesce(NEW.commission_amount, 0);
  end if;
  return NEW;
end;
$function$;

-- montants déjà saisis : presta ménage -> part ménage, autres -> commission
update public.reservations r set cleaning_amount = r.price
  from public.properties p
  where p.id = r.property_id and r.price is not null and r.cleaning_amount is null
    and p.property_type in ('EXTERNAL_CLEANING', 'EXTERNAL_CLEANING_CHECKIN');
update public.reservations r set commission_amount = r.price
  from public.properties p
  where p.id = r.property_id and r.price is not null and r.commission_amount is null and r.cleaning_amount is null
    and p.property_type not in ('EXTERNAL_CLEANING', 'EXTERNAL_CLEANING_CHECKIN');

drop trigger if exists reservations_total_price on public.reservations;
create trigger reservations_total_price before insert or update on public.reservations
  for each row execute function public.trg_reservation_total_price();

-- « Presta » n'est plus une provenance : c'est le type du logement (ménage seul)
update public.reservations r set source = case when p.name = 'Bernard Lozari' then 'airbnb' else 'manual' end
  from public.properties p
  where p.id = r.property_id and r.source = 'presta';

comment on column public.reservations.price is 'Total gagné par Charles = cleaning_amount + beds_amount + commission_amount (calculé par trigger).';
