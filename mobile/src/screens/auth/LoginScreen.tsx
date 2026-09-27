import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { AppAlert } from "@/components/ui/AppAlert";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppInput } from "@/components/ui/AppInput";
import { InfraTrackBrand } from "@/components/brand/InfraTrackBrand";
import { colors, spacing, typography } from "@/lib/theme/tokens";
import { fetchCurrentUser, login } from "@/features/auth/api";
import { setStoredUser, setTokens } from "@/features/auth/storage";

export default function LoginScreen() {
  const router = useRouter();
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
      const tokens = await login({ email, password });
      await setTokens(tokens.access, tokens.refresh);
      const user = await fetchCurrentUser();
      await setStoredUser(user);
      router.replace("/(main)/dashboard");
    } catch {
      setError("Unable to sign in right now. Confirm your credentials and network, then try again.");
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <InfraTrackBrand size="lg" stacked light />
          <AppBadge label="Secure Access" tone="info" />
          <Text style={styles.heroSubtitle}>
            Premium field operations, verification confidence, and project intelligence in one trusted mobile workspace.
          </Text>
        </View>

        <View style={styles.formWrap}>
          <AppCard>
            <View style={styles.formHeader}>
              <Text style={styles.formTitle}>Sign in</Text>
              <Text style={styles.formSubtitle}>Use your authorized InfraTrack account to continue.</Text>
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
              <AppButton title="Sign In Securely" onPress={handleLogin} loading={loading} />
              <Text style={styles.footerNote}>
                This session is protected with secure token storage and role-based access control.
              </Text>
            </View>
          </AppCard>
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
  passwordToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
