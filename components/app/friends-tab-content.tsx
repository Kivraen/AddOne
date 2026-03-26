import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { BlurView } from "expo-blur";
import { Image } from "expo-image";
import * as Sharing from "expo-sharing";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActionSheetIOS, ActivityIndicator, Modal, Pressable, ScrollView, Share, Text, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";

import { DeviceBoardStage } from "@/components/board/device-board-stage";
import { ScreenScrollView, ScreenSection } from "@/components/layout/screen-frame";
import { GlassCard } from "@/components/ui/glass-card";
import { theme } from "@/constants/theme";
import { useDevices } from "@/hooks/use-devices";
import { useFriendsBoardOrder } from "@/hooks/use-friends-board-order";
import { FriendsDemoScenario, useFriends, formatFriendsError } from "@/hooks/use-friends";
import { useIsMountedRef } from "@/hooks/use-is-mounted-ref";
import { useSocialProfile } from "@/hooks/use-social-profile";
import { buildBoardCells, getMergedPalette } from "@/lib/board";
import { DEFAULT_CELEBRATION_TRANSITION } from "@/lib/celebration-transitions";
import { withAlpha } from "@/lib/color";
import { shouldHoldFriendsEmptyState } from "@/lib/friends-state";
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
type FriendsSheetKey = "controls" | "join" | "share" | "connections" | "boards" | null;

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

