import { CelebrationTransitionStyle } from "@/types/addone";

export interface CelebrationTransitionOption {
  description: string;
  id: CelebrationTransitionStyle;
  label: string;
}

export const DEFAULT_CELEBRATION_TRANSITION: CelebrationTransitionStyle = "column_wipe";

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

export function getCelebrationTransitionOption(transition: CelebrationTransitionStyle) {
  return (
    CELEBRATION_TRANSITION_OPTIONS.find((option) => option.id === transition) ??
    CELEBRATION_TRANSITION_OPTIONS[0]
  );
}
