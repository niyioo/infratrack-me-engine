import { ReactNode, useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { requestLocationPermission } from "@/services/geolocation/locationService";
import { AppButton } from "@/components/ui/AppButton";

export function LocationPermissionGate({ children }: { children: ReactNode }) {
  const [granted, setGranted] = useState<boolean | null>(null);

  async function checkPermission() {
    const ok = await requestLocationPermission();
    setGranted(ok);
  }

  useEffect(() => {
    checkPermission();
  }, []);

  if (granted === null) {
    return <Text style={styles.checking}>Checking location permission…</Text>;
  }

  if (!granted) {
    return (
      <View style={styles.denied}>
        <Text style={styles.deniedTitle}>Location permission required</Text>
        <Text style={styles.deniedSub}>
          Grant location access to validate on-site capture.
        </Text>
        <View style={styles.btnWrap}>
          <AppButton title="Retry Permission" onPress={checkPermission} />
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  checking: {
    fontSize: 13,
    color: "#64748B",
    padding: 16,
  },
  denied: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FDE68A",
    backgroundColor: "#FFFBEB",
    padding: 16,
  },
  deniedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#92400E",
  },
  deniedSub: {
    marginTop: 4,
    fontSize: 13,
    color: "#475569",
  },
  btnWrap: {
    marginTop: 12,
  },
});
