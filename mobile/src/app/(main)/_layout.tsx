import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, Platform, StyleSheet } from "react-native";
import { InfraTrackBrand } from "@/components/brand/InfraTrackBrand";
import { colors, radius } from "@/lib/theme/tokens";

function TabIcon({
  name,
  color,
  size,
  focused,
}: {
  name: ComponentProps<typeof Ionicons>["name"];
  color: string;
  size: number;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Ionicons name={name} size={size - 2} color={color} />
    </View>
  );
}

export default function MainLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.slate400,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: colors.slate100,
          height: Platform.OS === "ios" ? 88 : 68,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
          paddingTop: 8,
          shadowColor: colors.ink,
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.06,
          shadowRadius: 12,
          elevation: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          letterSpacing: 0.2,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingTop: 4,
        },
        headerStyle: {
          backgroundColor: colors.white,
        },
        headerTitle: () => <InfraTrackBrand size="sm" />,
        headerShadowVisible: false,
        headerTintColor: colors.ink,
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Home",
          tabBarLabel: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name={focused ? "grid" : "grid-outline"}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="projects"
        options={{
          title: "Projects",
          tabBarLabel: "Projects",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name={focused ? "briefcase" : "briefcase-outline"}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="evidence"
        options={{
          title: "Evidence",
          tabBarLabel: "Evidence",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name={focused ? "cloud-upload" : "cloud-upload-outline"}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="capture"
        options={{
          title: "Capture",
          tabBarLabel: "Capture",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <View style={[styles.captureIconWrap, focused && styles.captureIconWrapActive]}>
              <Ionicons
                name={focused ? "camera" : "camera-outline"}
                color={focused ? colors.white : color}
                size={size - 1}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="alerts"
        options={{
          title: "Alerts",
          tabBarLabel: "Alerts",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name={focused ? "warning" : "warning-outline"}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "My Profile",
          tabBarLabel: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name={focused ? "person-circle" : "person-circle-outline"}
              color={color}
              size={size}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="project/[id]"
        options={{
          title: "Project Details",
          href: null,
        }}
      />

      <Tabs.Screen
        name="capture-review"
        options={{
          title: "Review Capture",
          headerShown: false,
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 44,
    height: 28,
    borderRadius: radius.pill,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapActive: {
    backgroundColor: colors.infoSoft,
  },
  captureIconWrap: {
    width: 52,
    height: 36,
    borderRadius: radius.pill,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.brandSoft,
  },
  captureIconWrapActive: {
    backgroundColor: colors.brand,
  },
});