function AvatarChip(props: { avatarUrl?: string | null; label: string; size?: number }) {
  const size = props.size ?? 38;
  if (props.avatarUrl) {
    return (
      <Image
        source={{ uri: props.avatarUrl }}
        style={{
          width: size,
          height: size,
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
          fontSize: Math.max(14, Math.round(size * 0.36)),
          lineHeight: Math.max(18, Math.round(size * 0.42)),
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

function normalizeDemoScenario(value: string | string[] | undefined): FriendsDemoScenario | null {
  const normalized = Array.isArray(value) ? value[0] : value;
  switch (normalized) {
    case "profile-gate":
    case "empty-owner":
    case "empty-boards":
    case "pending":
    case "connected":
      return normalized;
    default:
      return null;
  }
}

function makePreviewBoard(
  id: string,
  ownerName: string,
  habitName: string,
  paletteId: string,
  activeByWeek: number[][],
  syncState: SharedBoard["syncState"] = "online",
): SharedBoard {
  return {
    celebrationEnabled: true,
    celebrationTransition: DEFAULT_CELEBRATION_TRANSITION,
    id,
    viewerMembershipId: `${id}-viewer-membership`,
    ownerName,
    habitName,
    syncState,
    lastSnapshotAt: new Date().toISOString(),
    weeklyTarget: 4,
    paletteId,
    days: Array.from({ length: 21 }, (_, weekIndex) =>
      Array.from({ length: 7 }, (_, dayIndex) => activeByWeek[weekIndex]?.includes(dayIndex) ?? false),
    ),
    logicalToday: new Date().toISOString().slice(0, 10),
    today: {
      weekIndex: 4,
      dayIndex: 4,
    },
  };
}

function previewBoards(): SharedBoard[] {
  return [
    makePreviewBoard(
      "preview-amber",
      "Alexandria Montgomery-Winters",
      "Night Run",
      "amber",
      [[0, 2, 4], [1, 3, 5], [0, 1, 2, 4], [0, 2], [1, 2, 4]],
      "online",
    ),
    makePreviewBoard("preview-ice", "Taylor Reed", "Sketch Practice", "ice", [[0, 1], [0, 2, 4], [1, 2, 3], [0, 3, 4], [0, 1, 4]], "online"),
    makePreviewBoard("preview-classic", "Morgan Lee", "Morning Stretch", "classic", [[0, 1, 2], [2, 3, 4], [0, 1, 4], [1, 3], [0, 1, 2, 3]], "offline"),
  ];
}

function previewPendingRequest(): DeviceShareRequest {
  return {
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    id: "preview-request",
    requesterDisplayName: "Avery Stone",
    requesterUserId: "preview-requester",
    status: "pending",
  };
}

function previewViewer(): DeviceViewer {
  return {
    approvedAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    displayName: "Riley Hart",
    membershipId: "preview-viewer",
    userId: "preview-user",
  };
}

function sharedBoardStats(board: SharedBoard) {
  let completed = 0;
  let successfulWeeks = 0;

  for (let col = 0; col < board.days.length; col += 1) {
    const isPastWeek = col > board.today.weekIndex;
    const isCurrentWeek = col === board.today.weekIndex;
    const visibleDays = isPastWeek ? 7 : isCurrentWeek ? board.today.dayIndex + 1 : 0;
    const completedThisWeek = board.days[col].slice(0, visibleDays).filter(Boolean).length;

    completed += completedThisWeek;
    if (visibleDays > 0 && completedThisWeek >= board.weeklyTarget) {
      successfulWeeks += 1;
    }
  }

  const currentWeekCompleted = board.days[board.today.weekIndex].slice(0, board.today.dayIndex + 1).filter(Boolean).length;

  return {
    completed,
    currentWeekCompleted,
    successfulWeeks,
  };
}

function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1, gap: 4, justifyContent: "center", paddingHorizontal: 2 }}>
      <Text
        style={{
          color: theme.colors.textTertiary,
          fontFamily: theme.typography.micro.fontFamily,
          fontSize: theme.typography.micro.fontSize,
          lineHeight: theme.typography.micro.lineHeight,
          letterSpacing: theme.typography.micro.letterSpacing,
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.colors.textPrimary,
          fontFamily: theme.typography.label.fontFamily,
          fontSize: 16,
          lineHeight: 20,
          fontVariant: ["tabular-nums"],
          textAlign: "center",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function ShareSnapshotMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ alignItems: "center", flex: 1, gap: 6, justifyContent: "center", paddingHorizontal: 2 }}>
      <Text
        style={{
          color: withAlpha(theme.colors.textInverse, 0.62),
          fontFamily: theme.typography.micro.fontFamily,
          fontSize: theme.typography.micro.fontSize,
          lineHeight: theme.typography.micro.lineHeight,
          letterSpacing: theme.typography.micro.letterSpacing,
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: theme.colors.textInverse,
          fontFamily: theme.typography.title.fontFamily,
          fontSize: 20,
          lineHeight: 24,
          fontVariant: ["tabular-nums"],
          textAlign: "center",
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function SharedBoardShareSnapshot(props: {
  board: SharedBoard;
  boardWidth: number;
  cells: ReturnType<typeof buildBoardCells>;
  palette: ReturnType<typeof getMergedPalette>;
  stats: ReturnType<typeof sharedBoardStats>;
}) {
  return (
    <View
      style={{
        width: Math.min(440, props.boardWidth + 84),
        borderRadius: 30,
        backgroundColor: "#F7F4EE",
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 22,
        gap: 18,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            width: 54,
            height: 54,
            borderRadius: theme.radius.full,
            backgroundColor: withAlpha(theme.colors.textInverse, 0.08),
          }}
        >
          <Text
            style={{
              color: theme.colors.textInverse,
              fontFamily: theme.typography.label.fontFamily,
              fontSize: 20,
              lineHeight: 24,
            }}
          >
            {props.board.ownerName
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toUpperCase() ?? "")
              .join("") || "A"}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Text
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{
              color: theme.colors.textInverse,
              fontFamily: theme.typography.display.fontFamily,
              fontSize: 28,
              lineHeight: 32,
            }}
          >
            {props.board.ownerName}
          </Text>
          <Text
            numberOfLines={1}
            style={{
              color: withAlpha(theme.colors.textInverse, 0.68),
              fontFamily: theme.typography.label.fontFamily,
              fontSize: 15,
              lineHeight: 20,
              flexShrink: 1,
            }}
          >
            {props.board.habitName}
          </Text>
        </View>
      </View>

      <DeviceBoardStage
        accentColor={props.palette.weekSuccess}
        cells={props.cells}
        maxGridWidth={props.boardWidth}
        palette={props.palette}
      />

      <View style={{ flexDirection: "row", alignItems: "stretch" }}>
        <ShareSnapshotMetric label="This week" value={`${props.stats.currentWeekCompleted}/${props.board.weeklyTarget}`} />
        <View style={{ width: 1, backgroundColor: withAlpha(theme.colors.textInverse, 0.12), marginHorizontal: 10 }} />
        <ShareSnapshotMetric label="Weeks" value={`${props.stats.successfulWeeks}`} />
        <View style={{ width: 1, backgroundColor: withAlpha(theme.colors.textInverse, 0.12), marginHorizontal: 10 }} />
        <ShareSnapshotMetric label="Recorded" value={`${props.stats.completed}d`} />
      </View>
    </View>
  );
}

function SharedBoardCard({ board, width }: { board: SharedBoard; width: number }) {
  const cells = useMemo(() => buildBoardCells(board), [board]);
  const palette = getMergedPalette(board.paletteId);
  const boardWidth = Math.max(300, Math.min(width - 12, 460));
  const stats = useMemo(() => sharedBoardStats(board), [board]);
  const shareSnapshotRef = useRef<View>(null);
  const isMountedRef = useIsMountedRef();
  const [isSharingCard, setIsSharingCard] = useState(false);

  async function handleShareCard() {
    if (!shareSnapshotRef.current || isSharingCard) {
      return;
    }

    setIsSharingCard(true);

    try {
      const imageUri = await captureRef(shareSnapshotRef, {
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(imageUri, {
          dialogTitle: `${board.ownerName}'s progress`,
          mimeType: "image/png",
          UTI: "public.png",
        });
      } else {
        await Share.share({
          message: `${board.ownerName} · ${board.habitName}`,
          url: imageUri,
        });
      }

      triggerPrimaryActionSuccessHaptic();
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      console.warn("Failed to share friend board card", error);
    } finally {
      if (isMountedRef.current) {
        setIsSharingCard(false);
      }
    }
  }

  return (
    <GlassCard
      style={{
        gap: 16,
        paddingHorizontal: 0,
        paddingVertical: 20,
      }}
    >
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: -10000,
          top: 0,
          opacity: 1,
        }}
      >
        <View ref={shareSnapshotRef} collapsable={false}>
          <SharedBoardShareSnapshot board={board} boardWidth={boardWidth} cells={cells} palette={palette} stats={stats} />
        </View>
      </View>

      <View style={{ gap: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12, paddingHorizontal: 18 }}>
          <View style={{ flex: 1, flexDirection: "row", alignItems: "center", gap: 12 }}>
            <AvatarChip label={board.ownerName} size={46} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={{
                  color: theme.colors.textPrimary,
                  fontFamily: theme.typography.title.fontFamily,
                  fontSize: 22,
                  lineHeight: 26,
                }}
              >
                {board.ownerName}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: theme.colors.textSecondary,
                  fontFamily: theme.typography.label.fontFamily,
                  fontSize: 13,
                  lineHeight: 18,
                  flexShrink: 1,
                }}
              >
                {board.habitName}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: "flex-end", justifyContent: "flex-start", minWidth: 64, gap: 8 }}>
            <Pressable
              disabled={isSharingCard}
              hitSlop={10}
              onPress={() => {
                void handleShareCard();
              }}
              style={{ opacity: isSharingCard ? 0.56 : 1, paddingVertical: 2 }}
            >
              <Ionicons color={theme.colors.textSecondary} name="share-social-outline" size={18} />
            </Pressable>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8, minWidth: 64 }}>
              <Text
                style={{
                  color: theme.colors.textTertiary,
                  fontFamily: theme.typography.label.fontFamily,
                  fontSize: 12,
                  lineHeight: 16,
                  textAlign: "right",
                }}
              >
                {formatRelativeTimestamp(board.lastSnapshotAt)}
              </Text>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: board.syncState === "online" ? theme.colors.accentSuccess : theme.colors.textMuted,
                  boxShadow:
                    board.syncState === "online"
                      ? `0px 0px 18px ${withAlpha(theme.colors.accentSuccess, 0.55)}`
                    : undefined,
                }}
              />
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 8 }}>
          <DeviceBoardStage accentColor={palette.weekSuccess} cells={cells} maxGridWidth={boardWidth} palette={palette} />
        </View>

        <View style={{ flexDirection: "row", alignItems: "stretch", paddingHorizontal: 18 }}>
          <CompactMetric label="This week" value={`${stats.currentWeekCompleted}/${board.weeklyTarget}`} />
          <View style={{ width: 1, backgroundColor: withAlpha(theme.colors.textPrimary, 0.08), marginHorizontal: 10 }} />
          <CompactMetric label="Weeks" value={`${stats.successfulWeeks}`} />
          <View style={{ width: 1, backgroundColor: withAlpha(theme.colors.textPrimary, 0.08), marginHorizontal: 10 }} />
          <CompactMetric label="Recorded" value={`${stats.completed}d`} />
        </View>
      </View>
    </GlassCard>
  );
}

