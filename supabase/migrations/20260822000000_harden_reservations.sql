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

drop policy if exists "Users can create own reservations" on public.reservations;

revoke all on function public.room_is_available(uuid, date, date) from public;
grant execute on function public.room_is_available(uuid, date, date) to authenticated;
revoke all on function public.create_reservation(uuid, date, date, smallint) from public;
grant execute on function public.create_reservation(uuid, date, date, smallint) to authenticated;
