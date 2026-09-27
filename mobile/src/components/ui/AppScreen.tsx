import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View, type ScrollViewProps, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "@/lib/theme/tokens";

export function AppScreen({
  children,
  scroll = false,
  contentContainerStyle,
  style,
  ...scrollProps
}: {
  children: ReactNode;
  scroll?: boolean;
  contentContainerStyle?: ScrollViewProps["contentContainerStyle"];
  style?: ViewStyle;
} & Omit<ScrollViewProps, "contentContainerStyle">) {
  return (
    <SafeAreaView style={[styles.safeArea, style]} edges={["top", "left", "right"]}>
      {scroll ? (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
          {...scrollProps}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.fill}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.slate100,
  },
  fill: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
});
