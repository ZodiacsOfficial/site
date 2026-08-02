-- Ask Zodiacs remembered-conversation storage caps.
--
-- Browser roles retain read-only access to their unexpired rows. All writes
-- go through the reviewed auth.uid-scoped RPCs, while owner-only invoker
-- triggers serialize inserts per user and enforce hard storage ceilings.

revoke insert, update, delete on table public.assistant_threads from authenticated;
revoke insert, update, delete on table public.assistant_turns from authenticated;
revoke all on table public.assistant_threads from anon;
revoke all on table public.assistant_turns from anon;
revoke all on table public.assistant_threads from service_role;
revoke all on table public.assistant_turns from service_role;
grant select on table public.assistant_threads to authenticated;
grant select on table public.assistant_turns to authenticated;

-- The profile opt-out trigger must retain delete authority after direct table
-- mutations are removed from authenticated. Its target is fixed by OLD.user_id
-- and its execute privilege remains owner-only.
alter function public.assistant_memory_purge_on_opt_out() security definer;
alter function public.assistant_memory_purge_on_opt_out()
  set search_path = pg_catalog, public;

-- Mutation RPCs already derive their owner from auth.uid() and validate chart
-- ownership, opt-in, thread ownership, and input shape. SECURITY DEFINER lets
-- those explicit checks remain the sole write path after table grants close.
alter function public.assistant_memory_set_opt_in(boolean) security definer;
alter function public.assistant_memory_set_opt_in(boolean)
  set search_path = pg_catalog, public;
alter function public.assistant_memory_save_turn(uuid, uuid, text, text, timestamptz) security definer;
alter function public.assistant_memory_save_turn(uuid, uuid, text, text, timestamptz)
  set search_path = pg_catalog, public;
alter function public.assistant_memory_enable_and_import_thread(uuid, text, text, uuid, jsonb) security definer;
alter function public.assistant_memory_enable_and_import_thread(uuid, text, text, uuid, jsonb)
  set search_path = pg_catalog, public;
alter function public.assistant_memory_delete_thread(uuid) security definer;
alter function public.assistant_memory_delete_thread(uuid)
  set search_path = pg_catalog, public;
alter function public.assistant_memory_delete_all() security definer;
alter function public.assistant_memory_delete_all()
  set search_path = pg_catalog, public;

-- Re-state the import body because the old invoker implementation relied on
-- update RLS to reject an expired conflict. A definer function must express
-- that active-thread boundary directly.
create or replace function public.assistant_memory_import_thread(
  p_thread_id uuid,
  p_locale text,
  p_title text,
  p_chart_id uuid,
  p_turns jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid := (select auth.uid());
  item jsonb;
  item_id uuid;
  item_question text;
  item_answer text;
  item_completed_at timestamptz;
  existing_question text;
  existing_answer text;
  inserted_turns integer := 0;
  affected integer;
  thread_expiry timestamptz;
begin
  if owner_id is null
     or p_thread_id is null
     or p_locale not in ('en', 'es', 'pt', 'fr', 'it')
     or p_title is null
     or p_title <> btrim(p_title)
     or char_length(p_title) not between 1 and 120
     or p_turns is null
     or jsonb_typeof(p_turns) <> 'array'
     or jsonb_array_length(p_turns) > 100 then
    raise exception 'assistant_memory_import_thread: invalid request';
  end if;

  if not exists (
    select 1 from public.profiles
    where user_id = owner_id and assistant_memory_opt_in
  ) then
    raise exception 'assistant_memory_import_thread: memory is not enabled';
  end if;

  if p_chart_id is not null and not exists (
    select 1 from public.charts
    where id = p_chart_id and user_id = owner_id
  ) then
    raise exception 'assistant_memory_import_thread: chart is not owned';
  end if;

  insert into public.assistant_threads (id, user_id, locale, title, chart_id)
  values (p_thread_id, owner_id, p_locale, p_title, p_chart_id)
  on conflict (id) do update
    set locale = excluded.locale,
        title = excluded.title,
        chart_id = excluded.chart_id
    where assistant_threads.user_id = owner_id
      and assistant_threads.expires_at > statement_timestamp()
  returning expires_at into thread_expiry;

  if thread_expiry is null then
    raise exception 'assistant_memory_import_thread: thread unavailable';
  end if;

  for item in select value from jsonb_array_elements(p_turns)
  loop
    if jsonb_typeof(item) <> 'object'
       or not (item ?& array['id', 'question', 'answer', 'completedAt'])
       or exists (
         select 1 from jsonb_object_keys(item) as key
         where key not in ('id', 'question', 'answer', 'completedAt')
       ) then
      raise exception 'assistant_memory_import_thread: invalid turn';
    end if;

    begin
      item_id := (item ->> 'id')::uuid;
      item_completed_at := (item ->> 'completedAt')::timestamptz;
    exception when others then
      raise exception 'assistant_memory_import_thread: invalid turn';
    end;

    item_question := item ->> 'question';
    item_answer := item ->> 'answer';

    if item_id is null
       or item_question is null
       or char_length(btrim(item_question)) not between 1 and 1200
       or item_answer is null
       or char_length(btrim(item_answer)) not between 1 and 16000
       or item_completed_at < statement_timestamp() - interval '90 days'
       or item_completed_at > statement_timestamp() + interval '5 minutes' then
      raise exception 'assistant_memory_import_thread: invalid turn';
    end if;

    select question, answer
    into existing_question, existing_answer
    from public.assistant_turns
    where thread_id = p_thread_id
      and id = item_id
      and user_id = owner_id;

    if found then
      if existing_question <> item_question or existing_answer <> item_answer then
        raise exception 'assistant_memory_import_thread: turn id conflict';
      end if;
      continue;
    end if;

    insert into public.assistant_turns (
      id, thread_id, user_id, question, answer, completed_at
    ) values (
      item_id, p_thread_id, owner_id,
      item_question, item_answer, item_completed_at
    )
    on conflict (thread_id, id) do nothing;

    get diagnostics affected = row_count;
    inserted_turns := inserted_turns + affected;
  end loop;

  return jsonb_build_object(
    'thread_id', p_thread_id,
    'expires_at', thread_expiry,
    'inserted_turns', inserted_turns
  );
end;
$$;

create or replace function public.assistant_memory_enforce_thread_insert_cap()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  request_owner uuid := (select auth.uid());
  active_threads integer;
begin
  if request_owner is not null and request_owner <> new.user_id then
    raise exception 'assistant_memory_limit:owner_mismatch';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ask-zodiacs-memory:' || new.user_id::text, 0)
  );

  -- ON CONFLICT still fires BEFORE INSERT triggers. Let a replay of an
  -- existing active ID proceed so idempotent imports remain usable at cap.
  if exists (
    select 1 from public.assistant_threads
    where id = new.id
      and user_id = new.user_id
      and expires_at > statement_timestamp()
  ) then
    return new;
  end if;

  select count(*) into active_threads
  from public.assistant_threads
  where user_id = new.user_id
    and expires_at > statement_timestamp();

  if active_threads >= 20 then
    raise exception 'assistant_memory_limit:thread_limit';
  end if;
  return new;
