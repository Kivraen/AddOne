export const addOneQueryKeys = {
  activeOnboardingSession: (userId?: string) => ["addone", "active-onboarding-session", userId] as const,
  deviceSharing: (deviceId?: string | null) => ["addone", "device-sharing", deviceId] as const,
  devices: (userId?: string) => ["addone", "devices", userId] as const,
  onboardingSession: (sessionId?: string | null) => ["addone", "onboarding-session", sessionId] as const,
  restoreCandidates: (deviceId?: string | null, userId?: string | null) =>
    ["addone", "restore-candidates", userId, deviceId] as const,
  profile: (userId?: string | null) => ["addone", "profile", userId] as const,
  sharedBoards: (userId?: string | null) => ["addone", "shared-boards", userId] as const,
};
