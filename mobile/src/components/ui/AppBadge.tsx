import { View, Text, StyleSheet } from "react-native";
import { colors, radius, typography } from "@/lib/theme/tokens";

const TONE: Record<string, { bg: string; text: string }> = {
  success: { bg: colors.successSoft, text: colors.success },
  warning: { bg: colors.warningSoft, text: colors.warning },
  error: { bg: colors.dangerSoft, text: colors.danger },
  info: { bg: colors.infoSoft, text: colors.info },
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
  badge: {
    alignSelf: "flex-start",
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  label: {
    ...typography.caption,
    fontWeight: "700",
  },
});
