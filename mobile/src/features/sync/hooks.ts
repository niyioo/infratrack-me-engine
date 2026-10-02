import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { retryOfflineQueueItem, runOfflineSync } from "./service";
import { getOfflineQueue } from "@/services/storage/offlineStorage";

export function useRunOfflineSync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: runOfflineSync,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-offline-queue"] });
    },
  });
}

export function useRetryOfflineQueueItem() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      localId,
      syncHandler,
    }: {
      localId: string;
      syncHandler: (item: any) => Promise<void>;
    }) => retryOfflineQueueItem(localId, syncHandler),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mobile-offline-queue"] });
    },
  });
}

export function useOfflineQueue() {
  return useQuery({
    queryKey: ["mobile-offline-queue"],
    queryFn: getOfflineQueue,
  });
}

export function useOfflineQueueSummary() {
  const queueQuery = useOfflineQueue();
  const queue = queueQuery.data ?? [];

  return {
    ...queueQuery,
    pendingCount: queue.filter((item) => item.syncStatus === "PENDING").length,
    failedCount: queue.filter((item) => item.syncStatus === "FAILED").length,
    syncingCount: queue.filter((item) => item.syncStatus === "SYNCING").length,
    syncedCount: queue.filter((item) => item.syncStatus === "SYNCED").length,
  };
}
