import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ReactNode, useEffect, useMemo, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ScreenScrollView, ScreenSection } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useIsMountedRef } from "@/hooks/use-is-mounted-ref";
import { useSocialProfile } from "@/hooks/use-social-profile";
import {
  triggerNavigationHaptic,
  triggerPrimaryActionFailureHaptic,
  triggerPrimaryActionSuccessHaptic,
} from "@/lib/haptics";
import { withAlpha } from "@/lib/color";
import {
  isProfileMigrationRequiredError,
  isUsernameConflictError,
} from "@/lib/supabase/addone-repository";
import { SocialProfile, SocialProfilePhotoAsset, SocialProfileUpdateInput } from "@/types/addone";

interface ProfileTabContentProps {
  bottomInset?: number;
}

interface ProfileDraft {
  firstName: string;
  lastName: string;
  username: string;
}

interface ProfileDraftErrors {
  firstName?: string;
  lastName?: string;
  username?: string;
}

function normalizeRouteParam(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function splitDisplayName(displayName: string) {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);

  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function buildDraft(profile: SocialProfile): ProfileDraft {
  const fallbackNames = splitDisplayName(profile.displayName);

  return {
    firstName: profile.firstName ?? fallbackNames.firstName,
    lastName: profile.lastName ?? fallbackNames.lastName,
    username: profile.username ?? "",
  };
}

function makeProfileSignature(profile: SocialProfile) {
  return [
    profile.userId,
    profile.updatedAt ?? "pending",
    profile.displayName,
    profile.username ?? "",
    profile.firstName ?? "",
    profile.lastName ?? "",
    profile.avatarUrl ?? "",
  ].join(":");
}

function buildInitials(firstName: string, lastName: string, fallback: string) {
  const candidate = `${firstName} ${lastName}`.trim() || fallback;

  const letters = candidate
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return letters || "A";
}

function validateDraft(draft: ProfileDraft): { errors: ProfileDraftErrors; payload?: SocialProfileUpdateInput } {
  const firstName = draft.firstName.trim();
  const lastName = draft.lastName.trim();
  const username = draft.username.trim().toLowerCase();
  const errors: ProfileDraftErrors = {};

  if (!firstName) {
    errors.firstName = "First name is required.";
  }

  if (!lastName) {
    errors.lastName = "Last name is required.";
  }

  if (!username) {
    errors.username = "Username is required.";
  } else if (!/^[a-z0-9_]{3,20}$/.test(username)) {
    errors.username = "Use 3-20 lowercase letters, numbers, or underscores.";
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    errors,
    payload: {
      firstName,
      lastName,
      username,
    },
  };
}

function FieldLabel({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.label.fontFamily,
        fontSize: theme.typography.label.fontSize,
        lineHeight: theme.typography.label.lineHeight,
      }}
    >
      {children}
    </Text>
  );
}

function HelperCopy({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "error" | "success" }) {
  return (
    <Text
      selectable
      style={{
        color:
          tone === "error"
            ? theme.colors.statusErrorMuted
            : tone === "success"
              ? theme.colors.accentAmber
              : theme.colors.textSecondary,
        fontFamily: theme.typography.body.fontFamily,
        fontSize: 14,
        lineHeight: 20,
      }}
    >
      {children}
    </Text>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: theme.colors.textPrimary,
        fontFamily: theme.typography.label.fontFamily,
        fontSize: 18,
        lineHeight: 22,
      }}
    >
      {children}
    </Text>
  );
}

function InlineFeedback({ message, tone }: { message: string; tone: "error" | "success" }) {
  return (
    <View
      style={{
        borderRadius: theme.radius.sheet,
        borderWidth: 1,
        borderColor:
          tone === "error"
            ? withAlpha(theme.colors.statusErrorMuted, 0.18)
            : withAlpha(theme.colors.accentAmber, 0.18),
        backgroundColor:
          tone === "error"
            ? withAlpha(theme.colors.statusErrorMuted, 0.08)
            : withAlpha(theme.colors.accentAmberSoft, 0.08),
        paddingHorizontal: 14,
        paddingVertical: 12,
      }}
    >
      <HelperCopy tone={tone}>{message}</HelperCopy>
    </View>
  );
}

