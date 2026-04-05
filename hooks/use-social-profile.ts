import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { addOneQueryKeys } from "@/lib/addone-query-keys";
import {
  fetchProfile,
  isUsernameConflictError,
  removeProfileAvatar,
  saveProfile as saveCloudProfile,
  uploadProfileAvatar,
  UsernameConflictError,
} from "@/lib/supabase/addone-repository";
import { SocialProfile, SocialProfileUpdateInput } from "@/types/addone";

const DEMO_PROFILE_USER_ID = "demo-user";
const DEMO_RESERVED_USERNAMES = new Set(["addone", "friend", "friends", "taken"]);

let demoProfileState: SocialProfile = {
  avatarUrl: null,
  displayName: "AddOne User",
  firstName: null,
  lastName: null,
  updatedAt: new Date().toISOString(),
  userId: DEMO_PROFILE_USER_ID,
  username: null,
};

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeOptionalText(value?: string | null) {
  const normalized = value?.trim();
  return normalized ? normalized : null;
}

function normalizeUsername(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function buildFallbackProfile(params: { userId: string }): SocialProfile {
  return {
    avatarUrl: null,
    displayName: "AddOne User",
    firstName: null,
    lastName: null,
    updatedAt: null,
    userId: params.userId,
    username: null,
  };
}

function mapProfileToSocialProfile(
  profile: Awaited<ReturnType<typeof fetchProfile>>,
  fallback: SocialProfile,
): SocialProfile {
  if (!profile) {
    return fallback;
  }

  return {
    avatarUrl: profile.avatar_url,
    displayName: profile.display_name,
    firstName: profile.first_name,
    lastName: profile.last_name,
    updatedAt: profile.updated_at,
    userId: profile.user_id,
    username: profile.username,
  };
}

async function fetchDemoProfile() {
  await delay(120);
  return { ...demoProfileState };
}

async function saveDemoProfile(input: SocialProfileUpdateInput) {
  await delay(180);

  const nextUsername = normalizeUsername(input.username);
  const firstName = normalizeOptionalText(input.firstName);
  const lastName = normalizeOptionalText(input.lastName);
  if (!nextUsername) {
    throw new Error("Username is required.");
  }
  if (!firstName || !lastName) {
    throw new Error("First and last name are required.");
  }

  if (DEMO_RESERVED_USERNAMES.has(nextUsername) && nextUsername !== demoProfileState.username) {
    throw new UsernameConflictError();
  }

  demoProfileState = {
    avatarUrl: input.clearAvatar ? null : input.avatarAsset?.uri ?? demoProfileState.avatarUrl,
    displayName: `${firstName} ${lastName}`,
    firstName,
    lastName,
    updatedAt: new Date().toISOString(),
    userId: DEMO_PROFILE_USER_ID,
    username: nextUsername,
  };

  return { ...demoProfileState };
}

export function hasCompletedSocialProfile(
  profile: Pick<SocialProfile, "displayName" | "firstName" | "lastName" | "username"> | null | undefined,
) {
  return Boolean(
    profile?.displayName.trim() &&
      profile?.firstName?.trim() &&
      profile?.lastName?.trim() &&
      profile?.username?.trim(),
  );
}

export function useSocialProfile() {
  const { isAuthenticated, mode, status, user } = useAuth();
  const queryClient = useQueryClient();
  const resolvedUserId = mode === "demo" ? DEMO_PROFILE_USER_ID : user?.id ?? null;
  const fallbackProfile = buildFallbackProfile({
    userId: resolvedUserId ?? DEMO_PROFILE_USER_ID,
  });

  const profileQuery = useQuery({
    enabled: isAuthenticated && !!resolvedUserId && (mode === "demo" || status === "signedIn"),
    queryFn: async () => {
      if (mode === "demo") {
        return fetchDemoProfile();
      }

      return mapProfileToSocialProfile(await fetchProfile(user!.id), fallbackProfile);
    },
    queryKey: addOneQueryKeys.profile(resolvedUserId),
  });

  const saveMutation = useMutation({
    mutationFn: async (input: SocialProfileUpdateInput) => {
      if (!resolvedUserId) {
        throw new Error("You need to sign in before editing your profile.");
      }

      if (mode === "demo") {
        return saveDemoProfile(input);
      }

      const firstName = input.firstName.trim();
      const lastName = input.lastName.trim();
      let avatarUrl = profileQuery.data?.avatarUrl ?? fallbackProfile.avatarUrl;

      if (input.clearAvatar) {
        await removeProfileAvatar(resolvedUserId);
        avatarUrl = null;
      } else if (input.avatarAsset) {
        avatarUrl = await uploadProfileAvatar({
          mimeType: input.avatarAsset.mimeType,
          uri: input.avatarAsset.uri,
          userId: resolvedUserId,
        });
      }

      return mapProfileToSocialProfile(
        await saveCloudProfile({
          profile: {
            avatarUrl,
            firstName,
            lastName,
            username: input.username,
          },
          userId: resolvedUserId,
        }),
        fallbackProfile,
      );
    },
    onSuccess: async (nextProfile) => {
      queryClient.setQueryData(addOneQueryKeys.profile(resolvedUserId), nextProfile);

      if (mode === "cloud" && user?.id) {
        await queryClient.invalidateQueries({ queryKey: addOneQueryKeys.devices(user.id) });
      }
    },
  });

  return {
    isComplete: hasCompletedSocialProfile(profileQuery.data ?? fallbackProfile),
    isLoading: profileQuery.isLoading,
    isSaving: saveMutation.isPending,
    profile: profileQuery.data ?? fallbackProfile,
    saveError: saveMutation.error,
    saveProfile: saveMutation.mutateAsync,
    usernameConflict: isUsernameConflictError(saveMutation.error),
  };
}
