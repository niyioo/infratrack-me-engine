import { Pressable, Text, StyleSheet, View, ActivityIndicator } from "react-native";
import { colors, radius, typography } from "@/lib/theme/tokens";

export function AppButton(props: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
}) {
  const isPrimary = (props.variant ?? "primary") === "primary";
  const isGhost = props.variant === "ghost";

  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled || props.loading}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : isGhost ? styles.ghost : styles.secondary,
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
