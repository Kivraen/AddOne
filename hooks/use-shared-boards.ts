import { useAddOneStore } from "@/store/addone-store";

export function useSharedBoards() {
  return useAddOneStore((state) => state.sharedBoards);
}
