import type { AxiosResponse } from "axios";

/** Filename from a Content-Disposition header, or the fallback. */
function filenameFrom(response: AxiosResponse<Blob>, fallback: string) {
  const header = String(response.headers["content-disposition"] ?? "");
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1]) : fallback;
}

/** Save a blob response as a file in the browser. */
export function saveBlobResponse(response: AxiosResponse<Blob>, fallbackName: string) {
  const url = URL.createObjectURL(response.data);
  const link = document.createElement("a");
  link.href = url;
  link.download = filenameFrom(response, fallbackName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before freeing the blob.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
