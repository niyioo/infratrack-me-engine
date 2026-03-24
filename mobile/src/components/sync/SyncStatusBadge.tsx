import { View, Text, StyleSheet } from "react-native";

const CONFIG: Record<string, { bg: string; text: string }> = {
  SYNCED:  { bg: "#ECFDF5", text: "#065F46" },
  FAILED:  { bg: "#FEF2F2", text: "#991B1B" },
  SYNCING: { bg: "#EFF6FF", text: "#1D4ED8" },
  PENDING: { bg: "#FFFBEB", text: "#92400E" },
};

export function SyncStatusBadge({
  status,
}: {
  status: "PENDING" | "SYNCING" | "FAILED" | "SYNCED";
}) {
  const c = CONFIG[status] ?? CONFIG.PENDING;

  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.label, { color: c.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
});
