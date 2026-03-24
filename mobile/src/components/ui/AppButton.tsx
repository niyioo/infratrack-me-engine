import { Pressable, Text, StyleSheet } from "react-native";

export function AppButton(props: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const isPrimary = (props.variant ?? "primary") === "primary";

  return (
    <Pressable
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [
        styles.base,
        isPrimary ? styles.primary : styles.secondary,
        props.disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.label, isPrimary ? styles.labelPrimary : styles.labelSecondary]}>
        {props.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: {
    backgroundColor: "#0F172A",
  },
  secondary: {
    backgroundColor: "#E2E8F0",
  },
  disabled: {
    opacity: 0.5,
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  labelPrimary: {
    color: "#FFFFFF",
  },
  labelSecondary: {
    color: "#0F172A",
  },
});
