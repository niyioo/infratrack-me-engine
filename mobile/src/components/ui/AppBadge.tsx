import { View, Text, StyleSheet } from "react-native";

const TONE: Record<string, { bg: string; text: string }> = {
  success: { bg: "#ECFDF5", text: "#065F46" },
  warning: { bg: "#FFFBEB", text: "#92400E" },
  error:   { bg: "#FEF2F2", text: "#991B1B" },
  info:    { bg: "#EFF6FF", text: "#1D4ED8" },
};

export function AppBadge(props: {
  label: string;
  tone?: "info" | "success" | "warning" | "error";
}) {
  const t = TONE[props.tone ?? "info"];
  return (
    <View style={[styles.badge, { backgroundColor: t.bg }]}>
      <Text style={[styles.label, { color: t.text }]}>{props.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  label: { fontSize: 12, fontWeight: "600" },
});
