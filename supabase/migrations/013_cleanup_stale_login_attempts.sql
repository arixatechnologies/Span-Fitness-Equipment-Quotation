create or replace function public.register_login_failure(
  p_key_hash text,
  p_max_attempts integer,
  p_window_seconds integer,
  p_block_seconds integer
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  attempt public.login_attempts%rowtype;
  request_time timestamptz := clock_timestamp();
  next_count integer;
  next_window_started_at timestamptz;
  next_blocked_until timestamptz;
begin
  if
    p_key_hash is null
    or length(p_key_hash) < 32
    or p_max_attempts < 1
    or p_window_seconds < 1
    or p_block_seconds < 1
  then
    raise exception 'Invalid login rate limit parameters';
  end if;

  delete from public.login_attempts
  where updated_at < request_time - interval '2 days';

  insert into public.login_attempts (
    key_hash,
    attempt_count,
    window_started_at,
    updated_at
  )
  values (p_key_hash, 0, request_time, request_time)
  on conflict (key_hash) do nothing;

  select *
  into attempt
  from public.login_attempts
  where key_hash = p_key_hash
  for update;

  if attempt.blocked_until is not null and attempt.blocked_until > request_time then
    return attempt.blocked_until;
  end if;

  if attempt.window_started_at <= request_time - make_interval(secs => p_window_seconds) then
    next_count := 1;
    next_window_started_at := request_time;
  else
    next_count := attempt.attempt_count + 1;
    next_window_started_at := attempt.window_started_at;
  end if;

  next_blocked_until := case
    when next_count >= p_max_attempts
      then request_time + make_interval(secs => p_block_seconds)
    else null
  end;

  update public.login_attempts
  set
    attempt_count = next_count,
    window_started_at = next_window_started_at,
    blocked_until = next_blocked_until,
    updated_at = request_time
  where key_hash = p_key_hash;

  return next_blocked_until;
end;
$$;

revoke all on function public.register_login_failure(text, integer, integer, integer)
from public, anon, authenticated;

grant execute on function public.register_login_failure(text, integer, integer, integer)
to service_role;
