export function formatCurrency(value: string | number, currency = "NGN") {
  const amount = typeof value === "string" ? Number(value) : value;
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDate(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}