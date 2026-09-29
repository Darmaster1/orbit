-- Run this migration if you already ran the original schema.sql.
-- It adds signup profiles and the safe create/join family RPCs.

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1), 'Family member'),
    new.email
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create or replace function public.create_family(family_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  new_family uuid;
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  if length(trim(family_name)) < 2 then raise exception 'Family name is too short'; end if;
  insert into public.profiles (id, name, email)
    select id, coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1), 'Family member'), email
    from auth.users where id = auth.uid()
    on conflict (id) do nothing;
  insert into public.families (name) values (trim(family_name)) returning id into new_family;
  insert into public.family_members (family_id, user_id, role) values (new_family, auth.uid(), 'admin');
  insert into public.categories (family_id, name, icon) values
    (new_family, 'Food', 'utensils'), (new_family, 'Groceries', 'shopping-basket'),
    (new_family, 'Shopping', 'shopping-bag'), (new_family, 'Travel', 'plane'),
    (new_family, 'Fuel', 'fuel'), (new_family, 'Bills', 'receipt'),
    (new_family, 'Entertainment', 'clapperboard'), (new_family, 'Electronics', 'laptop'),
    (new_family, 'Education', 'book-open'), (new_family, 'Healthcare', 'heart-pulse'),
    (new_family, 'Other', 'circle-dot');
  insert into public.tags (family_id, name) values
    (new_family, 'Online'), (new_family, 'Offline'), (new_family, 'Delivery'),
    (new_family, 'Travel'), (new_family, 'International'), (new_family, 'Voucher'),
    (new_family, 'Subscription'), (new_family, 'EMI'), (new_family, 'Work'),
    (new_family, 'Personal'), (new_family, 'Family');
  return new_family;
end;
$$;

create or replace function public.join_family(invite_code_input text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  target_family uuid;
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  select id into target_family from public.families where upper(invite_code) = upper(trim(invite_code_input));
  if target_family is null then raise exception 'That invite code was not found'; end if;
  insert into public.profiles (id, name, email)
    select id, coalesce(raw_user_meta_data->>'name', split_part(email, '@', 1), 'Family member'), email
    from auth.users where id = auth.uid()
    on conflict (id) do nothing;
  insert into public.family_members (family_id, user_id, role)
    values (target_family, auth.uid(), 'member')
    on conflict (family_id, user_id) do nothing;
  return target_family;
end;
$$;

grant execute on function public.create_family(text) to authenticated;
grant execute on function public.join_family(text) to authenticated;

drop policy if exists "users see their own profile" on public.profiles;
create policy "users see their own profile" on public.profiles for select using (id = auth.uid());

drop policy if exists "members manage expense tags" on public.expense_tags;
create policy "members manage expense tags" on public.expense_tags for all
using (
  exists (select 1 from public.expenses e where e.id = expense_id and (e.created_by = auth.uid() or public.is_family_admin(e.family_id)))
)
with check (
  exists (select 1 from public.expenses e where e.id = expense_id and (e.created_by = auth.uid() or public.is_family_admin(e.family_id)))
);

-- Delete family RPC function for workspace owners/admins
create or replace function public.delete_family(family_id_input uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'You must be signed in'; end if;
  if not public.is_family_admin(family_id_input) then
    raise exception 'Only family administrators can delete this workspace';
  end if;
  delete from public.families where id = family_id_input;
end;
$$;

grant execute on function public.delete_family(uuid) to authenticated;