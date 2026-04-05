import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Platform, Pressable, Text, View } from "react-native";

import { FriendsRouteHeader } from "@/components/app/friends-route-header";
import { ScreenScrollView, ScreenSection } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useFriends } from "@/hooks/use-friends";
import { useIsMountedRef } from "@/hooks/use-is-mounted-ref";
import { withAlpha } from "@/lib/color";
import { shouldHoldFriendsEmptyState } from "@/lib/friends-state";
import { triggerPrimaryActionFailureHaptic, triggerPrimaryActionSuccessHaptic } from "@/lib/haptics";
import { DeviceShareRequest, DeviceViewer } from "@/types/addone";

const REQUEST_APPROVE_COLOR = "#B2F06D";
const REQUEST_REJECT_COLOR = "#E47A6D";

function AvatarChip(props: { avatarUrl?: string | null; label: string; size?: number }) {
  const size = props.size ?? 54;
  const initials = props.label
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "A";

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: theme.radius.full,
        backgroundColor: withAlpha(theme.colors.textPrimary, 0.08),
      }}
    >
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: Math.max(14, Math.round(size * 0.34)),
          lineHeight: Math.max(18, Math.round(size * 0.4)),
        }}
      >
        {initials}
      </Text>
    </View>
  );
}

function formatRelativeTimestamp(value: string | null | undefined) {
  if (!value) {
    return "No update";
  }

  const diffMs = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(diffMs)) {
    return "No update";
  }

  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));
  if (diffMinutes < 1) {
    return "Just now";
  }
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `${diffDays}d ago`;
}

function CompactIconAction(props: {
  backgroundAlpha?: number;
  borderAlpha?: number;
  color?: string;
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  iconSize?: number;
  iconTone?: string;
  loading?: boolean;
  onPress: () => void;
  shadowAlpha?: number;
}) {
  return (
    <Pressable
      disabled={props.disabled || props.loading}
      onPress={props.onPress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 38,
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor: withAlpha(props.color ?? theme.colors.textPrimary, props.borderAlpha ?? 0.18),
        backgroundColor: withAlpha(props.color ?? theme.colors.bgElevated, props.backgroundAlpha ?? 0.12),
        boxShadow: `0px 10px 24px ${withAlpha(props.color ?? theme.colors.bgBase, props.shadowAlpha ?? 0)}`,
        opacity: props.disabled ? 0.46 : 1,
      }}
    >
      {props.loading ? (
        <ActivityIndicator color={props.iconTone ?? props.color ?? theme.colors.textPrimary} />
      ) : (
        <Ionicons
          color={props.iconTone ?? props.color ?? theme.colors.textPrimary}
          name={props.icon}
          size={props.iconSize ?? 18}
        />
      )}
    </Pressable>
  );
}

function EmptyMessage(props: { body: string; title: string }) {
  return (
    <GlassCard style={{ gap: 6, paddingHorizontal: 14, paddingVertical: 14 }}>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: 15,
          lineHeight: 20,
        }}
      >
        {props.title}
      </Text>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.body.fontFamily,
          fontSize: theme.typography.body.fontSize,
          lineHeight: theme.typography.body.lineHeight,
        }}
      >
        {props.body}
      </Text>
    </GlassCard>
  );
}

