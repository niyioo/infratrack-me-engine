import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OfflineEvidenceItem } from "@/features/evidence/types";

const OFFLINE_QUEUE_KEY = "infratrack_offline_evidence_queue";

export async function getOfflineQueue(): Promise<OfflineEvidenceItem[]> {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as OfflineEvidenceItem[];
  } catch {
    return [];
  }
}

export async function setOfflineQueue(items: OfflineEvidenceItem[]) {
  await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(items));
}

export async function addOfflineQueueItem(item: OfflineEvidenceItem) {
  const current = await getOfflineQueue();
  const existingIndex = current.findIndex(
    (queuedItem) =>
      queuedItem.projectId === item.projectId &&
      queuedItem.milestoneId === item.milestoneId &&
      queuedItem.fileHash &&
      queuedItem.fileHash === item.fileHash &&
      queuedItem.syncStatus !== "SYNCED"
  );

  if (existingIndex >= 0) {
    const updated = [...current];
    updated[existingIndex] = {
      ...updated[existingIndex],
      ...item,
      localId: updated[existingIndex].localId,
      syncStatus: "PENDING",
      retryCount: 0,
      lastError: undefined,
    };
    await setOfflineQueue(updated);
    return;
  }

  current.unshift(item);
  await setOfflineQueue(current);
}

export async function updateOfflineQueueItem(localId: string, partial: Partial<OfflineEvidenceItem>) {
  const current = await getOfflineQueue();
  const updated = current.map((item) =>
    item.localId === localId ? { ...item, ...partial } : item
  );
  await setOfflineQueue(updated);
}
