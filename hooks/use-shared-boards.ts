import { useSharedBoardsData } from "@/hooks/use-devices";

export function useSharedBoards() {
  return useSharedBoardsData().sharedBoards;
}
