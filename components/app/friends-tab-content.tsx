import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { ReactNode, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, Text, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { PixelGrid } from "@/components/board/pixel-grid";
import { ScreenScrollView, ScreenSection } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useDevices } from "@/hooks/use-devices";
import { useFriends, formatFriendsError } from "@/hooks/use-friends";
import { useSocialProfile } from "@/hooks/use-social-profile";
import { buildBoardCells, getMergedPalette, targetStatusLabel } from "@/lib/board";
import { withAlpha } from "@/lib/color";
import {
  triggerNavigationHaptic,
  triggerPrimaryActionFailureHaptic,
  triggerPrimaryActionSuccessHaptic,
} from "@/lib/haptics";
import { DeviceShareRequest, DeviceViewer, SharedBoard } from "@/types/addone";

interface FriendsTabContentProps {
  bottomInset?: number;
}

type FeedbackTone = "error" | "success";

function SectionEyebrow({ children }: { children: string }) {
  return (
    <Text
      style={{
        color: theme.colors.textTertiary,
        fontFamily: theme.typography.micro.fontFamily,
        fontSize: theme.typography.micro.fontSize,
        lineHeight: theme.typography.micro.lineHeight,
        letterSpacing: theme.typography.micro.letterSpacing,
        textTransform: "uppercase",
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
        fontFamily: theme.typography.title.fontFamily,
        fontSize: theme.typography.title.fontSize,
        lineHeight: theme.typography.title.lineHeight,
      }}
    >
      {children}
    </Text>
  );
}

function BodyCopy({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "error" | "success" }) {
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
        fontSize: theme.typography.body.fontSize,
        lineHeight: theme.typography.body.lineHeight,
      }}
    >
      {children}
    </Text>
  );
}

function ActionButton(props: {
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  secondary?: boolean;
}) {
  const isDisabled = props.disabled || props.loading;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={props.onPress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        minHeight: 48,
        borderRadius: theme.radius.sheet,
        borderWidth: props.secondary ? 1 : 0,
        borderColor: props.secondary ? withAlpha(theme.colors.textPrimary, 0.12) : "transparent",
        backgroundColor: props.secondary
          ? withAlpha(theme.colors.bgElevated, 0.72)
          : isDisabled
            ? withAlpha(theme.colors.textPrimary, 0.12)
            : theme.colors.textPrimary,
        opacity: isDisabled ? 0.68 : 1,
        paddingHorizontal: 16,
      }}
    >
      {props.loading ? (
        <ActivityIndicator color={props.secondary ? theme.colors.textPrimary : theme.colors.textInverse} />
      ) : (
        <Text
          style={{
            color: props.secondary ? theme.colors.textPrimary : theme.colors.textInverse,
            fontFamily: theme.typography.label.fontFamily,
            fontSize: theme.typography.label.fontSize,
            lineHeight: theme.typography.label.lineHeight,
          }}
        >
          {props.label}
        </Text>
      )}
    </Pressable>
  );
}

function StatusPill(props: { label: string; tone?: "success" | "warning" | "default" }) {
  const tone = props.tone ?? "default";

  return (
    <View
      style={{
        borderRadius: theme.radius.full,
        borderWidth: 1,
        borderColor:
          tone === "success"
            ? withAlpha(theme.colors.accentSuccess, 0.24)
            : tone === "warning"
              ? withAlpha(theme.colors.accentAmber, 0.24)
              : withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor:
          tone === "success"
            ? withAlpha(theme.colors.accentSuccess, 0.12)
            : tone === "warning"
              ? withAlpha(theme.colors.accentAmber, 0.14)
              : withAlpha(theme.colors.textPrimary, 0.04),
        paddingHorizontal: 10,
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          color: tone === "success" ? theme.colors.accentSuccess : tone === "warning" ? theme.colors.accentAmber : theme.colors.textSecondary,
          fontFamily: theme.typography.micro.fontFamily,
          fontSize: theme.typography.micro.fontSize,
          lineHeight: theme.typography.micro.lineHeight,
          letterSpacing: theme.typography.micro.letterSpacing,
          textTransform: "uppercase",
        }}
      >
        {props.label}
      </Text>
    </View>
  );
}

