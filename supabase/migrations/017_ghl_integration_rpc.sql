-- GHL integration: secure RPC access without service-role key (PIT stays server-side)

create or replace function public.upsert_ghl_integration(
  p_workspace_id uuid,
  p_location_id text,
  p_location_name text,
  p_pipeline_id text,
  p_pit_token text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'crm', 'manage')
  ) then
    raise exception 'Forbidden';
  end if;

  insert into public.ghl_integrations (
    workspace_id,
    location_id,
    location_name,
    pipeline_id,
    pit_token,
    connected_at,
    last_sync_status,
    last_sync_error,
    updated_at
  )
  values (
    p_workspace_id,
    p_location_id,
    p_location_name,
    p_pipeline_id,
    p_pit_token,
    now(),
    'idle',
    null,
    now()
  )
  on conflict (workspace_id) do update set
    location_id = excluded.location_id,
    location_name = excluded.location_name,
    pipeline_id = excluded.pipeline_id,
    pit_token = excluded.pit_token,
    connected_at = now(),
    last_sync_status = 'idle',
    last_sync_error = null,
    updated_at = now();
end;
$$;

create or replace function public.get_ghl_integration_status(p_workspace_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.ghl_integrations%rowtype;
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'crm', 'view')
  ) then
    raise exception 'Forbidden';
  end if;

  select * into row from public.ghl_integrations where workspace_id = p_workspace_id;
  if not found then
    return json_build_object('connected', false);
  end if;

  return json_build_object(
    'connected', true,
    'locationId', row.location_id,
    'locationName', row.location_name,
    'pipelineId', row.pipeline_id,
    'connectedAt', row.connected_at,
    'lastSyncAt', row.last_sync_at,
    'lastSyncStatus', row.last_sync_status,
    'lastSyncError', row.last_sync_error
  );
end;
$$;

create or replace function public.get_ghl_integration_credentials(p_workspace_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.ghl_integrations%rowtype;
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'crm', 'edit')
  ) then
    raise exception 'Forbidden';
  end if;

  select * into row from public.ghl_integrations where workspace_id = p_workspace_id;
  if not found then
    return null;
  end if;

  return json_build_object(
    'id', row.id,
    'workspace_id', row.workspace_id,
    'location_id', row.location_id,
    'location_name', row.location_name,
    'pipeline_id', row.pipeline_id,
    'pit_token', row.pit_token,
    'connected_at', row.connected_at,
    'last_sync_at', row.last_sync_at,
    'last_sync_status', row.last_sync_status,
    'last_sync_error', row.last_sync_error
  );
end;
$$;

create or replace function public.delete_ghl_integration(p_workspace_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'crm', 'manage')
  ) then
    raise exception 'Forbidden';
  end if;

  delete from public.ghl_integrations where workspace_id = p_workspace_id;
end;
$$;

create or replace function public.update_ghl_integration_sync_state(
  p_workspace_id uuid,
  p_last_sync_status text default null,
  p_last_sync_at timestamptz default null,
  p_last_sync_error text default null,
  p_pipeline_id text default null,
  p_location_name text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'crm', 'edit')
  ) then
    raise exception 'Forbidden';
  end if;

  update public.ghl_integrations
  set
    last_sync_status = coalesce(p_last_sync_status, last_sync_status),
    last_sync_at = coalesce(p_last_sync_at, last_sync_at),
    last_sync_error = p_last_sync_error,
    pipeline_id = coalesce(p_pipeline_id, pipeline_id),
    location_name = coalesce(p_location_name, location_name),
    updated_at = now()
  where workspace_id = p_workspace_id;
end;
$$;

grant execute on function public.upsert_ghl_integration(uuid, text, text, text, text) to authenticated;
grant execute on function public.get_ghl_integration_status(uuid) to authenticated;
grant execute on function public.get_ghl_integration_credentials(uuid) to authenticated;
grant execute on function public.delete_ghl_integration(uuid) to authenticated;
grant execute on function public.update_ghl_integration_sync_state(uuid, text, timestamptz, text, text, text) to authenticated;
