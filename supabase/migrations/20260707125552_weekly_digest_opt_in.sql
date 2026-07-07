alter table public.profiles
  add column if not exists digest_opt_in boolean not null default false;

create or replace function public.touch_profiles_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.touch_profiles_updated_at() from public;

drop trigger if exists profiles_touch_updated_at on public.profiles;

create trigger profiles_touch_updated_at
before update on public.profiles
for each row
execute function public.touch_profiles_updated_at();

grant select, insert, update, delete on public.profiles to authenticated;
grant select, update on public.profiles to service_role;
grant select on public.charts to service_role;
