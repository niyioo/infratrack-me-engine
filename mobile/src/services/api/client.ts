import axios from "axios";
import { endpoints } from "./endpoints";
import { getAccessToken } from "@/features/auth/storage";

export const apiClient = axios.create({
  baseURL: endpoints.baseUrl,
  timeout: 30000
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  
  // ADD THIS LINE JUST FOR DEBUGGING:
  console.log(`[API] Outgoing Request to: ${config.url} | Token Attached: ${token ? 'YES' : 'NO'}`);
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});