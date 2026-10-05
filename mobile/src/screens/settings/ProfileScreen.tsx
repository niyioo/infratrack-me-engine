import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { AppBadge } from "@/components/ui/AppBadge";
import { AppButton } from "@/components/ui/AppButton";
import { AppCard } from "@/components/ui/AppCard";
import { AppScreen } from "@/components/ui/AppScreen";
import { AppSectionHeader } from "@/components/ui/AppSectionHeader";
import { clearTokens } from "@/features/auth/storage";
import { useAuth } from "@/hooks/useAuth";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { useOfflineQueueSummary } from "@/features/sync/hooks";
import { colors, radius, spacing, typography } from "@/lib/theme/tokens";

function initials(fullName?: string) {
  return (fullName || "ProveTrack User")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function ProfileScreen() {
  const { user, roles } = useAuth();
  const { online } = useNetworkStatus();
  const queue = useOfflineQueueSummary();

  async function handleLogout() {
    Alert.alert("Sign out", "End this device session?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await clearTokens();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <AppScreen scroll contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(user?.full_name)}</Text>
        </View>
        <View style={styles.heroCopy}>
          <Text style={styles.heroTitle}>{user?.full_name || "ProveTrack User"}</Text>
          <Text style={styles.heroSubtitle}>{user?.email || "No email available"}</Text>
        </View>
      </View>

      <AppCard>
        <AppSectionHeader title="Role Access" subtitle="Current operational permissions" />
        <View style={styles.roleList}>
          {roles.length > 0 ? (
            roles.map((role) => <AppBadge key={role} label={role.replaceAll("_", " ")} tone="info" />)
          ) : (
            <Text style={styles.bodyText}>No roles assigned.</Text>
          )}
        </View>
      </AppCard>

      <AppCard>
        <AppSectionHeader title="Device Confidence" subtitle="Session and field readiness" />
        <View style={styles.infoList}>
          <InfoRow icon="cloud-outline" label="Connectivity" value={online ? "Online and ready" : "Offline mode active"} />
          <InfoRow icon="shield-checkmark-outline" label="Session Status" value="Verified access on this device" />
          <InfoRow icon="albums-outline" label="Offline Queue" value={`${queue.pendingCount + queue.failedCount} item(s) awaiting attention`} />
        </View>
      </AppCard>

      <AppCard>
        <AppSectionHeader title="Operational Actions" subtitle="Fast access to critical field controls" />
        <View style={styles.actionStack}>
          <AppButton title="Open Camera" onPress={() => router.push("/(main)/capture")} />
          <AppButton title="Open Offline Queue" variant="secondary" onPress={() => router.push("/(main)/evidence")} />
          <AppButton title="Review Alerts" variant="secondary" onPress={() => router.push("/(main)/alerts")} />
          <AppButton title="Sign Out" variant="secondary" onPress={handleLogout} />
        </View>
      </AppCard>
    </AppScreen>
  );
}

function InfoRow({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconWrap}>
        <Ionicons name={icon} size={18} color={colors.brand} />
      </View>
      <View style={styles.infoCopy}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  hero: {
    borderRadius: radius.xl,
    backgroundColor: colors.ink,
    padding: spacing["2xl"],
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.white,
  },
  heroCopy: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: colors.white,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    ...typography.body,
    color: colors.slate400,
  },
  roleList: {
    marginTop: spacing.lg,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  bodyText: {
    ...typography.body,
    color: colors.slate500,
    marginTop: spacing.lg,
  },
  infoList: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.slate50,
    padding: spacing.md,
  },
  infoIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSoft,
  },
  infoCopy: {
    flex: 1,
    gap: 2,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.slate500,
  },
  infoValue: {
    ...typography.body,
    color: colors.ink,
    fontWeight: "700",
  },
  actionStack: {
    marginTop: spacing.lg,
    gap: spacing.md,
  },
});