function RequestRow(props: {
  isApproving: boolean;
  isRejecting: boolean;
  onApprove: () => void;
  onReject: () => void;
  preview?: boolean;
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
        opacity: props.preview ? 0.9 : 1,
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
          <ActionButton disabled={props.preview} label="Approve" loading={props.isApproving} onPress={props.onApprove} />
        </View>
        <View style={{ flex: 1 }}>
          <ActionButton disabled={props.preview} label="Reject" loading={props.isRejecting} onPress={props.onReject} secondary />
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

function IconButton(props: {
  badge?: number;
  indicator?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  title: string;
  compact?: boolean;
}) {
  return (
    <Pressable
      onPress={props.onPress}
      style={{
        alignItems: "center",
        gap: props.compact ? 0 : 10,
        width: props.compact ? 44 : 68,
      }}
    >
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: props.compact ? 40 : 52,
          height: props.compact ? 40 : 52,
          borderRadius: theme.radius.full,
          borderWidth: 1,
          borderColor: withAlpha(theme.colors.textPrimary, 0.08),
          backgroundColor: withAlpha(theme.colors.bgElevated, 0.82),
          position: "relative",
        }}
      >
        <Ionicons color={theme.colors.textPrimary} name={props.icon} size={21} />
        {props.indicator ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: theme.colors.statusErrorMuted,
              borderWidth: 2,
              borderColor: withAlpha(theme.colors.bgElevated, 0.96),
            }}
          />
        ) : null}
        {!props.indicator && props.badge && props.badge > 0 ? (
          <View
            style={{
              position: "absolute",
              top: -3,
              right: -3,
              minWidth: 22,
              height: 22,
              borderRadius: theme.radius.full,
              backgroundColor: theme.colors.accentAmber,
              alignItems: "center",
              justifyContent: "center",
              paddingHorizontal: 6,
            }}
          >
            <Text
              style={{
                color: theme.colors.textInverse,
                fontFamily: theme.typography.micro.fontFamily,
                fontSize: 10,
                lineHeight: 12,
                letterSpacing: 0.6,
                fontVariant: ["tabular-nums"],
              }}
            >
              {props.badge > 9 ? "9+" : String(props.badge)}
            </Text>
          </View>
        ) : null}
      </View>
      {props.compact ? null : (
        <Text
          style={{
            color: theme.colors.textSecondary,
            fontFamily: theme.typography.label.fontFamily,
            fontSize: 12,
            lineHeight: 15,
            textAlign: "center",
          }}
        >
          {props.title}
        </Text>
      )}
    </Pressable>
  );
}

