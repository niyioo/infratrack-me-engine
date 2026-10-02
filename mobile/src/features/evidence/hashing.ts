import * as FileSystem from "expo-file-system";
import * as Crypto from "expo-crypto";

export async function hashFileSha256(uri: string) {
  const content = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64" as any,
  });
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, content);
}
