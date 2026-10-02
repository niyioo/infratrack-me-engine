import axios from "axios";

export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | { detail?: string | string[] }
      | Record<string, string[] | string>
      | undefined;

    if (responseData && typeof responseData === "object" && "detail" in responseData && responseData.detail) {
      return Array.isArray(responseData.detail) ? responseData.detail[0] || fallback : responseData.detail;
    }

    if (responseData && typeof responseData === "object") {
      const firstFieldError = Object.values(responseData)[0];

      if (Array.isArray(firstFieldError) && firstFieldError[0]) {
        return firstFieldError[0];
      }

      if (typeof firstFieldError === "string") {
        return firstFieldError;
      }
    }
  }

  return fallback;
}
