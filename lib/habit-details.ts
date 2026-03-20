export const DEFAULT_HABIT_NAME = "Habit Name";
export const HABIT_NAME_MAX_LENGTH = 20;
export const MINIMUM_GOAL_MAX_LENGTH = 48;
export const MINIMUM_GOAL_PLACEHOLDER = "What's the minimum goal for a day?";

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

export function homeMinimumGoalLabel(value?: string | null) {
  const trimmed = normalizeMinimumGoalForSave(value);
  return trimmed ? `Minimum: ${trimmed}` : null;
}