function FormField(props: {
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  error?: string;
  label: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  textContentType?: "familyName" | "givenName" | "name" | "nickname" | "username";
  value: string;
}) {
  return (
    <View style={{ gap: 8 }}>
      <FieldLabel>{props.label}</FieldLabel>
      <TextInput
        autoCapitalize={props.autoCapitalize ?? "words"}
        autoCorrect={props.autoCorrect ?? false}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={theme.colors.textMuted}
        style={{
          borderRadius: 12,
          borderWidth: 1,
          borderColor: withAlpha(theme.colors.textPrimary, 0.08),
          backgroundColor: withAlpha(theme.colors.bgBase, 0.84),
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.body.fontFamily,
          fontSize: theme.typography.body.fontSize,
          lineHeight: theme.typography.body.lineHeight,
          paddingHorizontal: 16,
          paddingVertical: 16,
        }}
        textContentType={props.textContentType}
        value={props.value}
      />
      {props.error ? <HelperCopy tone="error">{props.error}</HelperCopy> : null}
    </View>
  );
}

function ActionButton(props: {
  disabled?: boolean;
  destructive?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  secondary?: boolean;
}) {
  const isDisabled = props.disabled || props.loading;
  const isSecondaryDestructive = props.secondary && props.destructive;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={props.onPress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        minHeight: 52,
        borderRadius: theme.radius.sheet,
        borderWidth: props.secondary ? 1 : 0,
        borderColor: props.secondary
          ? isSecondaryDestructive
            ? withAlpha(theme.colors.statusErrorMuted, 0.18)
            : withAlpha(theme.colors.textPrimary, 0.12)
          : "transparent",
        backgroundColor: props.secondary
          ? isSecondaryDestructive
            ? withAlpha(theme.colors.statusErrorMuted, 0.1)
            : withAlpha(theme.colors.bgElevated, 0.72)
          : isDisabled
            ? withAlpha(theme.colors.textPrimary, 0.12)
            : theme.colors.textPrimary,
        opacity: isDisabled ? 0.65 : 1,
        paddingHorizontal: 16,
      }}
    >
      {props.loading ? (
        <ActivityIndicator color={props.secondary ? theme.colors.textPrimary : theme.colors.textInverse} />
      ) : (
        <Text
          style={{
            color: props.secondary
              ? isSecondaryDestructive
                ? theme.colors.statusErrorMuted
                : theme.colors.textPrimary
              : theme.colors.textInverse,
            fontFamily: theme.typography.label.fontFamily,
            fontSize: 18,
            lineHeight: 22,
          }}
        >
          {props.label}
        </Text>
      )}
    </Pressable>
  );
}

function PhotoActionPill(props: {
  destructive?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={{
        alignItems: "center",
        flexDirection: "row",
        gap: 8,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: props.destructive
          ? withAlpha(theme.colors.statusErrorMuted, 0.24)
          : withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: props.destructive
          ? withAlpha(theme.colors.statusErrorMuted, 0.1)
          : withAlpha(theme.colors.bgElevated, 0.76),
        paddingHorizontal: 12,
        paddingVertical: 9,
      }}
    >
      <Ionicons
        color={props.destructive ? theme.colors.statusErrorMuted : theme.colors.textSecondary}
        name={props.icon}
        size={16}
      />
      <Text
        style={{
          color: props.destructive ? theme.colors.statusErrorMuted : theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: theme.typography.label.fontSize,
          lineHeight: theme.typography.label.lineHeight,
        }}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

function AvatarPreview(props: {
  fallbackDisplayName: string;
  firstName: string;
  lastName: string;
  size?: number;
  uri: string | null;
}) {
  const initials = buildInitials(props.firstName, props.lastName, props.fallbackDisplayName);
  const size = props.size ?? 86;
  const radius = Math.round(size * 0.28);

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: radius,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.textPrimary, 0.08),
      }}
    >
      {props.uri ? (
        <Image contentFit="cover" source={props.uri} style={{ width: "100%", height: "100%" }} />
      ) : (
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.title.fontFamily,
            fontSize: theme.typography.title.fontSize,
            lineHeight: theme.typography.title.lineHeight,
          }}
        >
          {initials}
        </Text>
      )}
    </View>
  );
}

