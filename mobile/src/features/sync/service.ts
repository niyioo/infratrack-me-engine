import { getOfflineQueue, updateOfflineQueueItem } from "@/services/storage/offlineStorage";
import { isOnline } from "@/services/network/networkService";

export async function runOfflineSync(syncHandler: (item: any) => Promise<void>) {
  const online = await isOnline();
  if (!online) return;

  const queue = await getOfflineQueue();

  for (const item of queue.filter((q) => q.syncStatus === "PENDING" || q.syncStatus === "FAILED")) {
    try {
      await updateOfflineQueueItem(item.localId, {
        syncStatus: "SYNCING",
        lastAttemptAt: new Date().toISOString()
      });

      await syncHandler(item);

      await updateOfflineQueueItem(item.localId, {
        syncStatus: "SYNCED"
      });
    } catch {
      await updateOfflineQueueItem(item.localId, {
        syncStatus: "FAILED",
        retryCount: item.retryCount + 1,
        lastAttemptAt: new Date().toISOString()
      });
    }
  }
}