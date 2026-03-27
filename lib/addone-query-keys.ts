export const addOneQueryKeys = {
  activeOnboardingSession: (userId?: string) => ["addone", "active-onboarding-session", userId] as const,
  ownerSharing: (deviceId?: string | null) => ["addone", "owner-sharing", deviceId] as const,
  deviceSharing: (deviceId?: string | null) => ["addone", "owner-sharing", deviceId] as const,
  deviceFirmwareUpdate: (deviceId?: string | null, proofState?: string | null) =>
    ["addone", "device-firmware-update", deviceId, proofState ?? null] as const,
  devices: (userId?: string) => ["addone", "devices", userId] as const,
  onboardingSession: (sessionId?: string | null) => ["addone", "onboarding-session", sessionId] as const,
  restoreCandidates: (deviceId?: string | null, userId?: string | null) =>
    ["addone", "restore-candidates", userId, deviceId] as const,
  profile: (userId?: string | null) => ["addone", "profile", userId] as const,
  viewerSharedBoards: (userId?: string | null) => ["addone", "viewer-shared-boards", userId] as const,
  sharedBoards: (userId?: string | null) => ["addone", "viewer-shared-boards", userId] as const,
};
