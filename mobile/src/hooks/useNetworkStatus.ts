import { useEffect, useState } from "react";
import { isOnline } from "@/services/network/networkService";

export function useNetworkStatus() {
  const [online, setOnline] = useState<boolean>(false);

  useEffect(() => {
    isOnline().then(setOnline);
  }, []);

  return { online };
}