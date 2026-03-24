import { View, Text, StyleSheet } from "react-native";

export function AccuracyNotice({ accuracy }: { accuracy?: number | null }) {
  if (!accuracy) return null;

  const good = accuracy <= 20;
  const fair = accuracy <= 50;

  return (
    <View style={[styles.wrap, good ? styles.good : fair ? styles.fair : styles.poor]}>
      <Text style={[styles.text, good ? styles.textGood : fair ? styles.textFair : styles.textPoor]}>
        {good ? "🟢" : fair ? "🟡" : "🔴"} GPS accuracy: {Math.round(accuracy)}m
        {!good && accuracy > 50 ? " — move to open area" : ""}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  good:  { borderColor: "#6EE7B7", backgroundColor: "#ECFDF5" },
  fair:  { borderColor: "#FDE68A", backgroundColor: "#FFFBEB" },
  poor:  { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
  text: { fontSize: 12, fontWeight: "600" },
  textGood: { color: "#065F46" },
  textFair: { color: "#92400E" },
  textPoor: { color: "#991B1B" },
});
