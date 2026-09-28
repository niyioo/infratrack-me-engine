import { useState } from "react";
import { Pressable, Text, StyleSheet, View, ActivityIndicator } from "react-native";
import { colors, radius, typography } from "@/lib/theme/tokens";

export function AppButton(props: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  /** "accent" is for dark (brand/ink) backgrounds, where "primary" would blend in. */
  variant?: "primary" | "accent" | "secondary" | "ghost";
  loading?: boolean;
}) {
  const variant = props.variant ?? "primary";
  const isPrimary = variant === "primary" || variant === "accent";
  const isGhost = variant === "ghost";
  const [pressed, setPressed] = useState(false);

  // A plain style array (not Pressable's style callback): NativeWind's css-interop
  // wraps Pressable and drops function styles, which left every button with no
  // background (just text).
  return (
    <Pressable
      onPress={props.onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      disabled={props.disabled || props.loading}
      style={[
        styles.base,
        variant === "accent" ? styles.accent : isPrimary ? styles.primary : isGhost ? styles.ghost : styles.secondary,
        (props.disabled || props.loading) && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.content}>
        {props.loading ? <ActivityIndicator size="small" color={isPrimary ? colors.white : colors.ink} /> : null}
        <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>
          {props.title}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: radius.md,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: colors.brand,
  },
  accent: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  disabled: {
    opacity: 0.6,
  },
  pressed: {
    opacity: 0.9,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  label: {
    ...typography.body,
    fontWeight: "700",
    textAlign: "center",
  },
  labelPrimary: {
    color: colors.white,
  },
  labelSecondary: {
    color: colors.ink,
  },
});
