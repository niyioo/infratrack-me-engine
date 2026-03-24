import { View, Text, StyleSheet } from "react-native";
import { AppButton } from "@/components/ui/AppButton";
import { capturePhotoLive } from "@/services/camera/captureService";

export function LiveCameraCapture({ onCaptured }: { onCaptured: (asset: any) => void }) {
  async function handleCapture() {
    const asset = await capturePhotoLive();
    if (asset) onCaptured(asset);
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Live Camera Capture</Text>
      <Text style={styles.sub}>Capture evidence directly from the device camera.</Text>
      <View style={styles.btnWrap}>
        <AppButton title="Open Camera" onPress={handleCapture} />
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
  btnWrap: {
    marginTop: 16,
  },
});
