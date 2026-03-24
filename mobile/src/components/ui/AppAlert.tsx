import { View, Text, StyleSheet } from "react-native";

const TONE: Record<string, { border: string; bg: string }> = {
  success: { border: "#6EE7B7", bg: "#ECFDF5" },
  warning: { border: "#FDE68A", bg: "#FFFBEB" },
  error:   { border: "#FECACA", bg: "#FEF2F2" },
  info:    { border: "#BFDBFE", bg: "#EFF6FF" },
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
  wrap:    { borderRadius: 12, borderWidth: 1, padding: 14 },
  title:   { fontSize: 14, fontWeight: "700", color: "#0F172A", marginBottom: 4 },
  message: { fontSize: 13, color: "#475569", lineHeight: 18 },
});
