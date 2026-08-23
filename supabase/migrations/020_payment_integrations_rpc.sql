-- Payment integrations: secure RPC access (API secrets stay server-side)

create or replace function public.upsert_payment_integration(
  p_workspace_id uuid,
  p_provider text,
  p_account_mode text,
  p_publishable_key text,
  p_secret_key text,
  p_webhook_secret text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'finance', 'manage')
  ) then
    raise exception 'Forbidden';
  end if;

  insert into public.payment_integrations (
    workspace_id, provider, account_mode, publishable_key, secret_key, webhook_secret,
    connected_at, last_sync_status, last_sync_error, webhook_status, webhook_last_error, updated_at
  )
  values (
    p_workspace_id, p_provider, p_account_mode, p_publishable_key, p_secret_key, p_webhook_secret,
    now(), 'idle', null, 'unknown', null, now()
  )
  on conflict (workspace_id, provider) do update set
    account_mode = excluded.account_mode,
    publishable_key = excluded.publishable_key,
    secret_key = excluded.secret_key,
    webhook_secret = coalesce(nullif(excluded.webhook_secret, ''), payment_integrations.webhook_secret),
    connected_at = now(),
    last_sync_status = 'idle',
    last_sync_error = null,
    updated_at = now();
end;
$$;

create or replace function public.get_payment_integration_status(p_workspace_id uuid)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.payment_integrations%rowtype;
  stripe json;
  razorpay json;
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'finance', 'view')
  ) then
    raise exception 'Forbidden';
  end if;

  select * into row from public.payment_integrations where workspace_id = p_workspace_id and provider = 'stripe';
  if found then
    stripe := json_build_object(
      'connected', true,
      'accountMode', row.account_mode,
      'publishableKey', row.publishable_key,
      'connectedAt', row.connected_at,
      'lastSyncAt', row.last_sync_at,
      'lastSyncStatus', row.last_sync_status,
      'lastSyncError', row.last_sync_error,
      'lastWebhookAt', row.last_webhook_at,
      'webhookStatus', row.webhook_status,
      'webhookLastError', row.webhook_last_error
    );
  else
    stripe := json_build_object('connected', false);
  end if;

  select * into row from public.payment_integrations where workspace_id = p_workspace_id and provider = 'razorpay';
  if found then
    razorpay := json_build_object(
      'connected', true,
      'accountMode', row.account_mode,
      'publishableKey', row.publishable_key,
      'connectedAt', row.connected_at,
      'lastSyncAt', row.last_sync_at,
      'lastSyncStatus', row.last_sync_status,
      'lastSyncError', row.last_sync_error,
      'lastWebhookAt', row.last_webhook_at,
      'webhookStatus', row.webhook_status,
      'webhookLastError', row.webhook_last_error
    );
  else
    razorpay := json_build_object('connected', false);
  end if;

  return json_build_object('stripe', stripe, 'razorpay', razorpay);
end;
$$;

create or replace function public.get_payment_integration_credentials(
  p_workspace_id uuid,
  p_provider text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  row public.payment_integrations%rowtype;
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'finance', 'edit')
  ) then
    raise exception 'Forbidden';
  end if;

  select * into row from public.payment_integrations
  where workspace_id = p_workspace_id and provider = p_provider;

  if not found then return null; end if;

  return json_build_object(
    'id', row.id,
    'workspace_id', row.workspace_id,
    'provider', row.provider,
    'account_mode', row.account_mode,
    'publishable_key', row.publishable_key,
    'secret_key', row.secret_key,
    'webhook_secret', row.webhook_secret,
    'connected_at', row.connected_at,
    'last_sync_at', row.last_sync_at,
    'last_sync_status', row.last_sync_status,
    'last_sync_error', row.last_sync_error,
    'last_webhook_at', row.last_webhook_at,
    'webhook_status', row.webhook_status,
    'webhook_last_error', row.webhook_last_error
  );
end;
$$;

create or replace function public.delete_payment_integration(
  p_workspace_id uuid,
  p_provider text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'finance', 'manage')
  ) then
    raise exception 'Forbidden';
  end if;

  delete from public.payment_integrations
  where workspace_id = p_workspace_id and provider = p_provider;
end;
$$;

create or replace function public.update_payment_integration_sync_state(
  p_workspace_id uuid,
  p_provider text,
  p_last_sync_status text default null,
  p_last_sync_at timestamptz default null,
  p_last_sync_error text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (
    public.is_workspace_owner(p_workspace_id)
    or public.current_user_can(p_workspace_id, 'finance', 'edit')
  ) then
    raise exception 'Forbidden';
  end if;

  update public.payment_integrations
  set
    last_sync_status = coalesce(p_last_sync_status, last_sync_status),
    last_sync_at = coalesce(p_last_sync_at, last_sync_at),
    last_sync_error = p_last_sync_error,
    updated_at = now()
  where workspace_id = p_workspace_id and provider = p_provider;
end;
$$;

create or replace function public.update_payment_integration_webhook_state(
  p_workspace_id uuid,
  p_provider text,
  p_webhook_status text default null,
  p_webhook_last_error text default null,
  p_last_webhook_at timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payment_integrations
  set
    webhook_status = coalesce(p_webhook_status, webhook_status),
    webhook_last_error = p_webhook_last_error,
    last_webhook_at = coalesce(p_last_webhook_at, last_webhook_at),
    updated_at = now()
  where workspace_id = p_workspace_id and provider = p_provider;
end;
$$;

create or replace function public.record_finance_webhook_event(
  p_workspace_id uuid,
  p_provider text,
  p_event_id text,
  p_event_type text,
  p_payload jsonb default '{}'
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted integer;
begin
  insert into public.finance_webhook_events (workspace_id, provider, event_id, event_type, payload)
  values (p_workspace_id, p_provider, p_event_id, p_event_type, p_payload)
  on conflict (workspace_id, provider, event_id) do nothing;

  get diagnostics v_inserted = row_count;
  return v_inserted > 0;
end;
$$;

grant execute on function public.upsert_payment_integration(uuid, text, text, text, text, text) to authenticated;
grant execute on function public.get_payment_integration_status(uuid) to authenticated;
grant execute on function public.get_payment_integration_credentials(uuid, text) to authenticated;
grant execute on function public.delete_payment_integration(uuid, text) to authenticated;
grant execute on function public.update_payment_integration_sync_state(uuid, text, text, timestamptz, text) to authenticated;
grant execute on function public.update_payment_integration_webhook_state(uuid, text, text, text, timestamptz) to authenticated;
grant execute on function public.record_finance_webhook_event(uuid, text, text, text, jsonb) to authenticated;
