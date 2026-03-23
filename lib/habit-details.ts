export const DEFAULT_HABIT_NAME = "Main habit";
export const DEFAULT_MINIMUM_GOAL = "Do the smallest version that still counts.";
export const DEFAULT_WEEKLY_TARGET = 3;
export const HABIT_NAME_MAX_LENGTH = 20;
export const MINIMUM_GOAL_MAX_LENGTH = 48;
export const MINIMUM_GOAL_PLACEHOLDER = DEFAULT_MINIMUM_GOAL;

function normalized(value?: string | null) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

export function resolveHabitNameDraft(value?: string | null) {
  const trimmed = normalized(value);
  if (!trimmed || trimmed.toLowerCase() === "addone") {
    return DEFAULT_HABIT_NAME;
  }

  return trimmed;
}

export function normalizeHabitNameForSave(value?: string | null) {
  const trimmed = normalized(value);
  return trimmed || DEFAULT_HABIT_NAME;
}

export function normalizeMinimumGoalForSave(value?: string | null) {
  return normalized(value);
}

export function resolveMinimumGoalDraft(value?: string | null) {
  const trimmed = normalizeMinimumGoalForSave(value);
  return trimmed || DEFAULT_MINIMUM_GOAL;
}

export function homeMinimumGoalLabel(value?: string | null) {
  const trimmed = normalizeMinimumGoalForSave(value);
  return trimmed ? `Minimum: ${trimmed}` : null;
}