export function ProfileTabContent({ bottomInset = theme.layout.tabScrollBottom }: ProfileTabContentProps) {
  const params = useLocalSearchParams<{ from?: string | string[] }>();
  const router = useRouter();
  const isMountedRef = useIsMountedRef();
  const { width } = useWindowDimensions();
  const { mode, signOut, userEmail } = useAuth();
  const { isComplete, isLoading, isSaving, profile, saveProfile } = useSocialProfile();
  const fromFriends = normalizeRouteParam(params.from) === "friends";
  const isNarrow = width < 430;

  const [draft, setDraft] = useState<ProfileDraft>(() => buildDraft(profile));
  const [fieldErrors, setFieldErrors] = useState<ProfileDraftErrors>({});
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingAvatar, setPendingAvatar] = useState<SocialProfilePhotoAsset | null>(null);
  const [clearAvatar, setClearAvatar] = useState(false);
  const [isPhotoMenuVisible, setIsPhotoMenuVisible] = useState(false);

  const profileSignature = makeProfileSignature(profile);

  useEffect(() => {
    setDraft(buildDraft(profile));
    setFieldErrors({});
    setFormError(null);
    setFormMessage(null);
    setPendingAvatar(null);
    setClearAvatar(false);
    setIsPhotoMenuVisible(false);
  }, [profileSignature]);

  const previewUsername = useMemo(
    () => draft.username.trim().toLowerCase() || (profile.username ?? ""),
    [draft.username, profile.username],
  );
  const previewAvatarUri = pendingAvatar?.uri ?? (clearAvatar ? null : profile.avatarUrl);
  const gateMode = fromFriends && !isComplete;
  const introCopy = gateMode ? "Name and handle are required before Friends opens." : null;
  const previewName = useMemo(() => {
    const value = `${draft.firstName.trim()} ${draft.lastName.trim()}`.trim();
    if (value) {
      return value;
    }

    return isComplete ? profile.displayName : "Your name";
  }, [draft.firstName, draft.lastName, isComplete, profile.displayName]);
  const avatarFallbackDisplayName = isComplete ? profile.displayName : "AddOne";
  const previewEmail = mode === "cloud" ? userEmail?.trim() || "you@example.com" : "you@example.com";
  const isPreviewNamePlaceholder = previewName === "Your name";
  const isPreviewUsernamePlaceholder = !previewUsername;
  const isPreviewEmailPlaceholder = !userEmail?.trim();
  const baselineDraft = useMemo(() => buildDraft(profile), [profileSignature]);
  const hasDraftChanges = useMemo(() => {
    return (
      draft.firstName.trim() !== baselineDraft.firstName.trim() ||
      draft.lastName.trim() !== baselineDraft.lastName.trim() ||
      draft.username.trim().toLowerCase() !== baselineDraft.username.trim().toLowerCase()
    );
  }, [baselineDraft.firstName, baselineDraft.lastName, baselineDraft.username, draft.firstName, draft.lastName, draft.username]);
  const hasAvatarChanges = Boolean(pendingAvatar) || (clearAvatar && Boolean(profile.avatarUrl));
  const hasUnsavedChanges = hasDraftChanges || hasAvatarChanges;

  async function chooseFromLibrary() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!isMountedRef.current) {
      return;
    }

    setIsPhotoMenuVisible(false);

    if (!permission.granted) {
      triggerPrimaryActionFailureHaptic();
      setFormError("Allow photo access to choose a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      mediaTypes: ["images"],
      quality: 0.85,
    });

    if (!isMountedRef.current || result.canceled || !result.assets[0]) {
      return;
    }

    if (result.assets[0]) {
      setPendingAvatar({
        mimeType: result.assets[0].mimeType,
        uri: result.assets[0].uri,
      });
      setClearAvatar(false);
      setFormError(null);
      setFormMessage("Photo ready to save.");
    }
  }

  async function takePhoto() {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!isMountedRef.current) {
      return;
    }

    setIsPhotoMenuVisible(false);

    if (!permission.granted) {
      triggerPrimaryActionFailureHaptic();
      setFormError("Allow camera access to take a profile picture.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      cameraType: ImagePicker.CameraType.front,
      mediaTypes: ["images"],
      quality: 0.85,
    });

    if (!isMountedRef.current || result.canceled || !result.assets[0]) {
      return;
    }

    if (result.assets[0]) {
      setPendingAvatar({
        mimeType: result.assets[0].mimeType,
        uri: result.assets[0].uri,
      });
      setClearAvatar(false);
      setFormError(null);
      setFormMessage("Photo ready to save.");
    }
  }

  function removePhoto() {
    setPendingAvatar(null);
    setClearAvatar(true);
    setIsPhotoMenuVisible(false);
    setFormError(null);
    setFormMessage("Photo will be removed when you save.");
  }

  function openPhotoActions() {
    triggerNavigationHaptic();

    if (process.env.EXPO_OS === "ios") {
      const options = previewAvatarUri
        ? ["Choose from library", "Take photo", "Remove photo", "Cancel"]
        : ["Choose from library", "Take photo", "Cancel"];
      const cancelButtonIndex = options.length - 1;
      const destructiveButtonIndex = previewAvatarUri ? 2 : undefined;

      ActionSheetIOS.showActionSheetWithOptions(
        {
          cancelButtonIndex,
          destructiveButtonIndex,
          options,
          userInterfaceStyle: "dark",
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            void chooseFromLibrary();
            return;
          }

          if (buttonIndex === 1) {
            void takePhoto();
            return;
          }

          if (previewAvatarUri && buttonIndex === 2) {
            removePhoto();
          }
        },
      );

      return;
    }

    setIsPhotoMenuVisible((current) => !current);
  }

  async function handleSave() {
    const { errors, payload } = validateDraft(draft);
    setFieldErrors(errors);
    setFormError(null);
    setFormMessage(null);

    if (!payload) {
      triggerPrimaryActionFailureHaptic();
      return;
    }

    try {
      const savedProfile = await saveProfile({
        ...payload,
        avatarAsset: pendingAvatar,
        clearAvatar,
      });

      triggerPrimaryActionSuccessHaptic();
      if (!isMountedRef.current) {
        return;
      }

      setDraft(buildDraft(savedProfile));
      setPendingAvatar(null);
      setClearAvatar(false);
      setFormMessage(fromFriends ? "Profile ready. Opening Friends…" : "Profile updated.");

      if (fromFriends) {
        router.push("/friends");
      }
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      if (!isMountedRef.current) {
        return;
      }

      setFormError(
        isProfileMigrationRequiredError(error)
          ? "The beta backend still needs the latest profile migration. Apply the newest Supabase migration, then try again."
          : isUsernameConflictError(error)
            ? "That username is already in use. Choose a different handle."
            : error instanceof Error
              ? error.message
              : "We couldn't save your profile.",
      );
    }
  }

  return (
    <ScreenScrollView bottomInset={bottomInset}>
      <ScreenSection style={{ gap: 16 }}>
        <View style={{ gap: gateMode ? 4 : 0, paddingHorizontal: 4 }}>
          <SectionTitle>Profile</SectionTitle>
          {gateMode ? <HelperCopy>{introCopy}</HelperCopy> : null}
        </View>

        <GlassCard style={{ gap: 14, paddingHorizontal: 18, paddingVertical: 18 }}>
          <View
            style={{
              alignItems: "center",
              flexDirection: "row",
              gap: 14,
            }}
          >
            <View>
              <View style={{ position: "relative" }}>
                <AvatarPreview
                  fallbackDisplayName={avatarFallbackDisplayName}
                  firstName={draft.firstName}
                  lastName={draft.lastName}
                  size={72}
                  uri={previewAvatarUri}
                />
                <Pressable
                  onPress={openPhotoActions}
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    position: "absolute",
                    right: -4,
                    bottom: -4,
                    width: 34,
                    height: 34,
                    borderRadius: 17,
                    borderWidth: 1,
                    borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                    backgroundColor: withAlpha(theme.colors.bgElevated, 0.95),
                  }}
                >
                  <Ionicons color={theme.colors.textPrimary} name="camera-outline" size={16} />
                </Pressable>
              </View>
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text
                selectable
                style={{
                  color: isPreviewNamePlaceholder ? theme.colors.textSecondary : theme.colors.textPrimary,
                  fontFamily: theme.typography.title.fontFamily,
                  fontSize: 22,
                  lineHeight: 26,
                }}
              >
                {previewName}
              </Text>
              <Text
                selectable
                style={{
                  color: isPreviewUsernamePlaceholder ? theme.colors.textSecondary : theme.colors.accentAmber,
                  fontFamily: theme.typography.label.fontFamily,
                  fontSize: theme.typography.label.fontSize,
                  lineHeight: theme.typography.label.lineHeight,
                }}
              >
                {previewUsername ? `@${previewUsername}` : "@username"}
              </Text>
              <View style={{ paddingTop: 2 }}>
                <Text
                  selectable
                  style={{
                    color: isPreviewEmailPlaceholder ? theme.colors.textMuted : theme.colors.textSecondary,
                    fontFamily: theme.typography.body.fontFamily,
                    fontSize: 13,
                    lineHeight: 18,
                    flexShrink: 1,
                  }}
                >
                  {previewEmail}
                </Text>
              </View>
            </View>
          </View>

          {isPhotoMenuVisible ? (
            <>
              <View style={{ height: 1, backgroundColor: withAlpha(theme.colors.textPrimary, 0.06) }} />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                <PhotoActionPill icon="images-outline" label="Library" onPress={() => void chooseFromLibrary()} />
                <PhotoActionPill icon="camera-outline" label="Camera" onPress={() => void takePhoto()} />
                {previewAvatarUri ? <PhotoActionPill destructive icon="trash-outline" label="Remove" onPress={removePhoto} /> : null}
              </View>
            </>
          ) : null}
        </GlassCard>

        {formError ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
            <InlineFeedback message={formError} tone="error" />
          </Animated.View>
        ) : null}

        {formMessage ? (
          <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
            <InlineFeedback message={formMessage} tone="success" />
          </Animated.View>
        ) : null}

        {isLoading ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4, paddingVertical: 4 }}>
            <ActivityIndicator color={theme.colors.accentAmber} />
            <HelperCopy>Loading profile…</HelperCopy>
          </View>
        ) : (
          <>
            <GlassCard style={{ gap: 14, paddingHorizontal: 18, paddingVertical: 18 }}>
              <View style={{ flexDirection: isNarrow ? "column" : "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <FormField
                    error={fieldErrors.firstName}
                    label="First name"
                    onChangeText={(value) => {
                      setDraft((current) => ({ ...current, firstName: value }));
                      setFieldErrors((current) => ({ ...current, firstName: undefined }));
                      setFormError(null);
                      setFormMessage(null);
                    }}
                    placeholder="First name"
                    textContentType="givenName"
                    value={draft.firstName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <FormField
                    error={fieldErrors.lastName}
                    label="Last name"
                    onChangeText={(value) => {
                      setDraft((current) => ({ ...current, lastName: value }));
                      setFieldErrors((current) => ({ ...current, lastName: undefined }));
                      setFormError(null);
                      setFormMessage(null);
                    }}
                    placeholder="Last name"
                    textContentType="familyName"
                    value={draft.lastName}
                  />
                </View>
              </View>

              <View style={{ gap: 8 }}>
                <FieldLabel>Username</FieldLabel>
                <View
                  style={{
                    alignItems: "center",
                    flexDirection: "row",
                    gap: 10,
                  }}
                >
                  <View
                    style={{
                      alignItems: "center",
                      justifyContent: "center",
                      width: 18,
                      minHeight: 56,
                    }}
                  >
                    <Text
                      style={{
                        color: theme.colors.textSecondary,
                        fontFamily: theme.typography.body.fontFamily,
                        fontSize: 15,
                        lineHeight: 18,
                      }}
                    >
                      @
                    </Text>
                  </View>

                  <TextInput
                    autoCapitalize="none"
                    autoCorrect={false}
                    onChangeText={(value) => {
                      setDraft((current) => ({
                        ...current,
                        username: value.replace(/\s+/g, "").toLowerCase(),
                      }));
                      setFieldErrors((current) => ({ ...current, username: undefined }));
                      setFormError(null);
                      setFormMessage(null);
                    }}
                    placeholder="username"
                    placeholderTextColor={theme.colors.textMuted}
                    style={{
                      backgroundColor: withAlpha(theme.colors.bgBase, 0.84),
                      borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                      borderRadius: 12,
                      borderWidth: 1,
                      color: theme.colors.textPrimary,
                      flex: 1,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                      paddingHorizontal: 16,
                      paddingVertical: 16,
                    }}
                    textContentType="username"
                    value={draft.username}
                  />
                </View>

                {fieldErrors.username ? <HelperCopy tone="error">{fieldErrors.username}</HelperCopy> : null}
                {!fieldErrors.username ? <HelperCopy>Lowercase only. Stable handle for Friends.</HelperCopy> : null}
              </View>
            </GlassCard>

            <View style={{ gap: 12, paddingTop: 2 }}>
              <View style={{ flexDirection: "row", gap: 12 }}>
                {mode === "cloud" ? (
                  <View style={{ flex: 1 }}>
                    <ActionButton
                      disabled={isSaving}
                      destructive
                      label="Sign out"
                      onPress={() => {
                        void signOut().then(() => {
                          router.replace("/sign-in");
                        });
                      }}
                      secondary
                    />
                  </View>
                ) : null}

                <View style={{ flex: 1 }}>
                  <ActionButton
                    disabled={!hasUnsavedChanges || isLoading}
                    label={isSaving ? "Saving…" : "Save"}
                    loading={isSaving}
                    onPress={() => void handleSave()}
                  />
                </View>
              </View>
            </View>
          </>
        )}
      </ScreenSection>
    </ScreenScrollView>
  );
}
