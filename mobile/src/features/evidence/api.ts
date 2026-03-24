import { apiClient } from "@/services/api/client";
import { endpoints } from "@/services/api/endpoints";

export async function submitEvidence(formData: FormData) {
  const { data } = await apiClient.post(endpoints.evidenceSubmissions, formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return data;
}