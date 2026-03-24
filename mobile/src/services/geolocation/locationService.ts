import * as Location from "expo-location";

export async function requestLocationPermission() {
  const result = await Location.requestForegroundPermissionsAsync();
  return result.status === "granted";
}

export async function getCurrentHighAccuracyLocation() {
  return Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Highest
  });
}