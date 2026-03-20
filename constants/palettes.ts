import { BoardPalette } from "@/types/addone";

export const boardPalettes: BoardPalette[] = [
  {
    id: "classic",
    name: "Classic",
    dayOn: "#FFFFFF",
    weekSuccess: "#4DFF00",
    weekFail: "#FF2D00",
    socket: "#090909",
    socketEdge: "#121212",
    rewardPrimary: "#C7904A",
    rewardSecondary: "#F5F1E8",
  },
  {
    id: "amber",
    name: "Amber",
    dayOn: "#FFD23F",
    weekSuccess: "#FFB300",
    weekFail: "#FF5A1F",
    socket: "#0B0907",
    socketEdge: "#15110D",
    rewardPrimary: "#E3A95D",
    rewardSecondary: "#F8E5BE",
  },
  {
    id: "ice",
    name: "Ice",
    dayOn: "#EAF9FF",
    weekSuccess: "#38D6FF",
    weekFail: "#3F63FF",
    socket: "#090C0F",
    socketEdge: "#14191E",
    rewardPrimary: "#A7D9E8",
    rewardSecondary: "#E8F7FD",
  },
  {
    id: "rose",
    name: "Geek",
    dayOn: "#7DFF00",
    weekSuccess: "#39FF14",
    weekFail: "#FF2D00",
    socket: "#080C08",
    socketEdge: "#111711",
    rewardPrimary: "#6AF05A",
    rewardSecondary: "#D8FFC8",
  },
];

export const paletteById = Object.fromEntries(boardPalettes.map((palette) => [palette.id, palette]));
