import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PropsWithChildren, useState } from "react";

import { CloudRealtimeProvider } from "@/providers/cloud-realtime-provider";
import { AuthProvider } from "@/providers/auth-provider";

export function AppProviders({ children }: PropsWithChildren) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CloudRealtimeProvider>{children}</CloudRealtimeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
