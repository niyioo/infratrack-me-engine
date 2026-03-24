import { useMutation } from "@tanstack/react-query";
import { submitEvidence } from "./api";

export function useSubmitEvidence() {
  return useMutation({
    mutationFn: submitEvidence
  });
}