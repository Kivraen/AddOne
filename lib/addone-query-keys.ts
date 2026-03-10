export const addOneQueryKeys = {
  activeOnboardingSession: (userId?: string) => ["addone", "active-onboarding-session", userId] as const,
  devices: (userId?: string) => ["addone", "devices", userId] as const,
  onboardingSession: (sessionId?: string | null) => ["addone", "onboarding-session", sessionId] as const,
};
