alter table public.profiles add column if not exists phone text not null default '';

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

revoke all on function public.update_my_profile(text, text) from public;
grant execute on function public.update_my_profile(text, text) to authenticated;
