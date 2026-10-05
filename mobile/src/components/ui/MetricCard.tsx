import { StyleSheet, Text, View } from "react-native";
import { AppBadge } from "./AppBadge";
import { colors, radius, shadows, typography } from "@/lib/theme/tokens";

export function MetricCard({
  label,
  value,
  tone = "info",
  helper,
}: {
  label: string;
  value: string | number;
  tone?: "info" | "success" | "warning" | "error";
  helper?: string;
}) {
  return (
    <View style={styles.card}>
      <AppBadge label={label} tone={tone} />
      <Text style={styles.value}>{value}</Text>
      {helper ? <Text style={styles.helper}>{helper}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
    padding: 18,
    gap: 12,
    ...shadows.soft,
  },
  value: {
    ...typography.metric,
    color: colors.ink,
  },
  helper: {
    ...typography.caption,
    color: colors.slate500,
    fontWeight: "500",
  },
});
