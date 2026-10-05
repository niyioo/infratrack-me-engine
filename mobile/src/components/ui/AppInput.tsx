import { ReactNode } from "react";
import { View, Text, TextInput, TextInputProps, StyleSheet } from "react-native";
import { colors, radius, typography } from "@/lib/theme/tokens";

export function AppInput(props: TextInputProps & { label?: string; hint?: string; error?: string; rightAccessory?: ReactNode }) {
  const { label, hint, error, rightAccessory, ...inputProps } = props;
  return (
    <View style={styles.wrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputShell, error ? styles.inputShellError : null]}>
        <TextInput
          {...inputProps}
          style={styles.input}
          placeholderTextColor={colors.slate400}
        />
        {rightAccessory ? <View style={styles.accessory}>{rightAccessory}</View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  label: {
    ...typography.caption,
    color: colors.inkMuted,
  },
  inputShell: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate300,
    backgroundColor: colors.white,
    paddingLeft: 16,
    paddingRight: 8,
    flexDirection: "row",
    alignItems: "center",
  },
  inputShellError: {
    borderColor: colors.danger,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 14,
    color: colors.ink,
  },
  accessory: {
    marginLeft: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  hint: {
    ...typography.caption,
    color: colors.slate500,
    fontWeight: "500",
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
