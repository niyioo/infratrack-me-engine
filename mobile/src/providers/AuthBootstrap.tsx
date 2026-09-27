import { ReactNode, useEffect, useState } from "react";
import { fetchCurrentUser } from "@/features/auth/api";
import { clearTokens, getAccessToken, setStoredUser } from "@/features/auth/storage";
import { View, ActivityIndicator } from "react-native";

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const accessToken = await getAccessToken();
      if (!accessToken) {
        await setStoredUser(null);
        if (!cancelled) setIsReady(true);
        return;
      }

      try {
        const user = await fetchCurrentUser();
        await setStoredUser(user);
      } catch {
        await clearTokens();
      } finally {
        if (!cancelled) {
          setIsReady(true);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "white" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <>{children}</>;
}
