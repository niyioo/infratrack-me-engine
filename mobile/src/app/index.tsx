import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { View, Text, ActivityIndicator } from "react-native";

export default function IndexPage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 12, color: "black" }}>Checking session...</Text>
      </View>
    );
  }

  return isAuthenticated ? (
    <Redirect href="/(main)/dashboard" />
  ) : (
    <Redirect href="/(auth)/login" />
  );
}