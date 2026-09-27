import { ReactNode, useEffect, useState } from "react";
import { fetchCurrentUser } from "@/features/auth/api";
import { clearAuthStorage, setStoredUser } from "@/features/auth/store";

export function AuthBootstrap({ children }: { children: ReactNode }) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const accessToken = window.localStorage.getItem("access_token");
      if (!accessToken) {
        setStoredUser(null);
        if (!cancelled) setIsReady(true);
        return;
      }

      try {
        const user = await fetchCurrentUser();
        if (!cancelled) {
          setStoredUser(user);
        }
      } catch {
        clearAuthStorage();
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
    return null;
  }

  return <>{children}</>;
}
