create extension if not exists "uuid-ossp";
create extension if not exists btree_gist;

create type public.user_role as enum ('customer', 'admin');
create type public.reservation_status as enum ('pending', 'confirmed', 'cancelled', 'completed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text not null default '',
  role public.user_role not null default 'customer',
  created_at timestamptz not null default now()
);

create table public.rooms (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  description text,
  capacity smallint not null check (capacity > 0),
  nightly_rate numeric(10, 2) not null check (nightly_rate >= 0),
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.reservations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  room_id uuid not null references public.rooms(id) on delete restrict,
  check_in date not null,
  check_out date not null,
  guests smallint not null check (guests > 0),
  total_amount numeric(10, 2) not null check (total_amount >= 0),
  status public.reservation_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint valid_stay_dates check (check_out > check_in)
);

-- Prevent overlapping active reservations for same room at database level.
alter table public.reservations add constraint no_overlapping_reservations
exclude using gist (
  room_id with =,
  daterange(check_in, check_out, '[)') with &&
) where (status in ('pending', 'confirmed'));

create index reservations_room_dates_idx on public.reservations (room_id, check_in, check_out);
create index reservations_user_idx on public.reservations (user_id);

create or replace function public.room_is_available(target_room_id uuid, target_check_in date, target_check_out date)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.reservations
    where room_id = target_room_id
      and status in ('pending', 'confirmed')
      and check_in < target_check_out
      and check_out > target_check_in
  );
$$;

create or replace function public.create_reservation(
  target_room_id uuid,
  target_check_in date,
  target_check_out date,
  target_guests smallint
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  selected_room public.rooms%rowtype;
  reservation_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if target_check_out <= target_check_in then
    raise exception 'Check-out must be after check-in';
  end if;

  select * into selected_room
  from public.rooms
  where id = target_room_id and is_active
  for share;

  if not found then
    raise exception 'Selected room is unavailable';
  end if;

  if target_guests < 1 or target_guests > selected_room.capacity then
    raise exception 'Guest count exceeds room capacity';
  end if;

  insert into public.reservations (user_id, room_id, check_in, check_out, guests, total_amount)
  values (
    auth.uid(), target_room_id, target_check_in, target_check_out, target_guests,
    selected_room.nightly_rate * (target_check_out - target_check_in)
  )
  returning id into reservation_id;

  return reservation_id;
end;
$$;

insert into public.rooms (name, slug, description, capacity, nightly_rate, image_url) values
  ('Cloud View Cottage', 'cloud-view-cottage', 'Private cottage with a mountain-facing balcony.', 2, 2400, 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1100&q=85'),
  ('Forest Family House', 'forest-family-house', 'Two-bedroom home for families and small groups.', 4, 4200, 'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1100&q=85'),
  ('Hmong Hill Cabin', 'hmong-hill-cabin', 'Handcrafted cabin beside village gardens.', 2, 1850, 'https://images.unsplash.com/photo-1449158743715-0a90ebb6d2d8?auto=format&fit=crop&w=1100&q=85');

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

create or replace function public.update_my_profile(target_full_name text, target_phone text)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare
  updated_profile public.profiles%rowtype;
begin
  if auth.uid() is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if length(trim(target_full_name)) = 0 then
    raise exception 'Full name is required';
  end if;

  if length(trim(coalesce(target_phone, ''))) > 30 then
    raise exception 'Phone number is too long';
  end if;

  update public.profiles
  set full_name = trim(target_full_name), phone = trim(coalesce(target_phone, ''))
  where id = auth.uid()
  returning * into updated_profile;

  return updated_profile;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.reservations enable row level security;

create policy "Public can view active rooms" on public.rooms for select using (is_active or public.is_admin());
create policy "Users can view own profile" on public.profiles for select using (id = auth.uid() or public.is_admin());
create policy "Users can update own profile" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid() and role = 'customer');
create policy "Users can view own reservations" on public.reservations for select using (user_id = auth.uid() or public.is_admin());
create policy "Admins can manage rooms" on public.rooms for all using (public.is_admin()) with check (public.is_admin());
create policy "Admins can manage reservations" on public.reservations for all using (public.is_admin()) with check (public.is_admin());

revoke all on function public.room_is_available(uuid, date, date) from public;
grant execute on function public.room_is_available(uuid, date, date) to authenticated;
revoke all on function public.create_reservation(uuid, date, date, smallint) from public;
grant execute on function public.create_reservation(uuid, date, date, smallint) to authenticated;
revoke all on function public.update_my_profile(text, text) from public;
grant execute on function public.update_my_profile(text, text) to authenticated;

-- Promote a trusted staff account after it signs up:
-- update public.profiles set role = 'admin' where id = 'USER_UUID';
