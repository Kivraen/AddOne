function normalizeText(value, fallback = null) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function normalizeInteger(value) {
  const normalized = Number(value);
  return Number.isInteger(normalized) ? normalized : null;
}

export function parseFriendCelebrationReadyEvent(payload) {
  const body = JSON.parse(payload);
  const deviceAuthToken = normalizeText(body?.device_auth_token);
  const sourceLocalDate = normalizeText(body?.source_local_date);
  const currentWeekStart = normalizeText(body?.current_week_start);
  const palettePreset = normalizeText(body?.palette_preset, "classic");
  const emittedAt = normalizeText(body?.emitted_at);
  const todayRow = normalizeInteger(body?.today_row);
  const weeklyTarget = normalizeInteger(body?.weekly_target);
  const boardDays = body?.board_days;
  const paletteCustom =
    body?.palette_custom && typeof body.palette_custom === "object" && !Array.isArray(body.palette_custom)
      ? body.palette_custom
      : {};

  if (!deviceAuthToken || !sourceLocalDate || !currentWeekStart || !Array.isArray(boardDays)) {
    return null;
  }

  if (todayRow === null || todayRow < 0 || todayRow > 6) {
    return null;
  }

  if (weeklyTarget === null || weeklyTarget < 1 || weeklyTarget > 7) {
    return null;
  }

  return {
    boardDays,
    currentWeekStart,
    deviceAuthToken,
    emittedAt,
    paletteCustom,
    palettePreset,
    sourceLocalDate,
    todayRow,
    weeklyTarget,
  };
}
