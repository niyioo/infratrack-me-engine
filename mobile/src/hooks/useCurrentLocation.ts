import { useEffect, useState } from "react";
import * as Location from "expo-location";
import { requestLocationPermission } from "@/services/geolocation/locationService";

/**
 * Current device position, kept live while the screen is mounted.
 *
 * Waits for location permission first: asking for a fix before the officer has
 * answered the permission prompt fails, and a one-shot request would then leave
 * the screen stuck on "Locating…". Watching (rather than a single fix) also means
 * the geofence check updates as the officer walks onto the site.
 */
export function useCurrentLocation() {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const granted = await requestLocationPermission().catch(() => false);
      if (!granted || cancelled) return;

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 2000, distanceInterval: 1 },
        (next) => {
          if (!cancelled) setLocation(next);
        }
      ).catch(() => null);

      if (cancelled) subscription?.remove();
    })();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);

  return { location };
}
