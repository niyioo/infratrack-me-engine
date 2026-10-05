/**
 * Android release settings, applied on every `expo prebuild` so the generated
 * android/ folder never needs hand edits (it isn't committed).
 *
 * 1. Release signing. When the Gradle properties below are set — normally in
 *    ~/.gradle/gradle.properties, never in the repo — release builds are signed
 *    with that upload keystore; otherwise they fall back to the debug key
 *    (fine for local testing, not for distribution).
 *
 *      PROVETRACK_UPLOAD_STORE_FILE=C:/Users/me/.provetrack/provetrack-upload.jks
 *      PROVETRACK_UPLOAD_STORE_PASSWORD=...
 *      PROVETRACK_UPLOAD_KEY_ALIAS=provetrack-upload
 *      PROVETRACK_UPLOAD_KEY_PASSWORD=...
 *
 * 2. Cleartext HTTP. Allowed only when the build's API base URL is http://
 *    (a laptop or staging server). Builds pointed at an https:// API keep
 *    Android's default of HTTPS-only.
 */
const { withAppBuildGradle, withAndroidManifest } = require("expo/config-plugins");

const SIGNING_MARKER = "// provetrack-release-signing";

function addReleaseSigning(gradle) {
  if (gradle.includes(SIGNING_MARKER)) return gradle;

  const releaseConfig = `
        ${SIGNING_MARKER}
        release {
            if (project.hasProperty('PROVETRACK_UPLOAD_STORE_FILE')) {
                storeFile file(PROVETRACK_UPLOAD_STORE_FILE)
                storePassword PROVETRACK_UPLOAD_STORE_PASSWORD
                keyAlias PROVETRACK_UPLOAD_KEY_ALIAS
                keyPassword PROVETRACK_UPLOAD_KEY_PASSWORD
            }
        }`;

  // Add a `release` signing config next to the generated `debug` one…
  let next = gradle.replace(/signingConfigs\s*\{/, (match) => `${match}${releaseConfig}`);
  // …and use it for release builds when an upload key is configured.
  next = next.replace(
    /(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/s,
    "$1signingConfig project.hasProperty('PROVETRACK_UPLOAD_STORE_FILE') ? signingConfigs.release : signingConfigs.debug"
  );
  if (next === gradle) {
    throw new Error("withAndroidRelease: build.gradle layout changed; update the plugin.");
  }
  return next;
}

module.exports = function withAndroidRelease(config) {
  config = withAppBuildGradle(config, (cfg) => {
    cfg.modResults.contents = addReleaseSigning(cfg.modResults.contents);
    return cfg;
  });

  config = withAndroidManifest(config, (cfg) => {
    const apiUrl = process.env.EXPO_PUBLIC_API_BASE_URL || "";
    const application = cfg.modResults.manifest.application?.[0];
    if (application) {
      application.$["android:usesCleartextTraffic"] = apiUrl.startsWith("http://") ? "true" : "false";
    }
    return cfg;
  });

  return config;
};
