import { View, ActivityIndicator, Text, StyleSheet } from "react-native";
import { colors, typography } from "@/lib/theme/tokens";

export function AppLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color={colors.brand} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.slate100,
  },
  label: {
    marginTop: 12,
    ...typography.body,
    color: colors.slate500,
  },
});
