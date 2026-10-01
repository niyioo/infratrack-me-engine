import { Stack } from "expo-router";

/** Anonymous citizen screens: reachable without signing in. */
export default function CitizenLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
