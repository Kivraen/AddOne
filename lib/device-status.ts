export function formatBoardVerifiedLabel(lastSnapshotAt: string | null) {
  if (!lastSnapshotAt) {
    return "Waiting for first device snapshot";
  }

  const diffMs = Date.now() - new Date(lastSnapshotAt).getTime();
  const diffMinutes = Math.max(0, Math.round(diffMs / 60000));

  if (diffMinutes <= 1) {
    return "Board verified moments ago";
  }

  if (diffMinutes < 60) {
    return `Board verified ${diffMinutes}m ago`;
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `Board verified ${diffHours}h ago`;
  }

  const diffDays = Math.round(diffHours / 24);
  return `Board verified ${diffDays}d ago`;
}
