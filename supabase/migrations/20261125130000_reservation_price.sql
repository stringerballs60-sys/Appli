alter table public.reservations add column if not exists price numeric(10,2);
alter table public.reservations drop constraint if exists reservations_price_check;
alter table public.reservations add constraint reservations_price_check check (price is null or price >= 0);
