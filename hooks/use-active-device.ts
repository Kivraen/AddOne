import { useAddOneStore } from "@/store/addone-store";

export function useActiveDevice() {
  return useAddOneStore((state) => state.activeDevice());
}
