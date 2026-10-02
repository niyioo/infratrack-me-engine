import { View, Text, StyleSheet } from "react-native";
import { colors, radius, typography } from "@/lib/theme/tokens";

const TONE: Record<string, { border: string; bg: string }> = {
  success: { border: "#6EE7B7", bg: colors.successSoft },
  warning: { border: "#FDE68A", bg: colors.warningSoft },
  error: { border: "#FECACA", bg: colors.dangerSoft },
  info: { border: "#BFDBFE", bg: colors.infoSoft },
};

export function AppAlert(props: {
  title?: string;
  message: string;
  tone?: "info" | "success" | "warning" | "error";
}) {
  const t = TONE[props.tone ?? "info"];
  return (
    <View style={[styles.wrap, { borderColor: t.border, backgroundColor: t.bg }]}>
      {props.title ? <Text style={styles.title}>{props.title}</Text> : null}
      <Text style={styles.message}>{props.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: radius.md, borderWidth: 1, padding: 14 },
  title: { ...typography.body, fontWeight: "700", color: colors.ink, marginBottom: 4 },
  message: { ...typography.caption, color: colors.slate600, lineHeight: 18 },
});
