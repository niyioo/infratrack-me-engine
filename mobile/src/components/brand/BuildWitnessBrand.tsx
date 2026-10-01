import { StyleSheet, Text, View } from "react-native";
import { colors } from "@/lib/theme/tokens";

type BuildWitnessBrandProps = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  stacked?: boolean;
  light?: boolean;
};

function dimensionFor(size: "sm" | "md" | "lg") {
  if (size === "sm") return 32;
  if (size === "lg") return 64;
  return 46;
}

function fontSizeFor(size: "sm" | "md" | "lg") {
  if (size === "sm") return 18;
  if (size === "lg") return 30;
  return 24;
}

export function BuildWitnessBrand({
  size = "md",
  showWordmark = true,
  stacked = false,
  light = false,
}: BuildWitnessBrandProps) {
  const dimension = dimensionFor(size);
  const fontSize = fontSizeFor(size);
  const ink = light ? colors.white : "#0F3D78";
  const teal = "#0F9C92";

  return (
    <View style={[styles.wrap, stacked && styles.wrapStacked]}>
      <View style={[styles.mark, { width: dimension, height: dimension * 1.08 }]}>
        <View style={[styles.orbitTop, { borderColor: teal, width: dimension * 0.78, height: dimension * 0.78, right: 0 }]} />
        <View style={[styles.orbitBottom, { borderColor: ink, width: dimension * 0.88, height: dimension * 0.88, left: 1, bottom: dimension * 0.12 }]} />
        <View style={[styles.link, { backgroundColor: ink, left: dimension * 0.04, top: dimension * 0.17, width: dimension * 0.26 }]} />
        <View style={[styles.nodeLarge, { borderColor: ink, left: 0, top: dimension * 0.17, width: dimension * 0.19, height: dimension * 0.19, borderRadius: dimension * 0.095 }]} />
        <View style={[styles.nodeSmall, { borderColor: teal, left: dimension * 0.26, top: 0, width: dimension * 0.12, height: dimension * 0.12, borderRadius: dimension * 0.06 }]} />
        <View style={[styles.barTeal, { left: dimension * 0.2, bottom: dimension * 0.3, width: dimension * 0.12, height: dimension * 0.23, backgroundColor: teal }]} />
        <View style={[styles.barNavyLeft, { left: dimension * 0.36, bottom: dimension * 0.23, width: dimension * 0.12, height: dimension * 0.4, backgroundColor: ink }]} />
        <View style={[styles.barNavyMain, { left: dimension * 0.51, bottom: dimension * 0.19, width: dimension * 0.13, height: dimension * 0.54, backgroundColor: ink }]} />
        <View style={[styles.barSlate, { left: dimension * 0.67, bottom: dimension * 0.26, width: dimension * 0.11, height: dimension * 0.42, backgroundColor: "#94AACC" }]} />
        <View style={[styles.road, { left: dimension * 0.33, bottom: 0, borderLeftWidth: dimension * 0.17, borderRightWidth: dimension * 0.17, borderTopWidth: dimension * 0.36, borderTopColor: ink }]} />
        <View style={[styles.roadDash, { height: dimension * 0.08, bottom: dimension * 0.33 }]} />
        <View style={[styles.roadDash, { height: dimension * 0.08, bottom: dimension * 0.19 }]} />
        <View style={[styles.roadDash, { height: dimension * 0.08, bottom: dimension * 0.05 }]} />
      </View>

      {showWordmark ? (
        <View style={[styles.wordmarkRow, stacked && styles.wordmarkStacked]}>
          <Text style={[styles.wordmark, { color: ink, fontSize }]}>Build</Text>
          <Text style={[styles.wordmark, { color: teal, fontSize }]}>Witness</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  wrapStacked: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
  },
  mark: {
    position: "relative",
  },
  orbitTop: {
    position: "absolute",
    top: 2,
    borderWidth: 6,
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
    borderRadius: 999,
    transform: [{ rotate: "8deg" }],
  },
  orbitBottom: {
    position: "absolute",
    borderWidth: 6,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderRadius: 999,
    transform: [{ rotate: "-10deg" }],
  },
  link: {
    position: "absolute",
    height: 4,
    transform: [{ rotate: "-45deg" }],
    borderRadius: 999,
  },
  nodeLarge: {
    position: "absolute",
    borderWidth: 5,
    backgroundColor: colors.white,
  },
  nodeSmall: {
    position: "absolute",
    borderWidth: 4,
    backgroundColor: colors.white,
  },
  barTeal: {
    position: "absolute",
  },
  barNavyLeft: {
    position: "absolute",
  },
  barNavyMain: {
    position: "absolute",
  },
  barSlate: {
    position: "absolute",
  },
  road: {
    position: "absolute",
    width: 0,
    height: 0,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
  roadDash: {
    position: "absolute",
    left: "49.2%",
    width: 4,
    backgroundColor: colors.white,
    marginLeft: -2,
  },
  wordmarkRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  wordmarkStacked: {
    gap: 0,
  },
  wordmark: {
    fontWeight: "800",
    letterSpacing: -1,
  },
});
