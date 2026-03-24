import { useEffect, useState } from "react";
import { getCurrentHighAccuracyLocation } from "@/services/geolocation/locationService";

export function useCurrentLocation() {
  const [location, setLocation] = useState<any | null>(null);

  useEffect(() => {
    getCurrentHighAccuracyLocation()
      .then(setLocation)
      .catch(() => setLocation(null));
  }, []);

  return { location };
}