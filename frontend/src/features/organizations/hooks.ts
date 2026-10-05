import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAgency,
  createContractor,
  deleteAgency,
  deleteContractor,
  fetchAgencies,
  fetchContractors,
  updateAgency,
  updateContractor
} from "./api";
import type { OrganizationDirectoryFilters } from "./types";

export function useAgencies(params: OrganizationDirectoryFilters = { is_active: true }) {
  return useQuery({
    queryKey: ["agencies", params],
    queryFn: () => fetchAgencies(params),
  });
}

export function useContractors(params: OrganizationDirectoryFilters = { is_active: true }) {
  return useQuery({
    queryKey: ["contractors", params],
    queryFn: () => fetchContractors(params),
  });
}

export function useCreateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAgency,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    }
  });
}

export function useUpdateAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ agencyId, payload }: { agencyId: number; payload: Parameters<typeof updateAgency>[1] }) =>
      updateAgency(agencyId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    }
  });
}

export function useDeleteAgency() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (agencyId: number) => deleteAgency(agencyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agencies"] });
    }
  });
}

export function useCreateContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createContractor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
    }
  });
}

export function useUpdateContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ contractorId, payload }: { contractorId: number; payload: Parameters<typeof updateContractor>[1] }) =>
      updateContractor(contractorId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
    }
  });
}

export function useDeleteContractor() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (contractorId: number) => deleteContractor(contractorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contractors"] });
    }
  });
}
