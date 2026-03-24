import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";

import { login, fetchCurrentUserByEmail } from "@/features/auth/api";
import { setStoredUser, setTokens } from "@/features/auth/storage";

// ─── Reusable Field ──────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = "none",
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  keyboardType?: any;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputBox, focused && styles.inputBoxFocused]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry}
          autoCapitalize={autoCapitalize}
          keyboardType={keyboardType}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function LoginScreen() {
  const router = useRouter();

  const [email, setEmail] = useState("field@infratrack.local");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    setLoading(true);
    setError("");

    try {
      const tokens = await login({ email, password });
      await setTokens(tokens.access, tokens.refresh);

      const user = await fetchCurrentUserByEmail(email);
      if (user) await setStoredUser(user);

      router.replace("/(main)/dashboard");
    } catch {
      setError("Unable to sign in. Check your credentials or network.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── BACKGROUND SHAPES ── */}
        <View style={styles.blobTop} />
        <View style={styles.blobBottom} />

        {/* ── BRAND BLOCK ── */}
        <View style={styles.brand}>
          <View style={styles.logoMark}>
            <View style={styles.logoInner} />
          </View>
          <Text style={styles.appName}>InfraTrack</Text>
          <Text style={styles.appTagline}>Field Monitoring Platform</Text>
        </View>

        {/* ── CARD ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome back</Text>
          <Text style={styles.cardSubtitle}>
            Sign in to your field account to continue
          </Text>

          <View style={styles.form}>
            <Field
              label="Email address"
              value={email}
              onChangeText={setEmail}
              placeholder="you@infratrack.com"
              keyboardType="email-address"
            />

            <Field
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              secureTextEntry
            />

            {/* ERROR */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* SIGN IN BUTTON */}
            <TouchableOpacity
              style={[styles.signInBtn, loading && styles.signInBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <View style={styles.signInContent}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.signInText}>Signing in…</Text>
                </View>
              ) : (
                <Text style={styles.signInText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── FOOTER ── */}
        <Text style={styles.footer}>
          InfraTrack Mobile · Secure Field Operations
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const NAVY  = "#0F172A";
const BLUE  = "#2563EB";
const BLUE2 = "#1D4ED8";

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },

  // Background blobs
  blobTop: {
    position: "absolute",
    top: -80,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "#DBEAFE",
    opacity: 0.6,
  },
  blobBottom: {
    position: "absolute",
    bottom: -60,
    left: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "#E0F2FE",
    opacity: 0.5,
  },

  // Brand
  brand: {
    alignItems: "center",
    marginBottom: 36,
  },
  logoMark: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: NAVY,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
    shadowColor: NAVY,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  logoInner: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: "#60A5FA",
    backgroundColor: "transparent",
  },
  appName: {
    fontSize: 26,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: -0.5,
  },
  appTagline: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
    marginTop: 3,
    letterSpacing: 0.4,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 28,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.09,
    shadowRadius: 20,
    elevation: 6,
  },
  cardTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: NAVY,
    letterSpacing: -0.3,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    lineHeight: 18,
  },

  // Form
  form: {
    marginTop: 24,
    gap: 16,
  },
  fieldWrapper: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  inputBox: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  inputBoxFocused: {
    borderColor: BLUE,
    backgroundColor: "#EFF6FF",
  },
  input: {
    fontSize: 15,
    color: NAVY,
  },

  // Error
  errorBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  errorIcon: {
    fontSize: 13,
    color: "#EF4444",
    marginTop: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: "#DC2626",
    lineHeight: 18,
  },

  // Sign In button
  signInBtn: {
    backgroundColor: BLUE,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  signInBtnDisabled: {
    backgroundColor: "#93C5FD",
    shadowOpacity: 0,
    elevation: 0,
  },
  signInContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  signInText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // Footer
  footer: {
    textAlign: "center",
    marginTop: 28,
    fontSize: 11,
    color: "#CBD5E1",
    letterSpacing: 0.3,
  },
});