function RequestItem(props: {
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  preview?: boolean;
  request: DeviceShareRequest;
}) {
  return (
    <GlassCard style={{ gap: 10, paddingHorizontal: 14, paddingVertical: 14, opacity: props.preview ? 0.9 : 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <AvatarChip avatarUrl={props.request.requesterAvatarUrl} label={props.request.requesterDisplayName} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: 16,
              lineHeight: 20,
            }}
          >
            {props.request.requesterDisplayName}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            Requested {formatRelativeTimestamp(props.request.createdAt)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <CompactIconAction
            backgroundAlpha={0.92}
            borderAlpha={0.9}
            color={REQUEST_APPROVE_COLOR}
            disabled={props.preview}
            icon="checkmark"
            iconSize={22}
            iconTone={theme.colors.bgBase}
            loading={props.busy}
            onPress={props.onApprove}
            shadowAlpha={0.26}
          />
          <CompactIconAction
            backgroundAlpha={0.82}
            borderAlpha={0.82}
            color={REQUEST_REJECT_COLOR}
            disabled={props.preview}
            icon="close"
            iconSize={22}
            iconTone={theme.colors.textPrimary}
            loading={props.busy}
            onPress={props.onReject}
            shadowAlpha={0.22}
          />
        </View>
      </View>
    </GlassCard>
  );
}

function ViewerItem(props: {
  busy: boolean;
  onRemove: () => void;
  viewer: DeviceViewer;
}) {
  return (
    <GlassCard style={{ gap: 10, paddingHorizontal: 14, paddingVertical: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <AvatarChip avatarUrl={props.viewer.avatarUrl} label={props.viewer.displayName} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: 16,
              lineHeight: 20,
            }}
          >
            {props.viewer.displayName}
          </Text>
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            Connected {formatRelativeTimestamp(props.viewer.approvedAt)}
          </Text>
        </View>
        <CompactIconAction
          color={theme.colors.statusErrorMuted}
          disabled={props.busy}
          icon="trash-outline"
          loading={props.busy}
          onPress={props.onRemove}
        />
      </View>
    </GlassCard>
  );
}

export function FriendsRequestsScreen() {
  const router = useRouter();
  const isMountedRef = useIsMountedRef();
  const {
    approveRequest,
    hasLoadedSharing,
    isApprovingRequest,
    isFetchingSharing,
    isLoadingSharing,
    isRejectingRequest,
    isRevokingViewer,
    rejectRequest,
    refreshSharedBoards,
    refreshSharing,
    revokeViewer,
    sharingError,
    sharingState,
  } = useFriends();
  const [activeId, setActiveId] = useState<string | null>(null);
  const totalRows = sharingState.pendingRequests.length + sharingState.viewers.length;
  const shouldHoldEmptyState = shouldHoldFriendsEmptyState({
    hasLoadedOnce: hasLoadedSharing,
    isFetching: isLoadingSharing || isFetchingSharing,
    itemCount: totalRows,
  });
  const showErrorCard = !shouldHoldEmptyState && totalRows === 0 && sharingError;
  const showErrorBanner = !shouldHoldEmptyState && totalRows > 0 && sharingError;

  useFocusEffect(
    useCallback(() => {
      void Promise.all([refreshSharing(), refreshSharedBoards()]);
    }, [refreshSharedBoards, refreshSharing]),
  );
  async function handleApprove(requestId: string) {
    setActiveId(requestId);
    try {
      await approveRequest(requestId);
      triggerPrimaryActionSuccessHaptic();
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      Alert.alert("Couldn't approve request", error instanceof Error ? error.message : "Try again.");
    } finally {
      if (isMountedRef.current) {
        setActiveId(null);
      }
    }
  }

  async function handleReject(requestId: string) {
    setActiveId(requestId);
    try {
      await rejectRequest(requestId);
      triggerPrimaryActionSuccessHaptic();
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      Alert.alert("Couldn't reject request", error instanceof Error ? error.message : "Try again.");
    } finally {
      if (isMountedRef.current) {
        setActiveId(null);
      }
    }
  }

  async function handleRemove(viewer: DeviceViewer) {
    if (__DEV__) {
      console.info("[friends] requests:prompt-remove", {
        membershipId: viewer.membershipId,
        userId: viewer.userId,
      });
    }

    Alert.alert("Remove access?", `Remove ${viewer.displayName} from this board?`, [
      {
        style: "cancel",
        text: "Cancel",
      },
      {
        style: "destructive",
        text: "Remove",
        onPress: () => {
          void confirmRemove(viewer);
        },
      },
    ]);
  }

  async function confirmRemove(viewer: DeviceViewer) {
    if (__DEV__) {
      console.info("[friends] requests:confirm-remove", {
        membershipId: viewer.membershipId,
        userId: viewer.userId,
      });
    }

    setActiveId(viewer.membershipId);
    try {
      await revokeViewer(viewer.membershipId);
      triggerPrimaryActionSuccessHaptic();
    } catch (error) {
      if (__DEV__) {
        console.info("[friends] requests:confirm-remove:error", {
          error: error instanceof Error ? error.message : String(error),
          membershipId: viewer.membershipId,
        });
      }
      triggerPrimaryActionFailureHaptic();
      Alert.alert("Couldn't remove access", error instanceof Error ? error.message : "Try again.");
    } finally {
      if (isMountedRef.current) {
        setActiveId(null);
      }
    }
  }

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: Platform.OS !== "android",
          title: "Requests",
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.colors.bgBase },
          headerTintColor: theme.colors.textPrimary,
          headerLeft: () => (
            <Pressable
              hitSlop={10}
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                  return;
                }

                router.replace("/friends");
              }}
              style={{
                alignItems: "center",
                justifyContent: "center",
                minHeight: 32,
                minWidth: 28,
                marginLeft: -4,
                paddingRight: 2,
              }}
            >
              <Ionicons color={theme.colors.textPrimary} name="chevron-back" size={28} />
            </Pressable>
          ),
        }}
      />
      <ScreenScrollView
        bottomInset={theme.layout.scrollBottom}
        contentContainerStyle={{ gap: 18, paddingTop: 8 }}
        contentInsetAdjustmentBehavior="never"
        header={
          Platform.OS === "android" ? (
            <FriendsRouteHeader
              onBack={() => {
                if (router.canGoBack()) {
                  router.back();
                  return;
                }

                router.replace("/friends");
              }}
              title="Requests"
            />
          ) : undefined
        }
        safeAreaEdges={Platform.OS === "android" ? undefined : ["left", "right", "bottom"]}
      >
        <ScreenSection style={{ gap: 18 }}>
          {shouldHoldEmptyState ? (
            <GlassCard style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 18 }}>
              <ActivityIndicator color={theme.colors.accentAmber} />
              <Text
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                Loading requests…
              </Text>
            </GlassCard>
          ) : null}

          {showErrorCard ? (
            <GlassCard style={{ paddingHorizontal: 18, paddingVertical: 18 }}>
              <Text
                selectable
                style={{
                  color: theme.colors.statusErrorMuted,
                  fontFamily: theme.typography.body.fontFamily,
                  fontSize: theme.typography.body.fontSize,
                  lineHeight: theme.typography.body.lineHeight,
                }}
              >
                {sharingError instanceof Error ? sharingError.message : "We couldn't load requests right now."}
              </Text>
            </GlassCard>
          ) : null}

          {!shouldHoldEmptyState && !showErrorCard ? (
            <>
              {showErrorBanner ? (
                <GlassCard style={{ paddingHorizontal: 18, paddingVertical: 18 }}>
                  <Text
                    selectable
                    style={{
                      color: theme.colors.statusErrorMuted,
                      fontFamily: theme.typography.body.fontFamily,
                      fontSize: theme.typography.body.fontSize,
                      lineHeight: theme.typography.body.lineHeight,
                    }}
                  >
                    {sharingError instanceof Error ? sharingError.message : "We couldn't refresh every request right now."}
                  </Text>
                </GlassCard>
              ) : null}

              <View style={{ gap: 12 }}>
                {sharingState.pendingRequests.length === 0 ? (
                  <EmptyMessage title="No pending requests" body="Requests appear here after someone uses your code." />
                ) : (
                  sharingState.pendingRequests.map((request) => (
                    <RequestItem
                      key={request.id}
                      busy={(isApprovingRequest || isRejectingRequest) && activeId === request.id}
                      onApprove={() => handleApprove(request.id)}
                      onReject={() => handleReject(request.id)}
                      request={request}
                    />
                  ))
                )}
              </View>

              <View style={{ gap: 12 }}>
                {sharingState.viewers.length === 0 ? (
                  <EmptyMessage title="No connected people" body="Approved people stay here until you remove access." />
                ) : (
                  sharingState.viewers.map((viewer) => (
                    <ViewerItem
                      key={viewer.membershipId}
                      busy={isRevokingViewer && activeId === viewer.membershipId}
                      onRemove={() => void handleRemove(viewer)}
                      viewer={viewer}
                    />
                  ))
                )}
              </View>
            </>
          ) : null}
        </ScreenSection>
      </ScreenScrollView>
    </>
  );
}
