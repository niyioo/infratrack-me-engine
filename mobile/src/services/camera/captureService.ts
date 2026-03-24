import * as ImagePicker from "expo-image-picker";

export async function capturePhotoLive() {
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: false,
    quality: 0.8,
    exif: true
  });

  if (result.canceled) return null;
  return result.assets[0];
}