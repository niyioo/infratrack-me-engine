import AsyncStorage from "@react-native-async-storage/async-storage";
import type { OfflineEvidenceItem } from "@/features/evidence/types";

const OFFLINE_QUEUE_KEY = "buildwitness_offline_evidence_queue";
// Key used before the app was renamed. Unsynced evidence saved under it must
// survive the update, so it's moved across on first read.
const LEGACY_OFFLINE_QUEUE_KEY = "infratrack_offline_evidence_queue";

async function readQueue() {
  const raw = await AsyncStorage.getItem(OFFLINE_QUEUE_KEY);
  if (raw != null) return raw;
  const legacy = await AsyncStorage.getItem(LEGACY_OFFLINE_QUEUE_KEY);
  if (legacy != null) {
    await AsyncStorage.setItem(OFFLINE_QUEUE_KEY, legacy);
    await AsyncStorage.removeItem(LEGACY_OFFLINE_QUEUE_KEY);
  }
  return legacy;
}

export async function getOfflineQueue(): Promise<OfflineEvidenceItem[]> {
  const raw = await readQueue();
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
