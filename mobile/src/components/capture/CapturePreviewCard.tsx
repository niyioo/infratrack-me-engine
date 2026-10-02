import { View, Text, Image, StyleSheet } from "react-native";

export function CapturePreviewCard(props: {
  uri: string;
  capturedAt: string;
  latitude: number;
  longitude: number;
}) {
  return (
    <View style={styles.wrap}>
      <Image source={{ uri: props.uri }} style={styles.image} resizeMode="cover" />
      <Text style={styles.title}>Captured Evidence</Text>
      <Text style={styles.meta}>Captured at: {props.capturedAt}</Text>
      <Text style={styles.meta}>
        {props.latitude !== undefined && props.longitude !== undefined
          ? "Location metadata attached for verification"
          : "Location metadata unavailable"}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { borderRadius: 12, borderWidth: 1, borderColor: "#E2E8F0", backgroundColor: "#FFFFFF", padding: 16 },
  image: { height: 208, width: "100%", borderRadius: 10, backgroundColor: "#F1F5F9" },
  title: { marginTop: 12, fontSize: 14, fontWeight: "600", color: "#0F172A" },
  meta:  { marginTop: 4, fontSize: 12, color: "#64748B" },
});
