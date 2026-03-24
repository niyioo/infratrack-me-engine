import { View, ActivityIndicator, Text, StyleSheet } from "react-native";

export function AppLoader({ label = "Loading..." }: { label?: string }) {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator size="large" color="#2563EB" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  label: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
});
