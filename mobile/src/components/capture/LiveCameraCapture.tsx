import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { ImagePickerAsset } from "expo-image-picker";
import { AppAlert } from "@/components/ui/AppAlert";
import { AppButton } from "@/components/ui/AppButton";
import { capturePhotoLive } from "@/services/camera/captureService";

export function LiveCameraCapture({
  onCaptured,
  disabled = false,
}: {
  onCaptured: (asset: ImagePickerAsset) => void;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleCapture() {
    setBusy(true);
    setError("");
    try {
      const result = await capturePhotoLive();
      if (result.asset) onCaptured(result.asset);
      else if (result.error) setError(result.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Live Camera Capture</Text>
      <Text style={styles.sub}>Capture evidence directly from the device camera.</Text>
      {error ? (
        <View style={styles.alertWrap}>
          <AppAlert tone="error" message={error} />
        </View>
      ) : null}
      <View style={styles.btnWrap}>
        <AppButton title="Open Camera" onPress={handleCapture} disabled={disabled} loading={busy} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    padding: 16,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  sub: {
    marginTop: 4,
    fontSize: 13,
    color: "#64748B",
  },
  alertWrap: {
    marginTop: 12,
  },
  btnWrap: {
    marginTop: 16,
  },
});
