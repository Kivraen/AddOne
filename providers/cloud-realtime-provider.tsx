import { PropsWithChildren, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RealtimeChannel } from "@supabase/supabase-js";

import { useDevices } from "@/hooks/use-devices";
import { useAuth } from "@/hooks/use-auth";
import { addOneQueryKeys } from "@/lib/addone-query-keys";
import { getSupabaseClient } from "@/lib/supabase";

function isCancelledErrorLike(error: unknown) {
  if (error instanceof Error && error.name === "CancelledError") {
    return true;
  }

  if (typeof error === "object" && error !== null && "name" in error && (error as { name?: unknown }).name === "CancelledError") {
    return true;
  }

  return typeof error === "string" && error.includes("CancelledError");
}

function ignoreCancelledError(task: () => Promise<unknown>, label: string) {
  try {
    const promise = task();
    void promise.catch((error) => {
      if (isCancelledErrorLike(error)) {
        return;
      }

      console.warn(`[cloud-realtime] ${label} failed`, error);
    });
  } catch (error) {
    if (isCancelledErrorLike(error)) {
      return;
    }

    console.warn(`[cloud-realtime] ${label} failed`, error);
  }
}

export function CloudRealtimeProvider({ children }: PropsWithChildren) {
  const { mode, status, user } = useAuth();
  const { devices } = useDevices();
  const queryClient = useQueryClient();

  const ownedDeviceIds = useMemo(() => devices.map((device) => device.id).sort(), [devices]);

  useEffect(() => {
    if (mode !== "cloud" || status !== "signedIn" || !user?.id) {
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      return;
    }

    const channels: RealtimeChannel[] = [];

    const invalidateDevices = () => {
      ignoreCancelledError(
        () => queryClient.invalidateQueries({ queryKey: addOneQueryKeys.devices(user.id) }, { cancelRefetch: false }),
        "invalidate devices",
      );
    };

    const membershipChannel = supabase
      .channel(`device-memberships:${user.id}`)
      .on("postgres_changes", {
        event: "*",
        filter: `user_id=eq.${user.id}`,
        schema: "public",
        table: "device_memberships",
      }, () => {
        invalidateDevices();
      })
      .subscribe();
    channels.push(membershipChannel);

    for (const deviceId of ownedDeviceIds) {
      const channel = supabase
        .channel(`owned-device:${deviceId}`)
        .on("postgres_changes", {
          event: "*",
          filter: `id=eq.${deviceId}`,
          schema: "public",
          table: "devices",
        }, invalidateDevices)
        .on("postgres_changes", {
          event: "*",
          filter: `device_id=eq.${deviceId}`,
          schema: "public",
          table: "device_runtime_snapshots",
        }, invalidateDevices)
        .subscribe();
      channels.push(channel);
    }

    return () => {
      for (const channel of channels) {
        void supabase.removeChannel(channel);
      }
    };
  }, [mode, ownedDeviceIds, queryClient, status, user?.id]);

  return children;
}
