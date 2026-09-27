import { getOfflineQueue, updateOfflineQueueItem } from "@/services/storage/offlineStorage";
import { isOnline } from "@/services/network/networkService";
import type { OfflineEvidenceItem } from "@/features/evidence/types";

function toErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Upload failed. Review the item and retry when the device is stable.";
}

export async function syncOfflineQueueItem(
  item: OfflineEvidenceItem,
  syncHandler: (item: OfflineEvidenceItem) => Promise<void>
) {
  await updateOfflineQueueItem(item.localId, {
    syncStatus: "SYNCING",
    lastAttemptAt: new Date().toISOString(),
    lastError: undefined,
  });

  try {
    await syncHandler(item);

    await updateOfflineQueueItem(item.localId, {
      syncStatus: "SYNCED",
      lastSyncedAt: new Date().toISOString(),
      lastError: undefined,
    });
  } catch (error) {
    await updateOfflineQueueItem(item.localId, {
      syncStatus: "FAILED",
      retryCount: item.retryCount + 1,
      lastAttemptAt: new Date().toISOString(),
      lastError: toErrorMessage(error),
    });
    throw error;
  }
}

export async function runOfflineSync(syncHandler: (item: any) => Promise<void>) {
  const online = await isOnline();
  if (!online) return;

  const queue = await getOfflineQueue();

  for (const item of queue.filter((q) => q.syncStatus === "PENDING" || q.syncStatus === "FAILED")) {
    try {
      await syncOfflineQueueItem(item, syncHandler);
    } catch {
      continue;
    }
  }
}

export async function retryOfflineQueueItem(
  localId: string,
  syncHandler: (item: OfflineEvidenceItem) => Promise<void>
) {
  const online = await isOnline();
  if (!online) {
    throw new Error("Device is offline. Reconnect before retrying queued evidence.");
  }

  const queue = await getOfflineQueue();
  const item = queue.find((queuedItem) => queuedItem.localId === localId);
  if (!item) {
    throw new Error("Queued evidence item could not be found.");
  }

  await syncOfflineQueueItem(item, syncHandler);
}
