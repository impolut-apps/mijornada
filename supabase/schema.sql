-- ============================================================================
--  Esquema de la app de fichaje — ejecutar en Supabase (SQL Editor).
--  Idempotente: puedes volver a ejecutarlo entero.
--  Append-only + cadena de sellos por orden de inserción + RLS por usuario.
--  La hora real y los sellos los fija el SERVIDOR.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------- Tablas -----------------------------------------------------------

create table if not exists public.work_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  work_date        date not null,
  status           text not null default 'open' check (status in ('open','closed')),
  computed_minutes integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, work_date)
);

create table if not exists public.time_events (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  work_session_id   uuid not null references public.work_sessions(id) on delete cascade,
  type              text not null,
  occurred_at_utc   timestamptz not null,
  received_at_utc   timestamptz not null default now(),
  local_time        text not null,
  timezone          text not null,
  corrects_event_id uuid references public.time_events(id),
  source            text not null default 'app_ui',
  idempotency_key   text not null unique,
  seq               bigserial,
  prev_hash         text not null default '',
  hash              text not null,
  created_at        timestamptz not null default now()
);
alter table public.time_events add column if not exists seq bigserial;
create index if not exists idx_time_events_user    on public.time_events(user_id, seq);
create index if not exists idx_time_events_session on public.time_events(work_session_id);

alter table public.time_events drop constraint if exists time_events_type_check;
alter table public.time_events add  constraint time_events_type_check
  check (type in ('clock_in','clock_out','break_start','break_end','correction'));

create table if not exists public.audit_events (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null,
  ref_id     uuid,
  detail     jsonb not null default '{}'::jsonb,
  at_utc     timestamptz not null default now(),
  prev_hash  text not null default '',
  hash       text not null
);

create table if not exists public.profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role         text default 'Profesor de música',
  timezone     text,
  onboarded    boolean not null default false,
  updated_at   timestamptz not null default now()
);
alter table public.profiles add column if not exists onboarded boolean not null default false;

-- ---------- RLS --------------------------------------------------------------

alter table public.work_sessions enable row level security;
alter table public.time_events   enable row level security;
alter table public.audit_events  enable row level security;
alter table public.profiles      enable row level security;

drop policy if exists ws_select_own on public.work_sessions;
drop policy if exists te_select_own on public.time_events;
drop policy if exists ae_select_own on public.audit_events;
drop policy if exists pr_select_own on public.profiles;
drop policy if exists pr_insert_own on public.profiles;
drop policy if exists pr_update_own on public.profiles;

create policy ws_select_own on public.work_sessions for select using (auth.uid() = user_id);
create policy te_select_own on public.time_events   for select using (auth.uid() = user_id);
create policy ae_select_own on public.audit_events  for select using (auth.uid() = user_id);
create policy pr_select_own on public.profiles for select using (auth.uid() = user_id);
create policy pr_insert_own on public.profiles for insert with check (auth.uid() = user_id);
create policy pr_update_own on public.profiles for update using (auth.uid() = user_id);

-- ---------- Clases (espejo de SOLO LECTURA de las clases de la escuela) -------
-- Las clases las crea el administrador en la plataforma de la escuela. Nuestra
-- app NO las crea: la integración (service role) las vuelca aquí y el profesor
-- solo las LEE. Por eso solo hay política de SELECT para el usuario.

create table if not exists public.classes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  external_id  text,                 -- id de la clase en la escuela (para no duplicar)
  weekday      smallint not null check (weekday between 0 and 6), -- 0=domingo .. 6=sábado
  class_date   date,                 -- opcional, si la escuela da fecha concreta
  start_time   time not null,
  end_time     time not null,
  subject      text not null,
  classroom    text,
  students     text[] not null default '{}',
  synced_at    timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists idx_classes_user on public.classes(user_id, weekday, start_time);
create unique index if not exists uq_classes_ext on public.classes(user_id, external_id) where external_id is not null;

alter table public.classes enable row level security;
drop policy if exists cl_select_own on public.classes;
drop policy if exists cl_insert_own on public.classes;
drop policy if exists cl_update_own on public.classes;
drop policy if exists cl_delete_own on public.classes;
-- Solo lectura para el usuario; la integración escribe con service role (sin RLS).
create policy cl_select_own on public.classes for select using (auth.uid() = user_id);

-- ---------- Integración con la escuela: caché y estado (solo lectura app) -----
-- La Edge Function (service role) escribe aquí tras leer la plataforma; el
-- usuario solo LEE. Las credenciales de la escuela NO se guardan en la BD:
-- van en los secretos de la Edge Function.

