import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdmin(config) {
  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  });
}

export async function fetchQueuedCommandEnvelope(supabase, commandId) {
  const { data, error } = await supabase
    .from("device_commands")
    .select("id, kind, payload, request_key, requested_at, requested_by_user_id, device_id, device:devices!device_commands_device_id_fkey(hardware_uid)")
    .eq("id", commandId)
    .in("status", ["queued", "delivered"])
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.device?.hardware_uid) {
    return null;
  }

  return {
    deviceId: data.device_id,
    requestedByUserId: data.requested_by_user_id,
    hardwareUid: data.device.hardware_uid,
    message: {
      id: data.id,
      kind: data.kind,
      payload: data.payload ?? {},
      request_key: data.request_key,
      requested_at: data.requested_at,
      schema_version: 1,
    },
  };
}

export async function listQueuedCommandEnvelopes(supabase) {
  const { data, error } = await supabase
    .from("device_commands")
    .select("id, kind, payload, request_key, requested_at, device:devices!device_commands_device_id_fkey(hardware_uid)")
    .eq("status", "queued")
    .order("requested_at", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? [])
    .filter((row) => row?.device?.hardware_uid)
    .map((row) => ({
      hardwareUid: row.device.hardware_uid,
      message: {
        id: row.id,
        kind: row.kind,
        payload: row.payload ?? {},
        request_key: row.request_key,
        requested_at: row.requested_at,
        schema_version: 1,
      },
    }));
}
