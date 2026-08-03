CREATE OR REPLACE FUNCTION public.upsert_dev_daily_activity(
  _user_id uuid,
  _squad_id uuid,
  _description text,
  _card_code text,
  _status text,
  _created_entry_id uuid,
  _closed_entry_id uuid,
  _completed_at timestamptz,
  _dev_notes text,
  _updated_by uuid
)
RETURNS public.dev_daily_activities
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  INSERT INTO public.dev_daily_activities (
    user_id, squad_id, description, card_code, status, created_entry_id,
    closed_entry_id, completed_at, dev_notes, updated_by
  ) VALUES (
    _user_id, _squad_id, _description, _card_code, _status, _created_entry_id,
    _closed_entry_id, _completed_at, _dev_notes, _updated_by
  )
  ON CONFLICT (
    user_id,
    COALESCE(squad_id, '00000000-0000-0000-0000-000000000000'::uuid),
    created_entry_id,
    lower(regexp_replace(trim(description), '\\s+', ' ', 'g')),
    status
  ) WHERE created_entry_id IS NOT NULL
  DO UPDATE SET
    card_code = EXCLUDED.card_code,
    closed_entry_id = COALESCE(EXCLUDED.closed_entry_id, dev_daily_activities.closed_entry_id),
    completed_at = COALESCE(EXCLUDED.completed_at, dev_daily_activities.completed_at),
    dev_notes = COALESCE(EXCLUDED.dev_notes, dev_daily_activities.dev_notes),
    updated_by = EXCLUDED.updated_by,
    updated_at = now()
  RETURNING dev_daily_activities.*;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_dev_daily_activity(uuid, uuid, text, text, text, uuid, uuid, timestamptz, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_dev_daily_activity(uuid, uuid, text, text, text, uuid, uuid, timestamptz, text, uuid) TO service_role;