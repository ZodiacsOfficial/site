-- Serialize remembered-turn retries before their duplicate check.
--
-- The storage-cap trigger already locks before a physical INSERT, but two
-- simultaneous retries could both miss the RPC's earlier duplicate lookup.
-- Taking the same per-owner transaction lock here makes the second retry see
-- the completed first save and return the stable `duplicate` outcome.

create or replace function public.assistant_memory_save_turn(
  p_thread_id uuid,
  p_turn_id uuid,
  p_question text,
  p_answer text,
  p_completed_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  owner_id uuid := (select auth.uid());
  existing_question text;
  existing_answer text;
begin
  if owner_id is null
     or p_thread_id is null
     or p_turn_id is null
     or p_question is null
     or char_length(btrim(p_question)) not between 1 and 1200
     or p_answer is null
     or char_length(btrim(p_answer)) not between 1 and 16000
     or p_completed_at is null
     or p_completed_at < statement_timestamp() - interval '90 days'
     or p_completed_at > statement_timestamp() + interval '5 minutes' then
    raise exception 'assistant_memory_save_turn: invalid request';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('ask-zodiacs-memory:' || owner_id::text, 0)
  );

  if not exists (
    select 1
    from public.assistant_threads
    where id = p_thread_id
      and user_id = owner_id
      and expires_at > statement_timestamp()
  ) then
    return jsonb_build_object('outcome', 'unavailable');
  end if;

  select question, answer
  into existing_question, existing_answer
  from public.assistant_turns
  where thread_id = p_thread_id
    and id = p_turn_id
    and user_id = owner_id;

  if found then
    if existing_question <> p_question or existing_answer <> p_answer then
      raise exception 'assistant_memory_save_turn: turn id conflict';
    end if;
    return jsonb_build_object('outcome', 'duplicate');
  end if;

  insert into public.assistant_turns (
    id, thread_id, user_id, question, answer, completed_at
  ) values (
    p_turn_id, p_thread_id, owner_id,
    p_question, p_answer, p_completed_at
  );

  return jsonb_build_object('outcome', 'saved');
end;
$$;

revoke all on function public.assistant_memory_save_turn(uuid, uuid, text, text, timestamptz)
  from public, anon, authenticated, service_role;
grant execute on function public.assistant_memory_save_turn(uuid, uuid, text, text, timestamptz)
  to authenticated;
