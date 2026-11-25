alter table public.reservations drop constraint if exists reservations_source_check;
alter table public.reservations add constraint reservations_source_check
  check (source in ('airbnb', 'booking', 'abritel', 'manual', 'presta'));
comment on column public.reservations.price is 'Ce que Charles gagne sur la résa : commission (Airbnb, Direct, Booking, Abritel) ou prix de la presta ménage (Presta).';
update public.reservations r set source = 'presta'
  from public.properties p
  where p.id = r.property_id and r.kind = 'stay'
    and p.property_type in ('EXTERNAL_CLEANING', 'EXTERNAL_CLEANING_CHECKIN');
