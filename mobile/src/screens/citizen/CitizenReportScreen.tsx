import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { AppAlert } from "@/components/ui/AppAlert";
import { AppButton } from "@/components/ui/AppButton";
import { PressableSurface } from "@/components/ui/PressableSurface";
import {
  citizenErrorMessage,
  searchPublicProjects,
  submitCitizenReport,
  type PublicProject,
  type ReportStatus,
} from "@/features/citizen/api";
import { CITIZEN_CATEGORIES, MAX_DESCRIPTION_LENGTH, MIN_DESCRIPTION_LENGTH } from "@/features/citizen/categories";
import { colors, radius, spacing, typography } from "@/lib/theme/tokens";

type Step = "project" | "details" | "done";

const LOCATION_TIMEOUT_MS = 15_000;
const LOCATION_MAX_AGE_MS = 5 * 60_000;
type Photo = { uri: string; name: string; type: string };

/** Site address plus LGA/state, without repeating parts the address already names. */
function formatSiteLocation(project: PublicProject) {
  const address = project.site_address?.trim() ?? "";
  const lower = address.toLowerCase();
  const extras = [project.lga, project.state].filter((part) => part && !lower.includes(part.toLowerCase()));
  return [address, ...extras].filter(Boolean).join(", ");
}

function isoDate(daysAgo: number) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const WHEN_OPTIONS = [
  { label: "Today", value: () => isoDate(0) },
  { label: "Yesterday", value: () => isoDate(1) },
  { label: "Earlier", value: () => null },
];

