import { ReactNode } from "react";
import { View, StyleSheet } from "react-native";
import { colors, radius, shadows } from "@/lib/theme/tokens";

export function AppCard({
  children,
  padded = true,
}: {
  children: ReactNode;
  padded?: boolean;
}) {
  return <View style={[styles.card, !padded && styles.unpadded]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.slate200,
    backgroundColor: colors.white,
    padding: 20,
    ...shadows.soft,
  },
  unpadded: {
    padding: 0,
  },
});
