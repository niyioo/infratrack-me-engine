import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { router } from "expo-router";
import { useAuth } from "@/hooks/useAuth";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

function getRoleColor(role: string): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    ADMIN:      { bg: "#FEF2F2", text: "#DC2626" },
    SUPERVISOR: { bg: "#FFFBEB", text: "#D97706" },
    ENGINEER:   { bg: "#EFF6FF", text: "#2563EB" },
    INSPECTOR:  { bg: "#F0FDF4", text: "#16A34A" },
  };
  return map[role.toUpperCase()] ?? { bg: "#F1F5F9", text: "#475569" };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconBox}>
        <Text style={styles.infoIcon}>{icon}</Text>
      </View>
      <View style={styles.infoContent}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
      </View>
    </View>
  );
}

function SectionHeading({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export function ProfileScreen() {
  const { user, roles } = useAuth();

  const initials = getInitials(user?.full_name || "Field User");

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── HEADER ── */}
        <View style={styles.header}>
          <View style={styles.headerBadge}>
            <Text style={styles.headerBadgeText}>MY PROFILE</Text>
          </View>

          {/* Avatar */}
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.avatarOnline} />
          </View>

          <Text style={styles.headerName}>{user?.full_name || "—"}</Text>
          <Text style={styles.headerEmail}>{user?.email || "—"}</Text>

          {/* Role pills */}
          {roles.length > 0 && (
            <View style={styles.rolePills}>
              {roles.map((role: string) => {
                const c = getRoleColor(role);
                return (
                  <View key={role} style={[styles.rolePill, { backgroundColor: c.bg }]}>
                    <Text style={[styles.rolePillText, { color: c.text }]}>
                      {role}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* ── BODY ── */}
        <View style={styles.body}>

          {/* ACCOUNT DETAILS */}
          <View style={styles.card}>
            <SectionHeading title="Account Details" />
            <InfoRow icon="👤" label="Full Name"  value={user?.full_name || "—"} />
            <View style={styles.separator} />
            <InfoRow icon="✉️"  label="Email"      value={user?.email    || "—"} />
          </View>

          {/* ACCESS & ROLES */}
          <View style={styles.card}>
            <SectionHeading title="Access & Roles" />
            {roles.length > 0 ? (
              roles.map((role: string, i: number) => {
                const c = getRoleColor(role);
                return (
                  <View key={role}>
                    {i > 0 && <View style={styles.separator} />}
                    <View style={styles.roleRow}>
                      <View style={[styles.roleIconBox, { backgroundColor: c.bg }]}>
                        <Text style={styles.roleIcon}>🔑</Text>
                      </View>
                      <View style={styles.roleContent}>
                        <Text style={[styles.roleLabel, { color: c.text }]}>{role}</Text>
                        <Text style={styles.roleDesc}>Field access level</Text>
                      </View>
                      <View style={[styles.roleBadge, { backgroundColor: c.bg }]}>
                        <Text style={[styles.roleBadgeText, { color: c.text }]}>Active</Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <Text style={styles.noRoles}>No roles assigned</Text>
            )}
          </View>

          {/* APP INFO */}
          <View style={styles.card}>
            <SectionHeading title="Application" />
            <InfoRow icon="📱" label="Platform"    value="InfraTrack Mobile" />
            <View style={styles.separator} />
            <InfoRow icon="🔒" label="Auth Method" value="Secure Token (JWT)" />
          </View>

        </View>
      </ScrollView>

      {/* ── FOOTER ── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.signOutBtn}
          activeOpacity={0.85}
          onPress={() => router.replace("/(auth)/login")}
        >
          <Text style={styles.signOutIcon}>⎋</Text>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  scroll: {
    paddingBottom: 16,
  },

  // Header
  header: {
    backgroundColor: "#0F172A",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 36,
    alignItems: "center",
  },
  headerBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#1E3A5F",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 20,
  },
  headerBadgeText: {
    color: "#60A5FA",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
  },

  // Avatar
  avatarWrap: {
    position: "relative",
    marginBottom: 14,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: "#1E40AF",
    borderWidth: 3,
    borderColor: "#3B82F6",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  avatarOnline: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#10B981",
    borderWidth: 2.5,
    borderColor: "#0F172A",
  },

  headerName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#F8FAFC",
    letterSpacing: -0.3,
    textAlign: "center",
  },
  headerEmail: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
    textAlign: "center",
  },

  // Role pills in header
  rolePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 14,
    justifyContent: "center",
  },
  rolePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  rolePillText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  // Body
  body: {
    padding: 16,
    gap: 12,
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    gap: 14,
  },

  // Section heading
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#94A3B8",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  // Info row
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  infoIcon: { fontSize: 17 },
  infoContent: { flex: 1 },
  infoLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
  },

  separator: {
    height: 1,
    backgroundColor: "#F8FAFC",
  },

  // Role row
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  roleIconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  roleIcon: { fontSize: 17 },
  roleContent: { flex: 1 },
  roleLabel: {
    fontSize: 14,
    fontWeight: "700",
  },
  roleDesc: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 1,
  },
  roleBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },

  noRoles: {
    fontSize: 13,
    color: "#94A3B8",
    fontStyle: "italic",
  },

  // Footer
  footer: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 6,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1.5,
    borderColor: "#FECACA",
    borderRadius: 14,
    paddingVertical: 15,
  },
  signOutIcon: {
    fontSize: 16,
    color: "#DC2626",
  },
  signOutText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC2626",
    letterSpacing: 0.2,
  },
});