export default function CitizenReportScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("project");

  // Step 1
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<PublicProject[]>([]);
  const [searching, setSearching] = useState(false);
  const [project, setProject] = useState<PublicProject | null>(null);

  // Step 2
  const [category, setCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [when, setWhen] = useState<number | null>(null);
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  // Shown beside the control that failed: on a long form a banner at the top is off-screen.
  const [photoError, setPhotoError] = useState("");
  const [locationError, setLocationError] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReportStatus | null>(null);

  // Debounced project search.
  useEffect(() => {
    if (step !== "project") return;
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(() => {
      searchPublicProjects(search.trim())
        .then((rows) => !cancelled && (setResults(rows), setError("")))
        .catch((err) => !cancelled && setError(citizenErrorMessage(err)))
        .finally(() => !cancelled && setSearching(false));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search, step]);

  async function pickPhoto(fromCamera: boolean) {
    setPhotoError("");
    const permission = fromCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPhotoError(fromCamera ? "Camera access is needed to take a photo." : "Photo access is needed to choose a photo.");
      return;
    }
    // exif: false — the photo's own metadata (which can include GPS and device)
    // isn't read here, and the server strips it again on arrival.
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ["images"], quality: 0.7, exif: false };
    const picked = fromCamera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    setPhoto({
      uri: asset.uri,
      name: asset.fileName || "site-photo.jpg",
      type: asset.mimeType || "image/jpeg",
    });
  }

  async function addLocation() {
    setLocationError("");
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError("Location access was not allowed. You can still send the report without it.");
        return;
      }
      // A phone without a GPS fix can wait indefinitely; give up after a while and
      // fall back to the last known position (if it's recent) rather than spin forever.
      const timeout = new Promise<null>((resolve) => setTimeout(() => resolve(null), LOCATION_TIMEOUT_MS));
      const position =
        (await Promise.race([Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }), timeout])) ??
        (await Location.getLastKnownPositionAsync({ maxAge: LOCATION_MAX_AGE_MS }));
      if (!position) {
        setLocationError("Couldn't get a GPS fix. Try again outside, or send the report without a location.");
        return;
      }
      setCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
    } catch {
      setLocationError("Couldn't get your location. You can still send the report without it.");
    } finally {
      setLocating(false);
    }
  }

  const descriptionLength = description.trim().length;
  const canSubmit = !!project && !!category && descriptionLength >= MIN_DESCRIPTION_LENGTH && !submitting;

  async function submit() {
    if (!project || !category) return;
    setSubmitting(true);
    setError("");
    const form = new FormData();
    form.append("project_id", String(project.id));
    form.append("category", category);
    form.append("description", description.trim());
    const observed = when != null ? WHEN_OPTIONS[when].value() : null;
    if (observed) form.append("observed_on", observed);
    if (coords) {
      form.append("latitude", coords.lat.toFixed(6));
      form.append("longitude", coords.lng.toFixed(6));
    }
    if (photo) form.append("photo", photo as unknown as Blob);
    try {
      setResult(await submitCitizenReport(form));
      setStep("done");
    } catch (err) {
      setError(citizenErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  function back() {
    if (step === "details") setStep("project");
    else router.back();
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.md }]}>
        {step !== "done" ? (
          <Pressable onPress={back} hitSlop={12} style={styles.backRow} accessibilityRole="button">
            <Ionicons name="chevron-back" size={20} color={colors.white} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        ) : null}
        <View style={styles.chip}>
          <Ionicons name="eye-off-outline" size={12} color={colors.accent} />
          <Text style={styles.chipText}>Anonymous</Text>
        </View>
        <Text style={styles.headerTitle}>
          {step === "project" ? "Which project?" : step === "details" ? "What did you see?" : "Report sent"}
        </Text>
        <Text style={styles.headerSub}>
          {step === "done"
            ? "Thank you. Keep your tracking code to follow what happens next."
            : "No name, phone number or account needed. We never ask who you are."}
        </Text>
        {step !== "done" ? (
          <View style={styles.steps}>
            <View style={[styles.stepBar, styles.stepBarOn]} />
            <View style={[styles.stepBar, step === "details" && styles.stepBarOn]} />
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + spacing["3xl"] }]}
        keyboardShouldPersistTaps="handled"
      >
        {error && step === "project" ? <AppAlert tone="error" message={error} /> : null}

        {step === "project" ? (
          <>
            <View style={styles.searchShell}>
              <Ionicons name="search" size={18} color={colors.slate400} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Project name, town or LGA"
                placeholderTextColor={colors.slate400}
                style={styles.searchInput}
                autoCorrect={false}
                returnKeyType="search"
              />
              {searching ? <ActivityIndicator size="small" color={colors.brand} /> : null}
            </View>
            {!searching && results.length === 0 ? (
              <Text style={styles.empty}>No ongoing projects match that search.</Text>
            ) : null}
            {results.map((p) => (
              <PressableSurface
                key={p.id}
                onPress={() => {
                  setProject(p);
                  setStep("details");
                  setError("");
                }}
                style={styles.projectRow}
                pressedStyle={styles.projectRowPressed}
                accessibilityRole="button"
              >
                <View style={styles.projectIcon}>
                  <Ionicons name="business-outline" size={18} color={colors.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.projectTitle} numberOfLines={2}>
                    {p.title}
                  </Text>
                  <Text style={styles.projectMeta} numberOfLines={1}>
                    {formatSiteLocation(p)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.slate400} />
              </PressableSurface>
            ))}
          </>
        ) : null}

        {step === "details" && project ? (
          <>
            <View style={styles.selectedProject}>
              <Text style={styles.label}>Reporting on</Text>
              <Text style={styles.projectTitle}>{project.title}</Text>
              <Text style={styles.projectMeta}>{formatSiteLocation(project)}</Text>
            </View>

            <Text style={styles.label}>What best describes it?</Text>
            <View style={styles.categoryGrid}>
              {CITIZEN_CATEGORIES.map((c) => {
                const selected = category === c.value;
                return (
                  <PressableSurface
                    key={c.value}
                    onPress={() => setCategory(c.value)}
                    style={[styles.categoryCard, selected && (c.positive ? styles.categoryOnPositive : styles.categoryOn)]}
                    pressedStyle={styles.projectRowPressed}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                  >
                    <Ionicons
                      name={c.icon}
                      size={20}
                      color={selected ? (c.positive ? colors.success : colors.brand) : colors.slate500}
                    />
                    <Text style={[styles.categoryLabel, selected && { color: colors.ink }]}>{c.label}</Text>
                    <Text style={styles.categoryHint} numberOfLines={2}>
                      {c.hint}
                    </Text>
                  </PressableSurface>
                );
              })}
            </View>

            <Text style={styles.label}>Tell us more</Text>
            <TextInput
              value={description}
              onChangeText={(t) => setDescription(t.slice(0, MAX_DESCRIPTION_LENGTH))}
              placeholder="What did you notice, and where on the site?"
              placeholderTextColor={colors.slate400}
              multiline
              textAlignVertical="top"
              style={styles.textArea}
            />
            <Text style={[styles.counter, descriptionLength >= MIN_DESCRIPTION_LENGTH && { color: colors.success }]}>
              {descriptionLength < MIN_DESCRIPTION_LENGTH
                ? `${MIN_DESCRIPTION_LENGTH - descriptionLength} more characters needed`
                : `${descriptionLength}/${MAX_DESCRIPTION_LENGTH}`}
            </Text>

            <Text style={styles.label}>When did you see this? (optional)</Text>
            <View style={styles.whenRow}>
              {WHEN_OPTIONS.map((o, i) => (
                <PressableSurface
                  key={o.label}
                  onPress={() => setWhen(when === i ? null : i)}
                  style={[styles.whenChip, when === i && styles.whenChipOn]}
                  pressedStyle={styles.projectRowPressed}
                >
                  <Text style={[styles.whenText, when === i && styles.whenTextOn]}>{o.label}</Text>
                </PressableSurface>
              ))}
            </View>

            <Text style={styles.label}>Photo (optional)</Text>
            {photo ? (
              <View style={styles.photoWrap}>
                <Image source={{ uri: photo.uri }} style={styles.photo} />
                <Pressable onPress={() => setPhoto(null)} style={styles.photoRemove} hitSlop={8} accessibilityLabel="Remove photo">
                  <Ionicons name="close" size={16} color={colors.white} />
                </Pressable>
              </View>
            ) : (
              <View style={styles.photoButtons}>
                <View style={{ flex: 1 }}>
                  <AppButton title="Take photo" variant="secondary" onPress={() => pickPhoto(true)} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppButton title="Choose photo" variant="secondary" onPress={() => pickPhoto(false)} />
                </View>
              </View>
            )}

            {photoError ? <AppAlert tone="warning" message={photoError} /> : null}

            <Text style={styles.label}>Location (optional)</Text>
            {coords ? (
              <View style={styles.locationOn}>
                <Ionicons name="location" size={16} color={colors.success} />
                <Text style={styles.locationText}>
                  Location added ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})
                </Text>
                <Pressable onPress={() => setCoords(null)} hitSlop={8}>
                  <Text style={styles.link}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <AppButton
                title={locating ? "Getting location…" : "Add my current location"}
                variant="secondary"
                loading={locating}
                onPress={addLocation}
              />
            )}
            {locationError ? <AppAlert tone="warning" message={locationError} /> : null}
            <Text style={styles.note}>
              Only add your location if you're at the site. It helps inspectors find the problem; it isn't linked to you.
            </Text>

            {error ? <AppAlert tone="error" message={error} /> : null}
            <View style={{ marginTop: spacing.lg }}>
              <AppButton title="Send report" variant="primary" onPress={submit} loading={submitting} disabled={!canSubmit} />
            </View>
          </>
        ) : null}

        {step === "done" && result ? (
          <>
            <View style={styles.codeCard}>
              <Ionicons name="checkmark-circle" size={36} color={colors.success} />
              <Text style={styles.codeLabel}>Your tracking code</Text>
              <Text style={styles.code} selectable>
                {result.tracking_code}
              </Text>
              <Text style={styles.note}>
                Write it down or share it to yourself. It's the only way to follow this report, because we don't
                know who sent it.
              </Text>
            </View>
            <AppButton
              title="Share code"
              variant="secondary"
              onPress={() =>
                Share.share({ message: `BuildWitness report ${result.tracking_code} — ${result.project_title}` })
              }
            />
            <AppButton
              title="Check status"
              variant="primary"
              onPress={() => router.replace({ pathname: "/(citizen)/track", params: { code: result.tracking_code } })}
            />
            <AppButton title="Done" variant="ghost" onPress={() => router.replace("/(auth)/login")} />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.slate100 },
  header: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing["2xl"],
    paddingBottom: spacing["2xl"],
    gap: spacing.sm,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  backRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: spacing.xs },
  backText: { ...typography.body, color: colors.white, fontWeight: "600" },
  chip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(15,156,146,0.15)",
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { ...typography.caption, color: colors.accent, fontWeight: "700" },
  headerTitle: { ...typography.title, color: colors.white },
  headerSub: { ...typography.body, color: colors.slate400 },
  steps: { flexDirection: "row", gap: 6, marginTop: spacing.sm },
  stepBar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)" },
  stepBarOn: { backgroundColor: colors.accent },
  body: { padding: spacing.lg, gap: spacing.md },
  label: { ...typography.caption, color: colors.inkMuted, fontWeight: "700", marginTop: spacing.sm },
  searchShell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate300,
    backgroundColor: colors.white,
  },
  searchInput: { flex: 1, fontSize: 16, color: colors.ink, paddingVertical: 12 },
  empty: { ...typography.body, color: colors.slate500, textAlign: "center", paddingVertical: spacing.xl },
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  projectRowPressed: { opacity: 0.85 },
  projectIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brandSoft,
  },
  projectTitle: { fontSize: 15, fontWeight: "700", color: colors.ink },
  projectMeta: { ...typography.caption, color: colors.slate500, marginTop: 2 },
  selectedProject: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  categoryCard: {
    width: "48.5%",
    padding: spacing.md,
    gap: 4,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.slate200,
  },
  categoryOn: { borderColor: colors.brand, backgroundColor: colors.brandSoft },
  categoryOnPositive: { borderColor: colors.success, backgroundColor: colors.successSoft },
  categoryLabel: { fontSize: 14, fontWeight: "700", color: colors.slate700 },
  categoryHint: { ...typography.caption, color: colors.slate500 },
  textArea: {
    minHeight: 120,
    padding: 14,
    fontSize: 16,
    color: colors.ink,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.slate300,
    backgroundColor: colors.white,
  },
  counter: { ...typography.caption, color: colors.slate500, textAlign: "right" },
  whenRow: { flexDirection: "row", gap: spacing.sm },
  whenChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.slate300,
    backgroundColor: colors.white,
  },
  whenChipOn: { borderColor: colors.brand, backgroundColor: colors.brand },
  whenText: { fontSize: 14, fontWeight: "600", color: colors.slate700 },
  whenTextOn: { color: colors.white },
  photoButtons: { flexDirection: "row", gap: spacing.sm },
  photoWrap: { borderRadius: radius.md, overflow: "hidden" },
  photo: { width: "100%", height: 200 },
  photoRemove: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(15,23,42,0.7)",
  },
  locationOn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  locationText: { flex: 1, ...typography.caption, color: colors.inkMuted, fontWeight: "600" },
  link: { ...typography.caption, color: colors.brand, fontWeight: "700" },
  note: { ...typography.caption, color: colors.slate500, lineHeight: 18 },
  codeCard: {
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing["2xl"],
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.slate200,
  },
  codeLabel: { ...typography.caption, color: colors.slate500, fontWeight: "700" },
  code: { fontSize: 30, fontWeight: "800", letterSpacing: 3, color: colors.ink },
});
