import { useQuery } from "@tanstack/react-query";
import { getStoredUser } from "./storage";

export function useStoredUser() {
  return useQuery({
    queryKey: ["mobile-auth-user"],
    queryFn: getStoredUser
  });
}