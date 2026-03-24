import { View, Text, TextInput, TextInputProps, StyleSheet } from "react-native";

export function AppInput(props: TextInputProps & { label?: string }) {
  const { label, ...inputProps } = props;
  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        {...inputProps}
        style={styles.input}
        placeholderTextColor="#94A3B8"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: 8,
    fontSize: 14,
    fontWeight: "500",
    color: "#334155",
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#0F172A",
  },
});
