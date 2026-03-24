export function latLng(value?: number | null) {
  return typeof value === "number" ? value : 0;
}