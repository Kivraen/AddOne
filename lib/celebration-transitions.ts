import { CelebrationTransitionSpeed, CelebrationTransitionStyle } from "@/types/addone";

export interface CelebrationTransitionOption {
  description: string;
  id: CelebrationTransitionStyle;
  label: string;
}

export interface CelebrationTransitionSpeedOption {
  description: string;
  id: CelebrationTransitionSpeed;
  label: string;
}

export interface CelebrationDwellOption {
  label: string;
  seconds: number;
}

export const DEFAULT_CELEBRATION_TRANSITION: CelebrationTransitionStyle = "column_wipe";
export const DEFAULT_CELEBRATION_TRANSITION_SPEED: CelebrationTransitionSpeed = "balanced";
export const DEFAULT_CELEBRATION_DWELL_SECONDS = 15;

export const CELEBRATION_TRANSITION_OPTIONS: CelebrationTransitionOption[] = [
  {
    id: "column_wipe",
    label: "Blade sweep",
    description: "A clean left-to-right wipe with a sharp blackout edge.",
  },
  {
    id: "reverse_wipe",
    label: "Counter sweep",
    description: "The same hard wipe, but entering from the opposite side.",
  },
  {
    id: "center_split",
    label: "Center bloom",
    description: "The new board opens from the center and pushes outward.",
  },
  {
    id: "top_drop",
    label: "Skyfall",
    description: "Rows fall in from the top, then clear upward on return.",
  },
  {
    id: "diagonal_wave",
    label: "Diagonal rush",
    description: "A fast corner-to-corner sweep across the full board.",
  },
  {
    id: "constellation",
    label: "Constellation fade",
    description: "A softer scattered reveal for a less rigid handoff.",
  },
];

export const CELEBRATION_TRANSITION_SPEED_OPTIONS: CelebrationTransitionSpeedOption[] = [
  {
    id: "fast",
    label: "Fast",
    description: "A sharper handoff with less time spent in transition.",
  },
  {
    id: "balanced",
    label: "Balanced",
    description: "A cleaner cinematic pace without dragging the board.",
  },
  {
    id: "slow",
    label: "Slow",
    description: "A more deliberate reveal when you want it to breathe.",
  },
];

export const CELEBRATION_DWELL_OPTIONS: CelebrationDwellOption[] = [
  { seconds: 3, label: "3s" },
  { seconds: 5, label: "5s" },
  { seconds: 8, label: "8s" },
  { seconds: 12, label: "12s" },
  { seconds: 15, label: "15s" },
];

export function getCelebrationTransitionOption(transition: CelebrationTransitionStyle) {
  return (
    CELEBRATION_TRANSITION_OPTIONS.find((option) => option.id === transition) ??
    CELEBRATION_TRANSITION_OPTIONS[0]
  );
}

export function getCelebrationTransitionSpeedOption(speed: CelebrationTransitionSpeed) {
  return (
    CELEBRATION_TRANSITION_SPEED_OPTIONS.find((option) => option.id === speed) ??
    CELEBRATION_TRANSITION_SPEED_OPTIONS[1]
  );
}
