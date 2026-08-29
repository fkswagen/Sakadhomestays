create extension if not exists btree_gist;

-- Recreate booking schema after explicit approval; preserve unrelated project objects.
drop table if exists public.reservation_rooms cascade;
drop table if exists public.reservations cascade;
drop table if exists public.staff_members cascade;
drop table if exists public.rooms cascade;
drop table if exists public.profiles cascade;
drop type if exists public.reservation_status;
drop type if exists public.staff_role;

do $$ begin
  create type public.reservation_status as enum ('payment_pending', 'confirmed', 'cancelled', 'expired', 'refunded');
exception when duplicate_object then null;
end $$;
alter type public.reservation_status add value if not exists 'payment_pending';
alter type public.reservation_status add value if not exists 'confirmed';
alter type public.reservation_status add value if not exists 'cancelled';
alter type public.reservation_status add value if not exists 'expired';
alter type public.reservation_status add value if not exists 'refunded';

do $$ begin
  create type public.staff_role as enum ('owner', 'manager', 'reception');
exception when duplicate_object then null;
end $$;
alter type public.staff_role add value if not exists 'owner';
alter type public.staff_role add value if not exists 'manager';
alter type public.staff_role add value if not exists 'reception';

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  phone text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'th')),
  created_at timestamptz not null default now()
);

create table public.staff_members (
  user_id uuid primary key references public.profiles on delete cascade,
  role public.staff_role not null,
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name_en text not null,
  name_th text not null,
  description_en text,
  description_th text,
  max_guests integer not null check (max_guests between 1 and 10),
  base_rate integer not null check (base_rate > 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_code text unique not null default ('SAK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))),
  user_id uuid not null references public.profiles on delete restrict,
  check_in date not null,
  check_out date not null,
  guests integer not null check (guests between 1 and 10),
  guest_full_name text not null,
  guest_phone text not null,
  special_request text,
  status public.reservation_status not null default 'payment_pending',
  total_amount integer not null check (total_amount >= 0),
  currency text not null default 'thb',
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);

create table public.reservation_rooms (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references public.reservations on delete cascade,
  room_id uuid not null references public.rooms on delete restrict,
  check_in date not null,
  check_out date not null,
  nightly_rate integer not null check (nightly_rate > 0),
  status public.reservation_status not null default 'payment_pending',
  check (check_out > check_in),
  exclude using gist (
    room_id with =,
    daterange(check_in, check_out, '[)') with &&
  ) where (status in ('payment_pending', 'confirmed'))
);

create index reservations_user_id_idx on public.reservations (user_id, check_in desc);
create index reservation_rooms_room_id_idx on public.reservation_rooms (room_id);

insert into public.rooms (slug, name_en, name_th, max_guests, base_rate, image_url) values
  ('cloud-view-cottage', 'Cloud View Cottage', 'คอทเทจวิวเมฆ', 2, 240000, 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1100&q=85'),
  ('forest-family-house', 'Forest Family House', 'บ้านครอบครัวกลางป่า', 4, 420000, 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1100&q=85'),
  ('hmong-hill-cabin', 'Hmong Hill Cabin', 'กระท่อมม้งบนดอย', 2, 185000, 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1100&q=85');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.staff_members where user_id = auth.uid());
$$;

create or replace function public.available_rooms(requested_check_in date, requested_check_out date, requested_guests integer)
returns setof public.rooms language sql stable security definer set search_path = public as $$
  select r.* from public.rooms r
  where r.is_active
    and r.max_guests >= requested_guests
    and not exists (
      select 1 from public.reservation_rooms rr
      where rr.room_id = r.id
        and rr.status in ('payment_pending', 'confirmed')
        and daterange(rr.check_in, rr.check_out, '[)') && daterange(requested_check_in, requested_check_out, '[)')
    );
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists reservations_updated_at on public.reservations;
create trigger reservations_updated_at before update on public.reservations
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.staff_members enable row level security;
alter table public.rooms enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_rooms enable row level security;

create policy "Public can view active rooms" on public.rooms for select using (is_active or public.is_staff());
create policy "Guest reads own profile" on public.profiles for select using (id = auth.uid());
create policy "Guest updates own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "Guest reads own reservations" on public.reservations for select using (user_id = auth.uid() or public.is_staff());
create policy "Staff reads reservation rooms" on public.reservation_rooms for select using (public.is_staff());
grant execute on function public.available_rooms(date, date, integer) to anon, authenticated;
