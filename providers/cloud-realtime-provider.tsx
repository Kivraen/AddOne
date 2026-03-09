import { PropsWithChildren, useEffect, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { RealtimeChannel } from "@supabase/supabase-js";

import { useDevices, useSharedBoardsData } from "@/hooks/use-devices";
import { useAuth } from "@/hooks/use-auth";
import { addOneQueryKeys } from "@/lib/addone-query-keys";
import { getSupabaseClient } from "@/lib/supabase";

export function CloudRealtimeProvider({ children }: PropsWithChildren) {
  const { mode, status, user } = useAuth();
  const { devices } = useDevices();
  const { sharedBoards } = useSharedBoardsData();
  const queryClient = useQueryClient();

  const ownedDeviceIds = useMemo(() => devices.map((device) => device.id).sort(), [devices]);
  const sharedDeviceIds = useMemo(
    () => sharedBoards.map((board) => board.id).filter((id) => !ownedDeviceIds.includes(id)).sort(),
    [ownedDeviceIds, sharedBoards],
  );

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
      void queryClient.invalidateQueries({ queryKey: addOneQueryKeys.devices(user.id) });
    };
    const invalidateSharedBoards = () => {
      void queryClient.invalidateQueries({ queryKey: addOneQueryKeys.sharedBoards(user.id) });
    };
    const invalidateSharing = (deviceId: string) => {
      void queryClient.invalidateQueries({ queryKey: addOneQueryKeys.sharing(deviceId) });
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
        invalidateSharedBoards();
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
        }, () => {
          invalidateDevices();
          invalidateSharedBoards();
        })
        .on("postgres_changes", {
          event: "*",
          filter: `device_id=eq.${deviceId}`,
          schema: "public",
          table: "device_day_states",
        }, () => {
          invalidateDevices();
          invalidateSharedBoards();
        })
        .on("postgres_changes", {
          event: "*",
          filter: `device_id=eq.${deviceId}`,
          schema: "public",
          table: "device_commands",
        }, invalidateDevices)
        .on("postgres_changes", {
          event: "*",
          filter: `device_id=eq.${deviceId}`,
          schema: "public",
          table: "device_share_codes",
        }, () => {
          invalidateDevices();
          invalidateSharing(deviceId);
        })
        .on("postgres_changes", {
          event: "*",
          filter: `device_id=eq.${deviceId}`,
          schema: "public",
          table: "device_share_requests",
        }, () => {
          invalidateDevices();
          invalidateSharing(deviceId);
        })
        .subscribe();
      channels.push(channel);
    }

    for (const deviceId of sharedDeviceIds) {
      const channel = supabase
        .channel(`shared-device:${deviceId}`)
        .on("postgres_changes", {
          event: "*",
          filter: `id=eq.${deviceId}`,
          schema: "public",
          table: "devices",
        }, invalidateSharedBoards)
        .on("postgres_changes", {
          event: "*",
          filter: `device_id=eq.${deviceId}`,
          schema: "public",
          table: "device_day_states",
        }, invalidateSharedBoards)
        .subscribe();
      channels.push(channel);
    }

    return () => {
      for (const channel of channels) {
        void supabase.removeChannel(channel);
      }
    };
  }, [mode, ownedDeviceIds, queryClient, sharedDeviceIds, status, user?.id]);

  return children;
}
