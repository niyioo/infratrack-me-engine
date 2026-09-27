import axios from "axios";
import { endpoints } from "./endpoints";
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from "@/features/auth/storage";

export const apiClient = axios.create({
  baseURL: endpoints.baseUrl,
  timeout: 30000,
});

apiClient.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const refreshToken = await getRefreshToken();

    if (error.response?.status === 401 && refreshToken && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post(endpoints.auth.refresh, {
          refresh: refreshToken,
        });

        const { access, refresh } = response.data;
        await setTokens(access, refresh ?? refreshToken);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return apiClient(originalRequest);
      } catch {
        await clearTokens();
      }
    }

    return Promise.reject(error);
  }
);
