import { BoardPalette } from "@/types/addone";

export const boardPalettes: BoardPalette[] = [
  {
    id: "classic",
    name: "Classic",
    dayOn: "#F5F1E8",
    weekSuccess: "#8FD36A",
    weekFail: "#A55449",
    socket: "#090909",
    socketEdge: "#121212",
    rewardPrimary: "#C7904A",
    rewardSecondary: "#F5F1E8",
  },
  {
    id: "amber",
    name: "Amber",
    dayOn: "#F6D39A",
    weekSuccess: "#D8B06B",
    weekFail: "#8F4E46",
    socket: "#0B0907",
    socketEdge: "#15110D",
    rewardPrimary: "#E3A95D",
    rewardSecondary: "#F8E5BE",
  },
  {
    id: "ice",
    name: "Ice",
    dayOn: "#D9EEF5",
    weekSuccess: "#78C7D8",
    weekFail: "#5E7088",
    socket: "#090C0F",
    socketEdge: "#14191E",
    rewardPrimary: "#A7D9E8",
    rewardSecondary: "#E8F7FD",
  },
  {
    id: "rose",
    name: "Rose",
    dayOn: "#F3D7D8",
    weekSuccess: "#D8A1A4",
    weekFail: "#A55449",
    socket: "#0B0809",
    socketEdge: "#161012",
    rewardPrimary: "#E4A4AE",
    rewardSecondary: "#F8E6E8",
  },
];

export const paletteById = Object.fromEntries(boardPalettes.map((palette) => [palette.id, palette]));
