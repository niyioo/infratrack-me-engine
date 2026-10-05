import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";
import type { OfflineEvidenceItem } from "./types";

export async function submitEvidence(formData: FormData) {
  const { data } = await apiClient.post(endpoints.evidenceSubmissions, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return data;
}

export async function submitQueuedEvidenceItem(item: OfflineEvidenceItem) {
  const formData = new FormData();
  const metadataEntries = Object.entries(item.metadata ?? {});

  for (const [key, value] of metadataEntries) {
    if (value !== undefined && value !== null) {
      formData.append(key, String(value));
    }
  }

  formData.append("files", {
    uri: item.fileUri,
    name: item.fileUri.split("/").pop() || `evidence-${item.localId}.jpg`,
    type: "image/jpeg",
  } as any);

  return submitEvidence(formData);
}
