export type CaptureDraft = {
  idempotencyKey: string;
  uri: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
  siteAddress?: string | null;
  accuracyMeters?: number | null;
  projectId?: number;
  milestoneId?: number;
  siteLat?: number | null;
  siteLng?: number | null;
  radiusMeters?: number | null;
};

let currentDraft: CaptureDraft | null = null;

export function setCaptureDraft(draft: CaptureDraft | null) {
  currentDraft = draft;
}

export function getCaptureDraft() {
  return currentDraft;
}

export function clearCaptureDraft() {
  currentDraft = null;
}