function SheetUtilityActionButton(props: {
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  loading?: boolean;
  onPress: () => void;
}) {
  const isDisabled = props.disabled || props.loading;

  return (
    <Pressable
      accessibilityLabel={props.label}
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={props.onPress}
      style={{
        alignItems: "center",
        gap: 8,
        opacity: isDisabled ? 0.46 : 1,
        width: 72,
      }}
    >
      <View
        style={{
          alignItems: "center",
          justifyContent: "center",
          width: 52,
          height: 52,
          borderRadius: theme.radius.full,
          borderWidth: 1,
          borderColor: withAlpha(theme.colors.textPrimary, 0.08),
          backgroundColor: withAlpha(theme.colors.bgBase, 0.7),
        }}
      >
        {props.loading ? (
          <ActivityIndicator color={theme.colors.textPrimary} />
        ) : (
          <Ionicons color={theme.colors.textPrimary} name={props.icon} size={20} />
        )}
      </View>
      <Text
        style={{
          color: theme.colors.textSecondary,
          fontFamily: theme.typography.micro.fontFamily,
          fontSize: theme.typography.micro.fontSize,
          lineHeight: theme.typography.micro.lineHeight,
          letterSpacing: 0.6,
          textAlign: "center",
          textTransform: "uppercase",
        }}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

function UtilityActionRow(props: { children: ReactNode }) {
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 12,
      }}
    >
      {props.children}
    </View>
  );
}

function SheetSection(props: { body?: string; children: ReactNode; title: string }) {
  return (
    <View style={{ gap: 12 }}>
      <View style={{ gap: 6 }}>
        <SectionTitle>{props.title}</SectionTitle>
        {props.body ? <BodyCopy>{props.body}</BodyCopy> : null}
      </View>
      {props.children}
    </View>
  );
}

function PreviewNote({ children }: { children: ReactNode }) {
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

function SheetCloseButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      hitSlop={10}
      onPress={onPress}
      style={{
        alignItems: "center",
        justifyContent: "center",
        width: 36,
        height: 36,
        borderRadius: theme.radius.full,
      }}
    >
      <Ionicons color={theme.colors.textPrimary} name="close-outline" size={24} />
    </Pressable>
  );
}