create table if not exists public.platform_records (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  work_date  date not null,
  entrada    time,
  salida     time,
  horas      numeric,
  raw_hash   text,
  fetched_at timestamptz not null default now(),
  unique (user_id, work_date)
);
create index if not exists idx_platform_records_user on public.platform_records(user_id, work_date);

create table if not exists public.integration_state (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  connected    boolean not null default false,
  last_sync_at timestamptz,
  last_status  text,
  last_error   text,
  updated_at   timestamptz not null default now()
);

alter table public.platform_records  enable row level security;
alter table public.integration_state enable row level security;
drop policy if exists pr_rec_select_own on public.platform_records;
drop policy if exists int_state_select_own on public.integration_state;
create policy pr_rec_select_own   on public.platform_records  for select using (auth.uid() = user_id);
create policy int_state_select_own on public.integration_state for select using (auth.uid() = user_id);
-- escrituras solo vía service role (Edge Function), sin políticas para el usuario.

-- ---------- Sello canónico (independiente de la zona de la sesión) -----------

create or replace function public.canon_stamp(p_prev text, p_type text, p_ts timestamptz, p_session uuid, p_user uuid)
returns text language sql immutable set search_path = public, extensions as $$
  select encode(digest(
    coalesce(p_prev,'') || '|' || p_type || '|' ||
    to_char(p_ts at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US') || '|' ||
    p_session::text || '|' || p_user::text, 'sha256'), 'hex');
$$;

-- ---------- Insertar un evento encadenado (helper interno) -------------------

create or replace function public._insert_event(
  p_user uuid, p_session uuid, p_type text, p_ts timestamptz,
  p_local text, p_tz text, p_source text
) returns public.time_events
language plpgsql security definer set search_path = public, extensions as $$
declare v_prev text; v_hash text; v_event public.time_events;
begin
  select hash into v_prev from public.time_events
  where user_id = p_user order by seq desc limit 1;
  v_prev := coalesce(v_prev, '');
  v_hash := public.canon_stamp(v_prev, p_type, p_ts, p_session, p_user);

  insert into public.time_events(
    user_id, work_session_id, type, occurred_at_utc, received_at_utc,
    local_time, timezone, source, idempotency_key, prev_hash, hash)
  values (
    p_user, p_session, p_type, p_ts, p_ts, p_local, p_tz, p_source,
    p_user::text || ':' || clock_timestamp()::text || ':' || p_type || ':' || p_ts::text,
    v_prev, v_hash)
  returning * into v_event;

  insert into public.audit_events(user_id, kind, ref_id, detail, prev_hash, hash)
  values (p_user, 'event_created', v_event.id,
          jsonb_build_object('type', p_type, 'session', p_session, 'source', p_source), v_prev, v_hash);
  return v_event;
end; $$;

-- ---------- Recalcular minutos y estado de una jornada -----------------------

create or replace function public._recompute_session(p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_state text := 'idle'; v_seg timestamptz; v_min numeric := 0; r record;
begin
  for r in select type, received_at_utc from public.time_events
           where work_session_id = p_session order by seq loop
    if    r.type='clock_in'    and v_state='idle'    then v_state:='working'; v_seg:=r.received_at_utc;
    elsif r.type='break_start' and v_state='working' then v_min := v_min + extract(epoch from (r.received_at_utc - v_seg))/60; v_state:='onbreak';
    elsif r.type='break_end'   and v_state='onbreak' then v_state:='working'; v_seg:=r.received_at_utc;
    elsif r.type='clock_out'   and v_state in ('working','onbreak') then
      if v_state='working' then v_min := v_min + extract(epoch from (r.received_at_utc - v_seg))/60; end if;
      v_state:='idle';
    end if;
  end loop;
  update public.work_sessions
    set computed_minutes = round(v_min),
        status = case when v_state='idle' then 'closed' else 'open' end,
        updated_at = now()
  where id = p_session;
end; $$;

-- ---------- RPC: fichar (entrada/salida/pausa) en vivo -----------------------

create or replace function public.record_time_event(
  p_type text, p_occurred_at timestamptz, p_timezone text
) returns public.time_events
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user uuid := auth.uid(); v_now timestamptz := now();
  v_date date; v_local text; v_session public.work_sessions; v_state text := 'idle';
  v_event public.time_events; r record;
begin
  if v_user is null then raise exception 'No autenticado'; end if;
  if p_type not in ('clock_in','clock_out','break_start','break_end') then
    raise exception 'Acción no válida'; end if;

  v_date  := (v_now at time zone p_timezone)::date;
  v_local := to_char(v_now at time zone p_timezone, 'HH24:MI:SS');

  insert into public.work_sessions(user_id, work_date) values (v_user, v_date)
  on conflict (user_id, work_date) do update set updated_at = v_now
  returning * into v_session;

  for r in select type from public.time_events where work_session_id = v_session.id order by seq loop
    if    r.type='clock_in'    and v_state='idle'    then v_state:='working';
    elsif r.type='break_start' and v_state='working' then v_state:='onbreak';
    elsif r.type='break_end'   and v_state='onbreak' then v_state:='working';
    elsif r.type='clock_out'   and v_state in ('working','onbreak') then v_state:='idle';
    end if;
  end loop;

  if    p_type='clock_in'    and v_state<>'idle'    then raise exception 'Ya tienes una jornada empezada';
  elsif p_type='clock_out'   and v_state='idle'     then raise exception 'No tienes ninguna jornada abierta';
  elsif p_type='break_start' and v_state<>'working' then raise exception 'Solo puedes descansar mientras trabajas';
  elsif p_type='break_end'   and v_state<>'onbreak' then raise exception 'No tienes un descanso activo';
  end if;

  v_event := public._insert_event(v_user, v_session.id, p_type, v_now, v_local, p_timezone, 'app_ui');
  perform public._recompute_session(v_session.id);
  return v_event;
end; $$;

-- ---------- RPC: añadir/corregir un día manualmente --------------------------

create or replace function public.add_manual_day(
  p_day date, p_start time, p_end time, p_timezone text
) returns public.work_sessions
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user uuid := auth.uid(); v_session public.work_sessions;
  v_start timestamptz; v_end timestamptz;
begin
  if v_user is null then raise exception 'No autenticado'; end if;
  if p_end <= p_start then raise exception 'La hora de salida debe ser posterior a la de entrada'; end if;
  if p_day > (now() at time zone p_timezone)::date then raise exception 'No puedes añadir un día futuro'; end if;

  v_start := ((p_day::timestamp + p_start) at time zone p_timezone);
  v_end   := ((p_day::timestamp + p_end)   at time zone p_timezone);

  insert into public.work_sessions(user_id, work_date) values (v_user, p_day)
  on conflict (user_id, work_date) do update set updated_at = now()
  returning * into v_session;

  perform public._insert_event(v_user, v_session.id, 'clock_in',  v_start,
    to_char(v_start at time zone p_timezone,'HH24:MI:SS'), p_timezone, 'manual');
  perform public._insert_event(v_user, v_session.id, 'clock_out', v_end,
    to_char(v_end   at time zone p_timezone,'HH24:MI:SS'), p_timezone, 'manual');

  perform public._recompute_session(v_session.id);
  select * into v_session from public.work_sessions where id = v_session.id;
  return v_session;
end; $$;

-- ---------- RPC: comprobar que nada se ha modificado -------------------------

create or replace function public.verify_integrity()
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_user uuid := auth.uid(); v_prev text := ''; v_ok boolean := true;
  v_checked int := 0; v_expected text; r record;
begin
  if v_user is null then raise exception 'No autenticado'; end if;
  for r in select * from public.time_events where user_id = v_user order by seq loop
    v_checked := v_checked + 1;
    v_expected := public.canon_stamp(v_prev, r.type, r.received_at_utc, r.work_session_id, v_user);
    if r.prev_hash <> v_prev or r.hash <> v_expected then v_ok := false; exit; end if;
    v_prev := r.hash;
  end loop;
  return jsonb_build_object('ok', v_ok, 'checked', v_checked);
end; $$;

create or replace function public.get_today_session(p_timezone text)
returns public.work_sessions language sql security definer set search_path = public as $$
  select * from public.work_sessions
  where user_id = auth.uid() and work_date = (now() at time zone p_timezone)::date limit 1;
$$;

-- ---------- Permisos ---------------------------------------------------------

revoke all on function public.record_time_event(text, timestamptz, text) from public;
revoke all on function public.add_manual_day(date, time, time, text) from public;
revoke all on function public.verify_integrity() from public;
revoke all on function public.get_today_session(text) from public;
grant execute on function public.record_time_event(text, timestamptz, text) to authenticated;
grant execute on function public.add_manual_day(date, time, time, text) to authenticated;
grant execute on function public.verify_integrity() to authenticated;
grant execute on function public.get_today_session(text) to authenticated;

-- ============================================================================
--  Nota: el sellado detecta cambios desde la app, pero quien tenga control
--  total de la base de datos podría alterar datos y sellos. Conviene exportar
--  copias firmadas a un sitio aparte. Nada es 100% infalsificable.
-- ============================================================================
