import { useMutation } from "@tanstack/react-query";
import { runOfflineSync } from "./service";

export function useRunOfflineSync() {
  return useMutation({
    mutationFn: runOfflineSync
  });
}