export function FriendsTabContent({ bottomInset = theme.layout.tabScrollBottom }: FriendsTabContentProps) {
  const router = useRouter();
  const isMountedRef = useIsMountedRef();
  const params = useLocalSearchParams<{ proofState?: string | string[] }>();
  const { width } = useWindowDimensions();
  const { activeDevice } = useDevices();
  const demoScenario = normalizeDemoScenario(params.proofState);
  const { isComplete, isLoading: isLoadingProfile } = useSocialProfile();
  const {
    approveRequest,
    hasLoadedViewerBoards,
    isApprovingRequest,
    isFetchingViewerBoards,
    isLoadingSharedBoards,
    isLoadingSharing,
    isRejectingRequest,
    isRequestingAccess,
    isRotatingCode,
    refreshOwnerSharing,
    refreshViewerBoards,
    rejectRequest,
    requestAccess,
    requestAccessError,
    rotateShareCode,
    sharedBoards,
    sharedBoardsError,
    sharingError,
    sharingState,
  } = useFriends(demoScenario);
  const [shareCodeInput, setShareCodeInput] = useState("");
  const [shareCodeFeedback, setShareCodeFeedback] = useState<{ message: string; tone: FeedbackTone } | null>(null);
  const [ownerFeedback, setOwnerFeedback] = useState<{ message: string; tone: FeedbackTone } | null>(null);
  const [activeRequestActionId, setActiveRequestActionId] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<FriendsSheetKey>(null);
  const autoCodeDeviceIdRef = useRef<string | null>(null);
  const boardCardWidth = Math.max(320, Math.min(width - 40, 640));
  const isProofScenario = demoScenario !== null;
  const effectiveIsComplete = demoScenario === "profile-gate" ? false : isProofScenario ? true : isComplete;
  const showIntroCard = !isProofScenario || demoScenario === "profile-gate";
  const showJoinCard = !isProofScenario;
  const showOwnerCard =
    !isProofScenario || demoScenario === "empty-owner" || demoScenario === "pending" || demoScenario === "connected";
  const showOwnerCode = !isProofScenario || demoScenario === "empty-owner" || demoScenario === "pending";
  const showPendingSection = !isProofScenario || demoScenario === "empty-owner" || demoScenario === "pending";
  const showViewersSection = !isProofScenario || demoScenario === "empty-owner" || demoScenario === "connected";
  const showSharedBoardsSection = !isProofScenario || demoScenario === "empty-boards" || demoScenario === "connected";
  const pendingCount = sharingState.pendingRequests.length;
  const viewerCount = sharingState.viewers.length;
  const sharedCount = sharedBoards.length;
  const { orderedBoards } = useFriendsBoardOrder(sharedBoards);
  const previewRequestCard = useMemo(() => previewPendingRequest(), []);
  const previewViewerCard = useMemo(() => previewViewer(), []);
  const activePalette = getMergedPalette(activeDevice?.paletteId ?? "amber", activeDevice?.customPalette);
  const galleryWidth = Math.max(300, Math.min(width - 40, 620));
  const codeReady = Boolean(sharingState.code);
  const shouldHoldSharedBoardsEmptyState = shouldHoldFriendsEmptyState({
    hasLoadedOnce: hasLoadedViewerBoards,
    isFetching: isLoadingSharedBoards || isFetchingViewerBoards,
    itemCount: sharedBoards.length,
  });
  const showSharedBoardsErrorCard = !shouldHoldSharedBoardsEmptyState && sharedBoards.length === 0 && sharedBoardsError;
  const showSharedBoardsErrorBanner = !shouldHoldSharedBoardsEmptyState && sharedBoards.length > 0 && sharedBoardsError;
  const isBootstrappingCode =
    Boolean(activeDevice?.id) && !codeReady && !sharingError && !isLoadingSharing && (isRotatingCode || autoCodeDeviceIdRef.current === activeDevice?.id);
  const dialogMaxHeight = useMemo(() => {
    switch (activeSheet) {
      case "controls":
        return "46%";
      case "join":
        return "52%";
      case "share":
        return "58%";
      case "connections":
        return "72%";
      case "boards":
        return "82%";
      default:
        return "60%";
    }
  }, [activeSheet]);

  const handleProfileGate = () => {
    triggerNavigationHaptic();
    router.push("/profile?from=friends");
  };

  useFocusEffect(
    useCallback(() => {
      if (isProofScenario || !effectiveIsComplete) {
        return;
      }

      void Promise.all([refreshOwnerSharing(), refreshViewerBoards()]);
    }, [effectiveIsComplete, isProofScenario, refreshOwnerSharing, refreshViewerBoards]),
  );

  const openControlsMenu = () => {
    triggerNavigationHaptic();

    if (process.env.EXPO_OS === "ios") {
      const options = ["Requests", "Manage boards", "Connect by code", "Share your code", "Cancel"];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          cancelButtonIndex: 4,
          options,
          userInterfaceStyle: "dark",
        },
        (buttonIndex) => {
          if (buttonIndex === 0) {
            router.push("/friends-requests");
            return;
          }

          if (buttonIndex === 1) {
            router.push("/friends-arrange");
            return;
          }

          if (buttonIndex === 2) {
            setActiveSheet("join");
            return;
          }

          if (buttonIndex === 3) {
            setActiveSheet("share");
          }
        },
      );
      return;
    }

    setActiveSheet("controls");
  };

  const handleCopyShareCode = async () => {
    if (!sharingState.code) {
      return;
    }

    await Clipboard.setStringAsync(sharingState.code);
    triggerPrimaryActionSuccessHaptic();
    setOwnerFeedback({
      message: "Code copied.",
      tone: "success",
    });
  };

  const handleSystemShare = async () => {
    if (!sharingState.code) {
      return;
    }

    try {
      await Share.share({
        message: `AddOne board code: ${sharingState.code}`,
      });
    } catch (error) {
      setOwnerFeedback({
        message: formatFriendsError(error, "We couldn't open the share sheet."),
        tone: "error",
      });
    }
  };

  useEffect(() => {
    if (!activeDevice?.id) {
      autoCodeDeviceIdRef.current = null;
      return;
    }

    if (autoCodeDeviceIdRef.current && autoCodeDeviceIdRef.current !== activeDevice.id) {
      autoCodeDeviceIdRef.current = null;
    }
  }, [activeDevice?.id]);

  useEffect(() => {
    let cancelled = false;

    if (
      isProofScenario ||
      !effectiveIsComplete ||
      !activeDevice?.id ||
      codeReady ||
      sharingError ||
      isLoadingSharing ||
      isRotatingCode ||
      autoCodeDeviceIdRef.current === activeDevice.id
    ) {
      return;
    }

    autoCodeDeviceIdRef.current = activeDevice.id;
    void rotateShareCode(activeDevice.id)
      .then(() => {
        if (!cancelled && isMountedRef.current) {
          setOwnerFeedback({
            message: "Share code ready.",
            tone: "success",
          });
        }
      })
      .catch((error) => {
        if (cancelled || !isMountedRef.current) {
          return;
        }

        autoCodeDeviceIdRef.current = null;
        setOwnerFeedback({
          message: formatFriendsError(error, "We couldn't prepare the share code right now."),
          tone: "error",
        });
      });

    return () => {
      cancelled = true;
    };
  }, [
    activeDevice?.id,
    codeReady,
    effectiveIsComplete,
    isMountedRef,
    isLoadingSharing,
    isProofScenario,
    isRotatingCode,
    rotateShareCode,
    sharingError,
  ]);

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
      if (isMountedRef.current) {
        setShareCodeInput("");
        setShareCodeFeedback({
          message: "Request sent. The owner will need to approve it before the board appears here.",
          tone: "success",
        });
      }
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      if (isMountedRef.current) {
        setShareCodeFeedback({
          message: formatFriendsError(error, "We couldn't send that share request."),
          tone: "error",
        });
      }
    }
  };

  const handleRotateShareCode = async () => {
    if (!activeDevice?.id) {
      return;
    }

    try {
      await rotateShareCode(activeDevice.id);
      triggerPrimaryActionSuccessHaptic();
      if (isMountedRef.current) {
        setOwnerFeedback({
          message: sharingState.code ? "Share code rotated. Use the new code for any future requests." : "Share code created.",
          tone: "success",
        });
      }
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      if (isMountedRef.current) {
        setOwnerFeedback({
          message: formatFriendsError(error, "We couldn't rotate the share code right now."),
          tone: "error",
        });
      }
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setActiveRequestActionId(requestId);

    try {
      await approveRequest(requestId);
      triggerPrimaryActionSuccessHaptic();
      if (isMountedRef.current) {
        setOwnerFeedback({
          message: "Request approved. That board should now appear for the viewer.",
          tone: "success",
        });
      }
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      if (isMountedRef.current) {
        setOwnerFeedback({
          message: formatFriendsError(error, "We couldn't approve that request."),
          tone: "error",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setActiveRequestActionId(null);
      }
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setActiveRequestActionId(requestId);

    try {
      await rejectRequest(requestId);
      triggerPrimaryActionSuccessHaptic();
      if (isMountedRef.current) {
        setOwnerFeedback({
          message: "Request rejected.",
          tone: "success",
        });
      }
    } catch (error) {
      triggerPrimaryActionFailureHaptic();
      if (isMountedRef.current) {
        setOwnerFeedback({
          message: formatFriendsError(error, "We couldn't reject that request."),
          tone: "error",
        });
      }
    } finally {
      if (isMountedRef.current) {
        setActiveRequestActionId(null);
      }
    }
  };

  const currentSheetTitle =
    activeSheet === "controls"
      ? "Friends options"
      : activeSheet === "join"
      ? "Join a board"
      : activeSheet === "share"
        ? activeDevice
          ? `Share ${activeDevice.name}`
          : "Share your board"
        : activeSheet === "connections"
          ? "Requests"
          : "Manage boards";

  const currentSheetSubtitle =
    activeSheet === "controls"
      ? "Choose what to do next."
      : activeSheet === "join"
      ? "Enter a board code."
      : activeSheet === "share"
        ? null
        : activeSheet === "connections"
          ? null
          : sharedBoards.length > 0
            ? "Reorder or remove boards you follow."
            : "Approved boards will appear here.";
  const currentSheetNote =
    activeSheet === "share"
      ? sharingState.code
        ? "Copy or share this code. Rotate only if it was exposed. Approved people keep access."
        : "Generate a code to start sharing."
      : null;

  return (
    <View style={{ flex: 1 }}>
      <ScreenScrollView bottomInset={bottomInset} contentContainerStyle={{ gap: 18 }}>
        <ScreenSection style={{ gap: 18 }}>
          {showIntroCard ? (
            <>
              {isLoadingProfile ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 4 }}>
                  <ActivityIndicator color={theme.colors.accentAmber} />
                  <BodyCopy>Checking profile…</BodyCopy>
                </View>
              ) : null}

              {!isLoadingProfile && !effectiveIsComplete ? (
                <Animated.View entering={FadeIn.duration(180)} exiting={FadeOut.duration(140)}>
                  <GlassCard style={{ gap: 10, paddingHorizontal: 18, paddingVertical: 18 }}>
                    <SectionEyebrow>Friends</SectionEyebrow>
                    <SectionTitle>Finish your profile first.</SectionTitle>
                    <BodyCopy>Add your first name, last name, and @username before sharing turns on.</BodyCopy>
                    <ActionButton label="Finish profile" onPress={handleProfileGate} />
                  </GlassCard>
                </Animated.View>
              ) : null}
            </>
          ) : null}

          {!isLoadingProfile && effectiveIsComplete ? (
            <>
              {showSharedBoardsSection ? (
                <View style={{ gap: 16, paddingTop: 6 }}>
                  <View style={{ paddingHorizontal: 4, gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <View style={{ gap: 4 }}>
                        <SectionTitle>Growing together</SectionTitle>
                      </View>
                      <IconButton compact icon="ellipsis-horizontal" indicator={pendingCount > 0} onPress={openControlsMenu} title="More" />
                    </View>
                    {sharingError ? (
                      <BodyCopy tone="error">{formatFriendsError(sharingError, "We couldn't load sharing for this board.")}</BodyCopy>
                    ) : null}
                  </View>

                  {isLoadingSharedBoards ? (
                    <GlassCard style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 18 }}>
                      <ActivityIndicator color={theme.colors.accentAmber} />
                      <BodyCopy>Loading shared boards…</BodyCopy>
                    </GlassCard>
                  ) : null}

                  {showSharedBoardsErrorCard ? (
                    <GlassCard style={{ paddingHorizontal: 18, paddingVertical: 18 }}>
                      <BodyCopy tone="error">{formatFriendsError(sharedBoardsError, "We couldn't load the shared boards.")}</BodyCopy>
                    </GlassCard>
                  ) : null}

                  {showSharedBoardsErrorBanner ? (
                    <GlassCard style={{ paddingHorizontal: 18, paddingVertical: 18 }}>
                      <BodyCopy tone="error">
                        {formatFriendsError(sharedBoardsError, "We couldn't refresh every shared board right now.")}
                      </BodyCopy>
                    </GlassCard>
                  ) : null}

                  {!shouldHoldSharedBoardsEmptyState && !showSharedBoardsErrorCard && sharedBoards.length === 0 ? (
                    <EmptyMessage
                      body="Use the menu to connect by code or share your board."
                      title="No shared boards yet"
                    />
                  ) : null}

                  {!shouldHoldSharedBoardsEmptyState && sharedBoards.length > 0
                    ? orderedBoards.map((board) => <SharedBoardCard key={board.id} board={board} width={boardCardWidth} />)
                    : null}
                </View>
              ) : null}
            </>
          ) : null}
        </ScreenSection>
      </ScreenScrollView>

      {activeSheet ? (
        <Modal animationType="fade" transparent visible onRequestClose={() => setActiveSheet(null)}>
          <View
            style={{
              alignItems: "center",
              flex: 1,
              justifyContent: "center",
              paddingHorizontal: 16,
              paddingTop: 24,
              paddingBottom: bottomInset + 12,
            }}
          >
            <BlurView
              intensity={28}
              tint="dark"
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
              }}
            />
            <View
              pointerEvents="none"
              style={{
                position: "absolute",
                top: 0,
                right: 0,
                bottom: 0,
                left: 0,
                backgroundColor: withAlpha(theme.colors.bgBase, 0.38),
              }}
            />
            <GlassCard
              style={{
                width: "100%",
                maxHeight: dialogMaxHeight,
                gap: 0,
                paddingHorizontal: 0,
                paddingVertical: 0,
                backgroundColor: withAlpha(theme.colors.bgElevated, 0.76),
                borderColor: withAlpha(theme.colors.textPrimary, 0.12),
                boxShadow: `0px 22px 64px ${withAlpha(theme.colors.bgBase, 0.34)}`,
              }}
            >
              <View style={{ gap: 10, paddingHorizontal: 20, paddingBottom: activeSheet === "share" ? 18 : 14, paddingTop: 18 }}>
                <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                  <View style={{ flex: 1, gap: activeSheet === "share" ? 10 : 8 }}>
                    <Text
                      style={{
                        color: theme.colors.textPrimary,
                        fontFamily: theme.typography.title.fontFamily,
                        fontSize: theme.typography.title.fontSize,
                        lineHeight: theme.typography.title.lineHeight,
                      }}
                    >
                      {currentSheetTitle}
                    </Text>
                    {currentSheetSubtitle ? (
                      <Text
                        style={{
                          color: theme.colors.textSecondary,
                          fontFamily: theme.typography.label.fontFamily,
                          fontSize: theme.typography.label.fontSize,
                          lineHeight: theme.typography.label.lineHeight,
                        }}
                        >
                          {currentSheetSubtitle}
                        </Text>
                      ) : null}
                      {currentSheetNote ? (
                        <Text
                          style={{
                            color: theme.colors.textSecondary,
                            fontFamily: theme.typography.body.fontFamily,
                            fontSize: 15,
                            lineHeight: 22,
                            maxWidth: "92%",
                          }}
                        >
                          {currentSheetNote}
                        </Text>
                      ) : null}
                  </View>
                  <SheetCloseButton onPress={() => setActiveSheet(null)} />
                </View>
              </View>

              <ScrollView contentContainerStyle={{ gap: activeSheet === "share" ? 22 : 18, paddingBottom: 22, paddingHorizontal: 20 }} showsVerticalScrollIndicator={false}>
              {activeSheet === "controls" ? (
                <View style={{ gap: 12 }}>
                  <ActionButton
                    label={pendingCount > 0 ? `Requests (${pendingCount})` : "Requests"}
                    onPress={() => {
                      setActiveSheet(null);
                      router.push("/friends-requests");
                    }}
                    secondary
                  />
                  <ActionButton
                    label="Manage boards"
                    onPress={() => {
                      setActiveSheet(null);
                      router.push("/friends-arrange");
                    }}
                    secondary
                  />
                  <ActionButton
                    label="Connect by code"
                    onPress={() => {
                      setShareCodeFeedback(null);
                      setActiveSheet("join");
                    }}
                    secondary
                  />
                  <ActionButton
                    label="Share your code"
                    onPress={() => {
                      setOwnerFeedback(null);
                      setActiveSheet("share");
                    }}
                  />
                </View>
              ) : null}

              {activeSheet === "join" ? (
                <View style={{ gap: 14 }}>
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

                  <ActionButton label="Request access" loading={isRequestingAccess} onPress={handleRequestAccess} />
                </View>
              ) : null}

              {activeSheet === "share" ? (
                <View style={{ gap: 18 }}>
                  {activeDevice ? (
                    <>
                      {showOwnerCode ? (
                        <View
                          style={{
                            gap: 14,
                            borderRadius: theme.radius.hero,
                            borderWidth: 1,
                            borderColor: withAlpha(activePalette.dayOn, 0.18),
                            backgroundColor: withAlpha(activePalette.socket, 0.92),
                            paddingHorizontal: 18,
                            paddingVertical: 20,
                          }}
                        >
                          {isLoadingSharing || isBootstrappingCode ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                              <ActivityIndicator color={activePalette.dayOn} />
                              <BodyCopy>Preparing code…</BodyCopy>
                            </View>
                          ) : (
                            <>
                              <Text
                                selectable
                                style={{
                                  color: theme.colors.textPrimary,
                                  fontFamily: theme.typography.display.fontFamily,
                                  fontSize: 34,
                                  lineHeight: 38,
                                  letterSpacing: 3,
                                  textAlign: "center",
                                }}
                              >
                                {formatShareCode(sharingState.code)}
                              </Text>
                            </>
                          )}
                        </View>
                      ) : null}

                      {ownerFeedback ? <BodyCopy tone={ownerFeedback.tone}>{ownerFeedback.message}</BodyCopy> : null}
                      {!ownerFeedback && sharingError ? (
                        <BodyCopy tone="error">{formatFriendsError(sharingError, "We couldn't load sharing for this board.")}</BodyCopy>
                      ) : null}

                      <UtilityActionRow>
                        <SheetUtilityActionButton
                          disabled={!sharingState.code}
                          icon="copy-outline"
                          label="Copy"
                          onPress={handleCopyShareCode}
                        />
                        <SheetUtilityActionButton
                          disabled={!sharingState.code}
                          icon="share-social-outline"
                          label="Share"
                          onPress={handleSystemShare}
                        />
                        <SheetUtilityActionButton
                          icon={sharingState.code ? "sync-outline" : "add-circle-outline"}
                          label={sharingState.code ? "Rotate" : "Generate"}
                          loading={isRotatingCode}
                          onPress={handleRotateShareCode}
                        />
                      </UtilityActionRow>
                    </>
                  ) : (
                    <EmptyMessage
                      body="Claim a device first."
                      title="No owned device connected"
                    />
                  )}
                </View>
              ) : null}

              {activeSheet === "connections" ? (
                <>
                  {showPendingSection ? (
                    <SheetSection title="Pending">
                      {sharingState.pendingRequests.length === 0 ? (
                        <View style={{ gap: 12 }}>
                          <EmptyMessage
                            body="Requests appear here after someone uses your code."
                            title="No pending requests"
                          />
                          {isProofScenario ? (
                            <View style={{ gap: 8 }}>
                              <PreviewNote>Preview</PreviewNote>
                              <RequestRow
                                isApproving={false}
                                isRejecting={false}
                                onApprove={() => {}}
                                onReject={() => {}}
                                preview
                                request={previewRequestCard}
                              />
                            </View>
                          ) : null}
                        </View>
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
                    </SheetSection>
                  ) : null}

                  {showViewersSection ? (
                    <SheetSection title="Connected people">
                      {sharingState.viewers.length === 0 ? (
                        <View style={{ gap: 12 }}>
                          <EmptyMessage
                            body="Approved people stay here."
                            title="No viewers yet"
                          />
                          {isProofScenario ? (
                            <View style={{ gap: 8 }}>
                              <PreviewNote>Preview</PreviewNote>
                              <ViewerRow viewer={previewViewerCard} />
                            </View>
                          ) : null}
                        </View>
                      ) : (
                        sharingState.viewers.map((viewer) => <ViewerRow key={viewer.membershipId} viewer={viewer} />)
                      )}
                    </SheetSection>
                  ) : null}
                </>
              ) : null}

              {activeSheet === "boards" ? (
                <View style={{ gap: 14 }}>
                  {!shouldHoldSharedBoardsEmptyState && !showSharedBoardsErrorCard && sharedBoards.length === 0 ? (
                    <EmptyMessage
                      body="Approved boards will appear here."
                      title="No shared boards yet"
                    />
                  ) : null}

                  {shouldHoldSharedBoardsEmptyState ? (
                    <GlassCard style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 18, paddingVertical: 18 }}>
                      <ActivityIndicator color={theme.colors.accentAmber} />
                      <BodyCopy>Loading shared boards…</BodyCopy>
                    </GlassCard>
                  ) : null}

                  {showSharedBoardsErrorCard ? (
                    <GlassCard style={{ paddingHorizontal: 18, paddingVertical: 18 }}>
                      <BodyCopy tone="error">{formatFriendsError(sharedBoardsError, "We couldn't load the shared boards.")}</BodyCopy>
                    </GlassCard>
                  ) : null}

                  {showSharedBoardsErrorBanner ? (
                    <GlassCard style={{ paddingHorizontal: 18, paddingVertical: 18 }}>
                      <BodyCopy tone="error">
                        {formatFriendsError(sharedBoardsError, "We couldn't refresh every shared board right now.")}
                      </BodyCopy>
                    </GlassCard>
                  ) : null}

                  {!shouldHoldSharedBoardsEmptyState && sharedBoards.length > 0
                    ? orderedBoards.map((board) => <SharedBoardCard key={board.id} board={board} width={boardCardWidth} />)
                    : null}
                </View>
              ) : null}
              </ScrollView>
            </GlassCard>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}
