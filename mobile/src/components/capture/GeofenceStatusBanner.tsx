import { View, Text, StyleSheet } from "react-native";

export function GeofenceStatusBanner(props: {
  withinGeofence: boolean;
  distanceMeters: number;
  radiusMeters: number;
  warning?: string;
}) {
  const ok = props.withinGeofence;

  return (
    <View style={[styles.wrap, ok ? styles.wrapOk : styles.wrapFail]}>
      <Text style={[styles.title, ok ? styles.titleOk : styles.titleFail]}>
        {ok ? "✅  Inside approved site radius" : "🚫  Outside approved site radius"}
      </Text>
      <Text style={styles.sub}>
        Current distance: {Math.round(props.distanceMeters)}m · Allowed radius: {props.radiusMeters}m
      </Text>
      {props.warning ? <Text style={styles.warning}>{props.warning}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  wrapOk: {
    borderColor: "#6EE7B7",
    backgroundColor: "#ECFDF5",
  },
  wrapFail: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
  },
  titleOk: {
    color: "#065F46",
  },
  titleFail: {
    color: "#991B1B",
  },
  sub: {
    marginTop: 4,
    fontSize: 12,
    color: "#475569",
  },
  warning: {
    marginTop: 6,
    fontSize: 12,
    color: "#92400E",
  },
});
