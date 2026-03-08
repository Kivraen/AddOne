import { BoardPalette } from "@/types/addone";

export const boardPalettes: BoardPalette[] = [
  {
    id: "classic",
    name: "Classic",
    dayOn: "#F5F1E8",
    weekSuccess: "#8FD36A",
    weekFail: "#A55449",
    socket: "#141414",
    socketEdge: "#1F1F1F",
    rewardPrimary: "#C7904A",
    rewardSecondary: "#F5F1E8",
  },
  {
    id: "amber",
    name: "Amber",
    dayOn: "#F6D39A",
    weekSuccess: "#D8B06B",
    weekFail: "#8F4E46",
    socket: "#15110D",
    socketEdge: "#261E17",
    rewardPrimary: "#E3A95D",
    rewardSecondary: "#F8E5BE",
  },
  {
    id: "ice",
    name: "Ice",
    dayOn: "#D9EEF5",
    weekSuccess: "#78C7D8",
    weekFail: "#5E7088",
    socket: "#11161A",
    socketEdge: "#1D252C",
    rewardPrimary: "#A7D9E8",
    rewardSecondary: "#E8F7FD",
  },
  {
    id: "rose",
    name: "Rose",
    dayOn: "#F3D7D8",
    weekSuccess: "#D8A1A4",
    weekFail: "#A55449",
    socket: "#171112",
    socketEdge: "#261B1E",
    rewardPrimary: "#E4A4AE",
    rewardSecondary: "#F8E6E8",
  },
];

export const paletteById = Object.fromEntries(boardPalettes.map((palette) => [palette.id, palette]));
