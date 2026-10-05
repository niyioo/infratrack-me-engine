import { ReactNode, useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { AppAlert } from "@/components/ui/AppAlert";
import { AppButton } from "@/components/ui/AppButton";
import { getCameraPermissionState, requestCameraPermission } from "@/services/camera/captureService";

type PermissionState = {
  granted: boolean;
  canAskAgain: boolean;
};

export function CameraPermissionGate({ children }: { children: ReactNode }) {
  const [permission, setPermission] = useState<PermissionState | null>(null);

  async function refreshPermission() {
    const nextState = await getCameraPermissionState();
    setPermission(nextState);
  }

  async function handleRequestPermission() {
    const nextState = await requestCameraPermission();
    setPermission(nextState);
  }

  useEffect(() => {
    refreshPermission();
  }, []);

  if (permission === null) {
    return (
      <AppAlert
        tone="info"
        title="Checking camera access"
        message="ProveTrack is verifying whether this device is allowed to open the camera for evidence capture."
      />
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.stack}>
        <AppAlert
          tone="warning"
          title="Camera access required"
          message={
            permission.canAskAgain
              ? "Allow camera access to capture geo-verified evidence directly from the device."
              : "Camera access is blocked for this app. Open device settings and enable camera access to continue."
          }
        />
        <View style={styles.actions}>
          {permission.canAskAgain ? (
            <AppButton title="Allow Camera Access" onPress={handleRequestPermission} />
          ) : (
            <AppButton title="Open Device Settings" onPress={() => Linking.openSettings()} />
          )}
          <AppButton title="Refresh Permission" variant="secondary" onPress={refreshPermission} />
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  stack: {
    gap: 12,
  },
  actions: {
    gap: 12,
  },
});
