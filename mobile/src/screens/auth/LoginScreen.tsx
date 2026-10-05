import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { AppAlert } from "@/components/ui/AppAlert";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";
import { ProveTrackBrand } from "@/components/brand/ProveTrackBrand";
import { colors, spacing, typography } from "@/lib/theme/tokens";
import { fetchCurrentUser, login } from "@/features/auth/api";
import { setStoredUser, setTokens } from "@/features/auth/storage";
import { endpoints } from "@/services/api/endpoints";
import axios from "axios";

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const emailError = email.length > 0 && !email.includes("@") ? "Enter a valid email address." : "";
  const passwordError = password.length > 0 && password.length < 8 ? "Password must be at least 8 characters." : "";

  async function handleLogin() {
    if (!email || !password || emailError || passwordError) {
      setError("Enter valid credentials to continue.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const tokens = await login({ email: email.trim(), password });
      await setTokens(tokens.access, tokens.refresh);
      const user = await fetchCurrentUser();
      await setStoredUser(user);
      router.replace("/(main)/dashboard");
    } catch (err) {
      // Tell the officer which problem it is: a field officer on poor signal needs
      // "can't reach the server", not a hint that their password may be wrong.
      const status = axios.isAxiosError(err) ? err.response?.status : undefined;
      if (status === 401 || status === 400) {
        setError("Incorrect email or password.");
      } else if (status === 429) {
        setError("Too many sign-in attempts. Wait a minute and try again.");
      } else if (axios.isAxiosError(err) && !err.response) {
        setError("Can't reach the ProveTrack server. Check your connection and try again.");
      } else {
        setError("Sign-in failed on the server. Please try again shortly.");
      }
      if (__DEV__) console.warn("Login failed:", status ?? (err as Error)?.message, endpoints.baseUrl);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 24 : 0}
    >
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { paddingTop: insets.top + spacing.xl }]}>
          <ProveTrackBrand size="lg" stacked light />
          <AppBadge label="Secure Access" tone="info" />
          <Text style={styles.heroSubtitle}>
            Field Intelligence & Accountability Platform. Track progress. Prove delivery.
          </Text>
        </View>

        <View style={styles.formWrap}>
          <AppCard>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Sign in</Text>
              <Text style={styles.formSubtitle}>Use your authorized ProveTrack account to continue.</Text>
            </View>

            <View style={styles.formFields}>
              <AppInput
                label="Email address"
                value={email}
                onChangeText={setEmail}
                placeholder="name@agency.gov"
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                error={emailError}
              />
              <AppInput
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password"
                secureTextEntry={!showPassword}
                autoComplete="password"
                textContentType="password"
                error={passwordError}
                rightAccessory={
                  <Pressable
                    onPress={() => setShowPassword((current) => !current)}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={showPassword ? "Hide password" : "Show password"}
                    style={styles.passwordToggle}
                  >
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={colors.slate500}
                    />
                  </Pressable>
                }
              />
            </View>

            {error ? <AppAlert tone="error" message={error} /> : null}

            <View style={styles.footerPanel}>
              <Text style={styles.footerPanelTitle}>Continue to Workspace</Text>
              <Text style={styles.footerPanelText}>
                Sign in to access project monitoring, field capture, and reporting tools.
              </Text>
              <AppButton title="Sign In Securely" variant="accent" onPress={handleLogin} loading={loading} />
              <Text style={styles.footerNote}>
                This session is protected with secure token storage and role-based access control.
              </Text>
            </View>
          </AppCard>

          {/* Citizens use the same app without an account. */}
          <View style={styles.citizenCard}>
            <View style={styles.citizenHeader}>
              <Ionicons name="megaphone-outline" size={20} color={colors.accentStrong} />
              <Text style={styles.citizenTitle}>Not a staff member?</Text>
            </View>
            <Text style={styles.citizenText}>
              Report a problem with a public project near you. No account, name or phone number needed.
            </Text>
            <View style={styles.citizenButtons}>
              <View style={{ flex: 1 }}>
                <AppButton title="Report a project" variant="accent" onPress={() => router.push("/(citizen)/report")} />
              </View>
              <View style={{ flex: 1 }}>
                <AppButton title="Track a report" variant="secondary" onPress={() => router.push("/(citizen)/track")} />
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.slate100,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    paddingHorizontal: spacing["2xl"],
    paddingTop: spacing["3xl"],
    paddingBottom: spacing["2xl"],
    gap: spacing.md,
    backgroundColor: colors.ink,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.slate400,
  },
  formWrap: {
    flexGrow: 1,
    padding: spacing.lg,
    paddingBottom: spacing["3xl"],
    justifyContent: "center",
  },
  formHeader: {
    gap: 4,
    marginBottom: spacing.lg,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.ink,
  },
  formSubtitle: {
    ...typography.body,
    color: colors.slate500,
  },
  formFields: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  footer: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  footerPanel: {
    marginTop: spacing.lg,
    gap: spacing.md,
    borderRadius: 18,
    backgroundColor: colors.brandStrong,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  footerPanelTitle: {
    ...typography.sectionTitle,
    color: colors.white,
  },
  footerPanelText: {
    ...typography.caption,
    color: colors.slate100,
    fontWeight: "500",
    lineHeight: 18,
  },
  footerNote: {
    ...typography.caption,
    color: colors.slate300,
    fontWeight: "500",
    textAlign: "center",
  },
  citizenCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    borderRadius: 18,
    backgroundColor: colors.accentSoft,
    borderWidth: 1,
    borderColor: "#B7E4DF",
  },
  citizenHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  citizenTitle: {
    ...typography.sectionTitle,
    color: colors.ink,
  },
  citizenText: {
    ...typography.caption,
    color: colors.slate600,
    lineHeight: 18,
  },
  citizenButtons: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  passwordToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
