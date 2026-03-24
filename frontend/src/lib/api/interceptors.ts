import type { AxiosInstance } from "axios";
import axios from "axios";

export function setupInterceptors(client: AxiosInstance, baseURL: string) {
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;
      const refreshToken = localStorage.getItem("refresh_token");

      if (error.response?.status === 401 && refreshToken && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const response = await axios.post(`${baseURL}/auth/refresh/`, {
            refresh: refreshToken
          });

          localStorage.setItem("access_token", response.data.access);
          originalRequest.headers.Authorization = `Bearer ${response.data.access}`;
          return client(originalRequest);
        } catch {
          localStorage.removeItem("access_token");
          localStorage.removeItem("refresh_token");
          window.location.href = "/login";
        }
      }

      return Promise.reject(error);
    }
  );
}