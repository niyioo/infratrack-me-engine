import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppAlert } from "@/components/ui/AppAlert";
import { AppButton } from "@/components/ui/AppButton";
import { citizenErrorMessage, trackCitizenReport, type ReportStatus } from "@/features/citizen/api";
import { colors, radius, spacing, typography } from "@/lib/theme/tokens";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function CitizenTrackScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ code?: string }>();
  const [code, setCode] = useState(params.code ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<ReportStatus | null>(null);

  const lookUp = useCallback(async (value: string) => {
    if (!value.trim()) return;
    setLoading(true);
    setError("");
    setReport(null);
    try {
      setReport(await trackCitizenReport(value));
    } catch (err) {
      setError(citizenErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  // Arriving from a just-sent report: show its status straight away.
  useEffect(() => {
    if (params.code) lookUp(params.code);
  }, [params.code, lookUp]);

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backRow} accessibilityRole="button">
          <Ionicons name="chevron-back" size={20} color={colors.white} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Track a report</Text>
        <Text style={styles.headerSub}>Enter the tracking code you got when you sent your report.</Text>
      </View>

      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing["3xl"] }]} keyboardShouldPersistTaps="handled">
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="Tracking code"
          placeholderTextColor={colors.slate400}
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => lookUp(code)}
          style={styles.codeInput}
        />
        <AppButton title="Check status" onPress={() => lookUp(code)} loading={loading} disabled={!code.trim()} />

        {error ? <AppAlert tone="error" message={error} /> : null}

        {report ? (
          <View style={styles.card}>
            <Text style={styles.eyebrow}>{report.tracking_code}</Text>
            <Text style={styles.status}>{report.status_label}</Text>
            <View style={styles.row}>
              <Ionicons name="business-outline" size={16} color={colors.slate500} />
              <Text style={styles.rowText}>{report.project_title}</Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="pricetag-outline" size={16} color={colors.slate500} />
              <Text style={styles.rowText}>{report.category_label}</Text>
            </View>
            <View style={styles.row}>
              <Ionicons name="time-outline" size={16} color={colors.slate500} />
              <Text style={styles.rowText}>
                Sent {formatDate(report.created_at)} · Updated {formatDate(report.updated_at)}
              </Text>
            </View>
            {report.public_response ? (
              <View style={styles.response}>
                <Text style={styles.responseLabel}>Response from the monitoring team</Text>
                <Text style={styles.responseText}>{report.public_response}</Text>
              </View>
            ) : (
              <Text style={styles.note}>The monitoring team hasn't added a public response yet.</Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate100 },
  header: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    gap: spacing.sm,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.xs },
  backText: { ...typography.body, color: colors.white, fontWeight: "600" },
  headerTitle: { ...typography.title, color: colors.white },
  headerSub: { ...typography.body, color: colors.slate400 },
  body: { padding: spacing.lg, gap: spacing.md },
  codeInput: {
    minHeight: 56,
    paddingHorizontal: 16,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 3,
    color: colors.ink,
    textAlign: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate300,
    backgroundColor: colors.white,
  },
  card: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  eyebrow: { ...typography.eyebrow, color: colors.slate500 },
  status: { fontSize: 22, fontWeight: "800", color: colors.ink, marginBottom: spacing.xs },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  rowText: { flex: 1, ...typography.body, color: colors.slate700 },
  response: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accentSoft },
  responseLabel: { ...typography.caption, color: colors.accentStrong, fontWeight: "700", marginBottom: 4 },
  responseText: { ...typography.body, color: colors.ink },
  note: { ...typography.caption, color: colors.slate500, marginTop: spacing.sm },
});