function initialsForName(value: string) {
  const initials = value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return initials || "A";
}

function AvatarChip(props: { avatarUrl?: string | null; label: string }) {
  if (props.avatarUrl) {
    return (
      <Image
        source={{ uri: props.avatarUrl }}
        style={{
          width: 38,
          height: 38,
          borderRadius: theme.radius.full,
          backgroundColor: withAlpha(theme.colors.textPrimary, 0.08),
        }}
      />
    );
  }

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 38,
        borderRadius: theme.radius.full,
        backgroundColor: withAlpha(theme.colors.textPrimary, 0.08),
      }}
    >
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: 14,
          lineHeight: 18,
        }}
      >
        {initialsForName(props.label)}
      </Text>
    </View>
  );
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return "Waiting for the first live snapshot";
  }

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatShareCode(code: string | null) {
  if (!code) {
    return "------";
  }

  const normalized = code.trim().toUpperCase();
  if (normalized.length <= 3) {
    return normalized;
  }

  return `${normalized.slice(0, 3)} ${normalized.slice(3)}`;
}

function normalizeShareCodeInput(value: string) {
  return value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 12);
}

function SharedBoardCard({ board, width }: { board: SharedBoard; width: number }) {
  const cells = useMemo(() => buildBoardCells(board), [board]);
  const palette = getMergedPalette(board.paletteId);
  const boardWidth = Math.max(280, Math.min(width - 32, 420));

  return (
    <GlassCard style={{ gap: 16, paddingHorizontal: 18, paddingVertical: 18 }}>
      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <View style={{ flex: 1, gap: 6 }}>
          <SectionEyebrow>{board.ownerName}</SectionEyebrow>
          <SectionTitle>{board.habitName}</SectionTitle>
          <BodyCopy>{targetStatusLabel(board)}</BodyCopy>
        </View>
        <StatusPill label={board.syncState === "online" ? "Live" : "Offline"} tone={board.syncState === "online" ? "success" : "default"} />
      </View>

      <View
        style={{
          alignItems: "center",
          borderRadius: theme.radius.card,
          borderWidth: 1,
          borderColor: withAlpha(theme.colors.textPrimary, 0.08),
          backgroundColor: withAlpha(theme.colors.bgBase, 0.7),
          paddingHorizontal: 12,
          paddingVertical: 12,
        }}
      >
        <PixelGrid availableWidth={boardWidth} cells={cells} mode="shared" palette={palette} readOnly />
      </View>

      <View style={{ gap: 4 }}>
        <BodyCopy>Read-only shared board</BodyCopy>
        <BodyCopy>Last snapshot: {formatTimestamp(board.lastSnapshotAt)}</BodyCopy>
      </View>
    </GlassCard>
  );
}

function RequestRow(props: {
  isApproving: boolean;
  isRejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
  request: DeviceShareRequest;
}) {
  return (
    <View
      style={{
        gap: 12,
        borderRadius: theme.radius.sheet,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.bgBase, 0.72),
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <AvatarChip avatarUrl={props.request.requesterAvatarUrl} label={props.request.requesterDisplayName} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text
            style={{
              color: theme.colors.textPrimary,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: 15,
              lineHeight: 20,
            }}
          >
            {props.request.requesterDisplayName}
          </Text>
          <BodyCopy>Requested {formatTimestamp(props.request.createdAt)}</BodyCopy>
        </View>
      </View>
      <View style={{ flexDirection: "row", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <ActionButton label="Approve" loading={props.isApproving} onPress={props.onApprove} />
        </View>
        <View style={{ flex: 1 }}>
          <ActionButton label="Reject" loading={props.isRejecting} onPress={props.onReject} secondary />
        </View>
      </View>
    </View>
  );
}

function ViewerRow({ viewer }: { viewer: DeviceViewer }) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        borderRadius: theme.radius.sheet,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.bgBase, 0.72),
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
      <AvatarChip avatarUrl={viewer.avatarUrl} label={viewer.displayName} />
      <View style={{ flex: 1, gap: 3 }}>
        <Text
          style={{
            color: theme.colors.textPrimary,
            fontFamily: theme.typography.label.fontFamily,
            fontSize: 15,
            lineHeight: 20,
          }}
        >
          {viewer.displayName}
        </Text>
        <BodyCopy>Approved {formatTimestamp(viewer.approvedAt)}</BodyCopy>
      </View>
    </View>
  );
}

