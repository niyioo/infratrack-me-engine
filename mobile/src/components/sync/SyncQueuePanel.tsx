import { View, Text, StyleSheet } from "react-native";
import type { OfflineEvidenceItem } from "@/features/evidence/types";
import { SyncStatusBadge } from "./SyncStatusBadge";

export function SyncQueuePanel({ items }: { items: OfflineEvidenceItem[] }) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.heading}>Offline Queue</Text>
      <View style={styles.list}>
        {items.map((item) => (
          <View key={item.localId} style={styles.item}>
            <Text style={styles.itemTitle}>
              Project #{item.projectId} · Milestone #{item.milestoneId}
            </Text>
            <View style={styles.badgeWrap}>
              <SyncStatusBadge status={item.syncStatus} />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:      { borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", padding: 16 },
  heading:   { fontSize: 15, fontWeight: "700", color: "#0F172A" },
  list:      { marginTop: 12, gap: 10 },
  item:      { borderRadius: 10, borderWidth: 1, borderColor: "#F1F5F9", padding: 12 },
  itemTitle: { fontSize: 13, fontWeight: "600", color: "#0F172A" },
  badgeWrap: { marginTop: 8 },
});
