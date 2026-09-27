import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Alert } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { CaptureReviewScreen } from "./CaptureReviewScreen";
import { addOfflineQueueItem } from "@/services/storage/offlineStorage";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useSubmitEvidence } from "@/features/evidence/hooks";
import { clearCaptureDraft, getCaptureDraft } from "@/features/evidence/captureDraft";
import { hashFileSha256 } from "@/features/evidence/hashing";
import { buildCaptureMetadata } from "@/services/integrity/metadataBuilder";

export function CaptureReviewRouteScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, roles } = useAuth();
  const { online } = useNetworkStatus();
  const submitMutation = useSubmitEvidence();
  const [isSavingOffline, setIsSavingOffline] = useState(false);
  const draft = useMemo(() => getCaptureDraft(), []);

  const sourceType = roles.includes("FIELD_OFFICER") ? "FIELD_OFFICER" : "CONTRACTOR";

  if (!draft) {
    return (
      <CaptureReviewScreen
        onSubmit={() => router.back()}
        onSaveOffline={() => router.back()}
      />
    );
  }

  const activeDraft = draft;

  async function buildFormData() {
    const metadata = buildCaptureMetadata({
      projectId: activeDraft.projectId ?? 0,
      milestoneId: activeDraft.milestoneId ?? 0,
      userId: user?.id ?? 0,
      sourceType,
      idempotencyKey: activeDraft.idempotencyKey,
      latitude: activeDraft.latitude,
      longitude: activeDraft.longitude,
      accuracyMeters: activeDraft.accuracyMeters,
      capturedAt: activeDraft.capturedAt,
    });

    const formData = new FormData();
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, String(value));
      }
    });
    formData.append("files", {
      uri: activeDraft.uri,
      name: activeDraft.uri.split("/").pop() || "evidence.jpg",
      type: "image/jpeg",
    } as any);
    return { formData, metadata };
  }

  async function handleSubmit() {
    if (!activeDraft.projectId || !activeDraft.milestoneId) {
      Alert.alert("Missing project context", "Open capture from a project so the submission can be linked correctly.");
      return;
    }

    try {
      const { formData } = await buildFormData();
      await submitMutation.mutateAsync(formData);
      clearCaptureDraft();
      queryClient.invalidateQueries({ queryKey: ["mobile-projects"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-offline-queue"] });
      queryClient.invalidateQueries({ queryKey: ["mobile-milestones"] });
      Alert.alert("Evidence submitted", "Your evidence has been uploaded successfully.");
      router.replace("/(main)/evidence");
    } catch {
      Alert.alert("Submission failed", "The evidence could not be uploaded. Save it to the offline queue and retry later.");
    }
  }

  async function handleSaveOffline() {
    if (!activeDraft.projectId || !activeDraft.milestoneId) {
      Alert.alert("Missing project context", "Open capture from a project so the offline item can be linked correctly.");
      return;
    }

    setIsSavingOffline(true);
    try {
      const { metadata } = await buildFormData();
      const fileHash = await hashFileSha256(activeDraft.uri);
      await addOfflineQueueItem({
        localId: `${Date.now()}`,
        projectId: activeDraft.projectId,
        milestoneId: activeDraft.milestoneId,
        sourceType,
        fileUri: activeDraft.uri,
        metadata,
        fileHash,
        syncStatus: "PENDING",
        retryCount: 0,
        createdAt: new Date().toISOString(),
      });
      clearCaptureDraft();
      queryClient.invalidateQueries({ queryKey: ["mobile-offline-queue"] });
      Alert.alert("Saved offline", "The evidence has been queued for upload when the device is ready.");
      router.replace("/(main)/evidence");
    } finally {
      setIsSavingOffline(false);
    }
  }

  return (
    <CaptureReviewScreen
      uri={activeDraft.uri}
      capturedAt={activeDraft.capturedAt}
      siteAddress={activeDraft.siteAddress}
      latitude={activeDraft.latitude}
      longitude={activeDraft.longitude}
      onSubmit={handleSubmit}
      onSaveOffline={handleSaveOffline}
      submitting={submitMutation.isPending}
      savingOffline={isSavingOffline}
      networkLabel={online ? "Online and ready for immediate upload" : "Offline. Queue storage is recommended."}
      syncAdvice={
        online
          ? "Submitting will sync this evidence immediately. You can still save it to the queue if you want it reviewed later."
          : "The device is offline. Save this evidence to the offline queue so it can upload safely when connectivity returns."
      }
    />
  );
}