function EmptyMessage(props: { body: string; title: string }) {
  return (
    <View
      style={{
        gap: 6,
        borderRadius: theme.radius.sheet,
        borderWidth: 1,
        borderColor: withAlpha(theme.colors.textPrimary, 0.08),
        backgroundColor: withAlpha(theme.colors.bgBase, 0.64),
        paddingHorizontal: 14,
        paddingVertical: 14,
      }}
    >
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
      <BodyCopy>{props.body}</BodyCopy>
    </View>
  );
}

export function FriendsTabContent({ bottomInset = theme.layout.tabScrollBottom }: FriendsTabContentProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { activeDevice } = useDevices();
  const { isComplete, isLoading: isLoadingProfile } = useSocialProfile();
  const {
    approveRequest,
    isApprovingRequest,
    isLoadingSharedBoards,
    isLoadingSharing,
    isRejectingRequest,
    isRequestingAccess,
    isRotatingCode,
    rejectRequest,
    requestAccess,
    requestAccessError,
    rotateShareCode,
    sharedBoards,
    sharedBoardsError,
    sharingError,
    sharingState,
  } = useFriends();
  const [shareCodeInput, setShareCodeInput] = useState("");
  const [shareCodeFeedback, setShareCodeFeedback] = useState<{ message: string; tone: FeedbackTone } | null>(null);
  const [ownerFeedback, setOwnerFeedback] = useState<{ message: string; tone: FeedbackTone } | null>(null);
  const [activeRequestActionId, setActiveRequestActionId] = useState<string | null>(null);
  const boardCardWidth = Math.max(320, Math.min(width - 40, 640));

  const handleProfileGate = () => {
    triggerNavigationHaptic();
    router.push("/profile?from=friends");
  };

  const handleRequestAccess = async () => {
    const normalizedCode = normalizeShareCodeInput(shareCodeInput);
    if (!normalizedCode) {
      triggerPrimaryActionFailureHaptic();
      setShareCodeFeedback({
        message: "Enter a share code first.",
        tone: "error",
      });
      return;
    }

    try {
      await requestAccess(normalizedCode);
      triggerPrimaryActionSuccessHaptic();
      setShareCodeInput("");
      setShareCodeFeedback({
        message: "Request sent. The owner will need to approve it before the board appears here.",
        tone: "success",
      });
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      setShareCodeFeedback({
        message: formatFriendsError(error, "We couldn't send that share request."),
        tone: "error",
      });
    }
  };

  const handleRotateShareCode = async () => {
    if (!activeDevice?.id) {
      return;
    }

    try {
      await rotateShareCode(activeDevice.id);
      triggerPrimaryActionSuccessHaptic();
      setOwnerFeedback({
        message: "Share code rotated. Use the new code for any future requests.",
        tone: "success",
      });
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      setOwnerFeedback({
        message: formatFriendsError(error, "We couldn't rotate the share code right now."),
        tone: "error",
      });
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setActiveRequestActionId(requestId);

    try {
      await approveRequest(requestId);
      triggerPrimaryActionSuccessHaptic();
      setOwnerFeedback({
        message: "Request approved. That board should now appear for the viewer.",
        tone: "success",
      });
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      setOwnerFeedback({
        message: formatFriendsError(error, "We couldn't approve that request."),
        tone: "error",
      });
    } finally {
      setActiveRequestActionId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setActiveRequestActionId(requestId);

    try {
      await rejectRequest(requestId);
      triggerPrimaryActionSuccessHaptic();
      setOwnerFeedback({
        message: "Request rejected.",
        tone: "success",
      });
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      setOwnerFeedback({
        message: formatFriendsError(error, "We couldn't reject that request."),
        tone: "error",
      });
    } finally {
      setActiveRequestActionId(null);
    }
  };

  return (
    <ScreenScrollView bottomInset={bottomInset} contentContainerStyle={{ gap: 18 }}>
      <ScreenSection style={{ gap: 18 }}>
        <GlassCard style={{ gap: 14, paddingHorizontal: 20, paddingVertical: 20 }}>
          <SectionEyebrow>Friends</SectionEyebrow>

          {isLoadingProfile ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <ActivityIndicator color={theme.colors.accentAmber} />
              <BodyCopy>Checking profile…</BodyCopy>
            </View>
          ) : null}

          {!isLoadingProfile && !isComplete ? (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
              <View style={{ gap: 10 }}>
                <SectionTitle>Finish your profile first.</SectionTitle>
                <BodyCopy>Add your first name, last name, and @username before sharing turns on.</BodyCopy>
                <ActionButton label="Finish profile" onPress={handleProfileGate} />
              </View>
            </Animated.View>
          ) : null}

          {!isLoadingProfile && isComplete ? (
            <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
              <View style={{ gap: 10 }}>
                <SectionTitle>Quiet sharing, real boards.</SectionTitle>
                <BodyCopy>
                  Request access by code, approve people deliberately, and keep every shared board read-only.
                </BodyCopy>
              </View>
            </Animated.View>
          ) : null}
        </GlassCard>

        {!isLoadingProfile && isComplete ? (
          <>
            <GlassCard style={{ gap: 16, paddingHorizontal: 20, paddingVertical: 20 }}>
              <View style={{ gap: 6 }}>
                <SectionEyebrow>Join a board</SectionEyebrow>
                <SectionTitle>Enter a share code</SectionTitle>
                <BodyCopy>Ask the owner for their current board code, then send a request for approval.</BodyCopy>
              </View>

              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                keyboardType="ascii-capable"
                maxLength={12}
                onChangeText={(value) => {
                  setShareCodeFeedback(null);
                  setShareCodeInput(normalizeShareCodeInput(value));
                }}
                placeholder="ABC123"
                placeholderTextColor={theme.colors.textMuted}
                style={{
                  borderRadius: theme.radius.sheet,
                  borderWidth: 1,
                  borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                  backgroundColor: withAlpha(theme.colors.bgBase, 0.88),
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.title.fontFamily,
                  fontSize: 24,
                  lineHeight: 30,
                  letterSpacing: 2,
                  paddingHorizontal: 16,
                  paddingVertical: 15,
                  textAlign: "center",
                }}
                value={shareCodeInput}
              />

              {shareCodeFeedback ? <BodyCopy tone={shareCodeFeedback.tone}>{shareCodeFeedback.message}</BodyCopy> : null}
              {!shareCodeFeedback && requestAccessError ? (
                <BodyCopy tone="error">{formatFriendsError(requestAccessError, "We couldn't send that share request.")}</BodyCopy>
              ) : null}

              <ActionButton
                label="Request access"
                loading={isRequestingAccess}
                onPress={handleRequestAccess}
              />
            </GlassCard>

            <GlassCard style={{ gap: 16, paddingHorizontal: 20, paddingVertical: 20 }}>
              <View style={{ gap: 6 }}>
                <SectionEyebrow>Your board</SectionEyebrow>
                <SectionTitle>{activeDevice ? `Share ${activeDevice.name}` : "Share your board"}</SectionTitle>
                <BodyCopy>
                  {activeDevice
                    ? "This is the active board code and approval lane for your current device."
                    : "Onboard a device first to generate a board code and manage incoming requests."}
                </BodyCopy>
              </View>

              {activeDevice ? (
                <>
                  <View
                    style={{
                      gap: 10,
                      borderRadius: theme.radius.card,
                      borderWidth: 1,
                      borderColor: withAlpha(theme.colors.textPrimary, 0.08),
                      backgroundColor: withAlpha(theme.colors.bgBase, 0.74),
                      paddingHorizontal: 16,
                      paddingVertical: 16,
                    }}
                  >
                    <SectionEyebrow>Current code</SectionEyebrow>
                    {isLoadingSharing ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <ActivityIndicator color={theme.colors.accentAmber} />
                        <BodyCopy>Loading sharing state…</BodyCopy>
                      </View>
                    ) : (
                      <>
                        <Text
                          selectable
                          style={{
                            color: theme.colors.textPrimary,
                            fontFamily: theme.typography.display.fontFamily,
                            fontSize: 30,
                            lineHeight: 34,
                            letterSpacing: 3,
                            textAlign: "center",
                          }}
                        >
                          {formatShareCode(sharingState.code)}
                        </Text>
                        <BodyCopy>Rotating the code does not remove people who were already approved.</BodyCopy>
                      </>
                    )}
                  </View>

                  {ownerFeedback ? <BodyCopy tone={ownerFeedback.tone}>{ownerFeedback.message}</BodyCopy> : null}
                  {!ownerFeedback && sharingError ? (
                    <BodyCopy tone="error">{formatFriendsError(sharingError, "We couldn't load sharing for this board.")}</BodyCopy>
                  ) : null}

                  <ActionButton
                    disabled={!sharingState.code}
                    label="Rotate share code"
                    loading={isRotatingCode}
                    onPress={handleRotateShareCode}
                    secondary
                  />

                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <SectionTitle>Pending requests</SectionTitle>
                      <StatusPill
                        label={sharingState.pendingRequests.length === 0 ? "Clear" : `${sharingState.pendingRequests.length} pending`}
                        tone={sharingState.pendingRequests.length > 0 ? "warning" : "default"}
                      />
                    </View>

                    {sharingState.pendingRequests.length === 0 ? (
                      <EmptyMessage
                        body="Requests will appear here after someone enters your current board code."
                        title="No pending requests"
                      />
                    ) : (
                      sharingState.pendingRequests.map((request) => (
                        <RequestRow
                          key={request.id}
                          isApproving={isApprovingRequest && activeRequestActionId === request.id}
                          isRejecting={isRejectingRequest && activeRequestActionId === request.id}
                          onApprove={() => handleApproveRequest(request.id)}
                          onReject={() => handleRejectRequest(request.id)}
                          request={request}
                        />
                      ))
                    )}
                  </View>

                  <View style={{ gap: 12 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <SectionTitle>Connected people</SectionTitle>
                      <StatusPill label={sharingState.viewers.length === 0 ? "Waiting" : `${sharingState.viewers.length} connected`} />
                    </View>

                    {sharingState.viewers.length === 0 ? (
                      <EmptyMessage
                        body="Approved viewers will stay listed here until sharing is revoked in a later pass."
                        title="No viewers yet"
                      />
                    ) : (
                      sharingState.viewers.map((viewer) => <ViewerRow key={viewer.membershipId} viewer={viewer} />)
                    )}
                  </View>
                </>
              ) : (
                <EmptyMessage
                  body="You can still request another board by code, but your own share code appears only after you claim a device."
                  title="No owned device connected"
                />
              )}
            </GlassCard>

            <View style={{ gap: 12 }}>
              <View style={{ paddingHorizontal: 4, gap: 6 }}>
                <SectionEyebrow>Connected boards</SectionEyebrow>
                <SectionTitle>Read-only boards you can follow</SectionTitle>
                <BodyCopy>Your own board stays separate. These previews are for checking in on other people without editing their history.</BodyCopy>
              </View>

              {isLoadingSharedBoards ? (
                <GlassCard style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 18 }}>
                  <ActivityIndicator color={theme.colors.accentAmber} />
                  <BodyCopy>Loading shared boards…</BodyCopy>
                </GlassCard>
              ) : null}

              {!isLoadingSharedBoards && sharedBoardsError ? (
                <GlassCard style={{ paddingHorizontal: 18, paddingVertical: 18 }}>
                  <BodyCopy tone="error">{formatFriendsError(sharedBoardsError, "We couldn't load the shared boards.")}</BodyCopy>
                </GlassCard>
              ) : null}

              {!isLoadingSharedBoards && !sharedBoardsError && sharedBoards.length === 0 ? (
                <EmptyMessage
                  body="Once an owner approves your request, their board will appear here as a live read-only preview."
                  title="No shared boards yet"
                />
              ) : null}

              {!isLoadingSharedBoards && !sharedBoardsError
                ? sharedBoards.map((board) => <SharedBoardCard key={board.id} board={board} width={boardCardWidth} />)
                : null}
            </View>
          </>
        ) : null}
      </ScreenSection>
    </ScreenScrollView>
  );
}
