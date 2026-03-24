import { Tabs } from "expo-router";
import type { ComponentProps } from "react";
import { Ionicons } from "@expo/vector-icons";
import { View, Platform, StyleSheet } from "react-native";

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
        tabBarActiveTintColor: "#2563EB",
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopWidth: 1,
          borderTopColor: "#F1F5F9",
          height: Platform.OS === "ios" ? 84 : 64,
          paddingBottom: Platform.OS === "ios" ? 24 : 8,
          paddingTop: 8,
          shadowColor: "#0F172A",
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
          backgroundColor: "#FFFFFF",
        },
        headerTitleStyle: {
          fontSize: 16,
          fontWeight: "700",
          color: "#0F172A",
        },
        headerShadowVisible: false,
        headerTintColor: "#0F172A",
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "My Assignments",
          tabBarLabel: "Assignments",
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon
              name={focused ? "clipboard" : "clipboard-outline"}
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
        name="capture"
        options={{
          title: "Live Capture",
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
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  iconWrapActive: {
    backgroundColor: "#EFF6FF",
  },
});