import { apiClient } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import type {
  Agency,
  Contractor,
  CreateAgencyPayload,
  CreateContractorPayload,
  OrganizationDirectoryFilters,
  UpdateAgencyPayload,
  UpdateContractorPayload
} from "./types";

export async function fetchAgencies(params?: OrganizationDirectoryFilters) {
  const { data } = await apiClient.get<Agency[]>(endpoints.agencies, {
    params,
  });
  return data;
}

export async function fetchContractors(params?: OrganizationDirectoryFilters) {
  const { data } = await apiClient.get<Contractor[]>(endpoints.contractors, {
    params,
  });
  return data;
}

export async function createAgency(payload: CreateAgencyPayload) {
  const { data } = await apiClient.post<Agency>(endpoints.agencies, payload);
  return data;
}

export async function updateAgency(agencyId: number, payload: UpdateAgencyPayload) {
  const { data } = await apiClient.patch<Agency>(`${endpoints.agencies}${agencyId}/`, payload);
  return data;
}

export async function deleteAgency(agencyId: number) {
  await apiClient.delete(`${endpoints.agencies}${agencyId}/`);
}

export async function createContractor(payload: CreateContractorPayload) {
  const { data } = await apiClient.post<Contractor>(endpoints.contractors, payload);
  return data;
}

export async function updateContractor(contractorId: number, payload: UpdateContractorPayload) {
  const { data } = await apiClient.patch<Contractor>(`${endpoints.contractors}${contractorId}/`, payload);
  return data;
}

export async function deleteContractor(contractorId: number) {
  await apiClient.delete(`${endpoints.contractors}${contractorId}/`);
}
