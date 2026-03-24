export function toNumber(value: string | number | null | undefined) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}