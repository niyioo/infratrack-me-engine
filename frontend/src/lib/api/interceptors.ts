import type { AxiosInstance } from "axios";
import axios from "axios";
import { clearAuthStorage } from "@/features/auth/store";

export function setupInterceptors(client: AxiosInstance, baseURL: string) {
  client.interceptors.request.use((config) => {
    const token = window.localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const refreshToken = window.localStorage.getItem("refresh_token");

      if (error.response?.status === 401 && refreshToken && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const response = await axios.post(`${baseURL}/auth/refresh/`, {
            refresh: refreshToken
          });

          window.localStorage.setItem("access_token", response.data.access);
          window.dispatchEvent(new Event("buildwitness-auth-changed"));
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return client(originalRequest);
        } catch {
          clearAuthStorage();
        }
      }

      return Promise.reject(error);
    }
  );
}
