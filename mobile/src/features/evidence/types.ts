export type OfflineEvidenceItem = {
  localId: string;
  projectId: number;
  milestoneId: number;
  sourceType: string;
  fileUri: string;
  metadata: Record<string, unknown>;
  fileHash?: string;
  syncStatus: "PENDING" | "SYNCING" | "FAILED" | "SYNCED";
  retryCount: number;
  createdAt: string;
  lastAttemptAt?: string;
  lastSyncedAt?: string;
  lastError?: string;
};
