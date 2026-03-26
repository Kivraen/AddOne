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
  {
    id: "bottom_rise",
    label: "Ground rise",
    description: "The next board climbs up from the floor.",
  },
  {
    id: "edge_close",
    label: "Curtain close",
    description: "Both outer edges sweep inward to land on the new board.",
  },
  {
    id: "reverse_diagonal",
    label: "Backslash",
    description: "A corner sweep on the opposite diagonal.",
  },
  {
    id: "matrix_rain",
    label: "Matrix rain",
    description: "Columns descend with a staggered digital-rain cadence.",
  },
  {
    id: "venetian",
    label: "Venetian",
    description: "Alternating columns reveal in slatted shutters.",
  },
  {
    id: "pulse_ring",
    label: "Pulse ring",
    description: "The board radiates from the center like a pulse.",
  },
  {
    id: "laser_scan",
    label: "Laser scan",
    description: "A bright scanline cuts across the board and burns in the next frame.",
  },
  {
    id: "spiral_collapse",
    label: "Spiral collapse",
    description: "The current board folds inward while the next frame spirals back out.",
  },
  {
    id: "glitch_overwrite",
    label: "Glitch overwrite",
    description: "Horizontal slices scramble, flicker, and snap into the new board.",
  },
  {
    id: "comet_overwrite",
    label: "Comet overwrite",
    description: "A bright moving head with a short tail paints the next board into place.",
  },
];

export const CELEBRATION_TRANSITION_SPEED_OPTIONS: CelebrationTransitionSpeedOption[] = [
  {
    id: "very_fast",
    label: "Even faster",
    description: "The quickest pass with almost no dwell inside the motion itself.",
  },
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
  {
    id: "even_slower",
    label: "Even slower",
    description: "A long dramatic handoff with a much heavier pause in the motion.",
  },
];

export const CELEBRATION_DWELL_OPTIONS: CelebrationDwellOption[] = [
  { seconds: 3, label: "3s" },
  { seconds: 5, label: "5s" },
  { seconds: 8, label: "8s" },
  { seconds: 12, label: "12s" },
  { seconds: 15, label: "15s" },
  { seconds: 30, label: "30s" },
  { seconds: 60, label: "60s" },
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

export function getCelebrationTransitionDurationMs(speed: CelebrationTransitionSpeed) {
  switch (speed) {
    case "very_fast":
      return 500;
    case "fast":
      return 1000;
    case "even_slower":
      return 12200;
    case "slow":
      return 4600;
    case "balanced":
    default:
      return 2000;
  }
}

export function getCelebrationPreviewPlaybackMs(speed: CelebrationTransitionSpeed, dwellSeconds: number) {
  const transitionMs = getCelebrationTransitionDurationMs(speed);
  return transitionMs + dwellSeconds * 1000 + transitionMs;
}
