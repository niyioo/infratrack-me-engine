import "../global.css"; // ← NativeWind v4 requires this to initialize styles
import { Stack } from "expo-router";
import { AppProviders } from "@/providers/AppProviders";

export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
