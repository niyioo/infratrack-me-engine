import axios from "axios";
import { setupInterceptors } from "./interceptors";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000
});

setupInterceptors(apiClient, API_BASE_URL);