end;
$$;

create or replace function public.assistant_memory_enforce_turn_insert_caps()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  request_owner uuid := (select auth.uid());
  thread_turns integer;
  active_turns integer;
begin
  if request_owner is not null and request_owner <> new.user_id then
    raise exception 'assistant_memory_limit:owner_mismatch';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ask-zodiacs-memory:' || new.user_id::text, 0)
  );

  if exists (
    select 1 from public.assistant_turns
    where thread_id = new.thread_id
      and id = new.id
      and user_id = new.user_id
  ) then
    return new;
  end if;

  select count(*) into thread_turns
  from public.assistant_turns as turn_row
  join public.assistant_threads as thread
    on thread.id = turn_row.thread_id
   and thread.user_id = turn_row.user_id
  where turn_row.thread_id = new.thread_id
    and turn_row.user_id = new.user_id
    and thread.expires_at > statement_timestamp();

  if thread_turns >= 100 then
    raise exception 'assistant_memory_limit:thread_turn_limit';
  end if;

  select count(*) into active_turns
  from public.assistant_turns as turn_row
  join public.assistant_threads as thread
    on thread.id = turn_row.thread_id
   and thread.user_id = turn_row.user_id
  where turn_row.user_id = new.user_id
    and thread.expires_at > statement_timestamp();

  if active_turns >= 500 then
    raise exception 'assistant_memory_limit:total_turn_limit';
  end if;
  return new;
end;
$$;

revoke all on function public.assistant_memory_enforce_thread_insert_cap() from public;
revoke all on function public.assistant_memory_enforce_thread_insert_cap() from anon;
revoke all on function public.assistant_memory_enforce_thread_insert_cap() from authenticated;
revoke all on function public.assistant_memory_enforce_thread_insert_cap() from service_role;
revoke all on function public.assistant_memory_enforce_turn_insert_caps() from public;
revoke all on function public.assistant_memory_enforce_turn_insert_caps() from anon;
revoke all on function public.assistant_memory_enforce_turn_insert_caps() from authenticated;
revoke all on function public.assistant_memory_enforce_turn_insert_caps() from service_role;
revoke all on function public.assistant_memory_purge_on_opt_out() from public;
revoke all on function public.assistant_memory_purge_on_opt_out() from anon;
revoke all on function public.assistant_memory_purge_on_opt_out() from authenticated;
revoke all on function public.assistant_memory_purge_on_opt_out() from service_role;

drop trigger if exists assistant_threads_enforce_insert_cap on public.assistant_threads;
create trigger assistant_threads_enforce_insert_cap
before insert on public.assistant_threads
for each row execute function public.assistant_memory_enforce_thread_insert_cap();

drop trigger if exists assistant_turns_enforce_insert_caps on public.assistant_turns;
create trigger assistant_turns_enforce_insert_caps
before insert on public.assistant_turns
for each row execute function public.assistant_memory_enforce_turn_insert_caps();

-- Reassert the intended RPC boundary after CREATE OR REPLACE/ALTER FUNCTION.
revoke all on function public.assistant_memory_set_opt_in(boolean) from public, anon, service_role;
revoke all on function public.assistant_memory_import_thread(uuid, text, text, uuid, jsonb) from public, anon, service_role;
revoke all on function public.assistant_memory_save_turn(uuid, uuid, text, text, timestamptz) from public, anon, service_role;
revoke all on function public.assistant_memory_enable_and_import_thread(uuid, text, text, uuid, jsonb) from public, anon, service_role;
revoke all on function public.assistant_memory_delete_thread(uuid) from public, anon, service_role;
revoke all on function public.assistant_memory_delete_all() from public, anon, service_role;

grant execute on function public.assistant_memory_set_opt_in(boolean) to authenticated;
grant execute on function public.assistant_memory_import_thread(uuid, text, text, uuid, jsonb) to authenticated;
grant execute on function public.assistant_memory_save_turn(uuid, uuid, text, text, timestamptz) to authenticated;
grant execute on function public.assistant_memory_enable_and_import_thread(uuid, text, text, uuid, jsonb) to authenticated;
grant execute on function public.assistant_memory_delete_thread(uuid) to authenticated;
grant execute on function public.assistant_memory_delete_all() to authenticated;
