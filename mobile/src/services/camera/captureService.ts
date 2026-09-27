import * as ImagePicker from "expo-image-picker";

export type CameraPermissionState = {
  granted: boolean;
  canAskAgain: boolean;
};

export type CameraCaptureResult = {
  asset: ImagePicker.ImagePickerAsset | null;
  error?: string;
  permissionDenied?: boolean;
  canAskAgain?: boolean;
};

export async function getCameraPermissionState(): Promise<CameraPermissionState> {
  const permission = await ImagePicker.getCameraPermissionsAsync();
  return {
    granted: permission.granted,
    canAskAgain: permission.canAskAgain ?? true,
  };
}

export async function requestCameraPermission(): Promise<CameraPermissionState> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  return {
    granted: permission.granted,
    canAskAgain: permission.canAskAgain ?? true,
  };
}

export async function capturePhotoLive(): Promise<CameraCaptureResult> {
  const currentPermission = await getCameraPermissionState();
  const permission = currentPermission.granted ? currentPermission : await requestCameraPermission();

  if (!permission.granted) {
    return {
      asset: null,
      permissionDenied: true,
      canAskAgain: permission.canAskAgain,
      error: permission.canAskAgain
        ? "Camera permission is required to capture field evidence."
        : "Camera access is blocked for this app. Open device settings and allow camera access.",
    };
  }

  try {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      exif: true,
    });

    if (result.canceled) {
      return {
        asset: null,
        error: "Camera capture was cancelled before a photo was taken.",
      };
    }

    return { asset: result.assets[0] };
  } catch {
    return {
      asset: null,
      error:
        "The device camera could not be opened. Check camera permission or try again on a physical device.",
    };
  }
}
