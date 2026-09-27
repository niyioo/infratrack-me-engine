import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Check,
  CheckCircle2,
  Copy,
  Loader2,
  LocateFixed,
  MapPin,
  ShieldCheck,
  X,
} from "lucide-react";
import { getProject, submitReport, type PublicProject, type ReportStatus } from "@/api";
import { CATEGORIES } from "@/categories";
import clsx from "@/lib/clsx";

const MIN_DESCRIPTION = 20;
const MAX_DESCRIPTION = 2000;
const MAX_PHOTO_MB = 10;

function today() {
  return new Date().toISOString().slice(0, 10);
}

export function ReportPage() {
  const { projectId = "" } = useParams();
  const [project, setProject] = useState<PublicProject | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [observedOn, setObservedOn] = useState(today());
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportStatus | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getProject(projectId)
      .then(setProject)
      .catch(() => setLoadError("This project could not be found or is no longer open for reports."));
  }, [projectId]);

  useEffect(() => {
    if (!photo) {
      setPhotoPreview(null);
      return;
    }
    const url = URL.createObjectURL(photo);
    setPhotoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  function handlePhoto(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Please choose a photo (JPEG or PNG).");
    if (file.size > MAX_PHOTO_MB * 1024 * 1024) return setError(`Photo must be ${MAX_PHOTO_MB} MB or smaller.`);
    setPhoto(file);
  }

  function handleLocate() {
    if (!navigator.geolocation) return setError("Your browser can't share location.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setError("Location wasn't shared. That's fine, it's optional.");
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  const descriptionLength = description.trim().length;
  const canSubmit = Boolean(category) && descriptionLength >= MIN_DESCRIPTION && !submitting;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit || !project) return;
    setSubmitting(true);
    setError(null);

    const form = new FormData();
    form.append("project_id", String(project.id));
    form.append("category", category);
    form.append("description", description.trim());
    if (observedOn) form.append("observed_on", observedOn);
    if (coords) {
      form.append("latitude", coords.lat.toFixed(6));
      form.append("longitude", coords.lng.toFixed(6));
    }
    if (photo) form.append("photo", photo);
    form.append("website", website);

    try {
      setResult(await submitReport(form));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  if (result) return <SubmittedCard result={result} />;

  if (loadError) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-card">
        <p className="font-semibold text-slate-800">{loadError}</p>
        <Link to="/" className="mt-4 inline-block text-sm font-semibold text-brand hover:underline">
          Back to project search
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-brand">
        <ArrowLeft size={15} /> Choose a different project
      </Link>

      {/* Project summary */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
        {project ? (
          <>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Reporting on · {project.project_code}
            </p>
            <h1 className="mt-1 text-xl font-bold leading-snug tracking-tight">{project.title}</h1>
            <p className="mt-2 flex items-start gap-1.5 text-sm text-slate-500">
              <MapPin size={14} className="mt-0.5 shrink-0" />
              {project.site_address}, {project.lga}, {project.state}
            </p>
          </>
        ) : (
          <div className="animate-pulse space-y-3">
            <div className="h-3 w-32 rounded bg-slate-100" />
            <div className="h-5 w-3/4 rounded bg-slate-100" />
            <div className="h-3 w-1/2 rounded bg-slate-100" />
          </div>
        )}
      </section>

      {/* Category */}
      <fieldset className="space-y-3">
        <legend className="text-lg font-bold tracking-tight">2. What did you see?</legend>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {CATEGORIES.map(({ value, label, hint, icon: Icon, positive }) => {
            const selected = category === value;
            return (
              <label
                key={value}
                className={clsx(
                  "flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3.5 transition",
                  selected
                    ? positive
                      ? "border-accent ring-2 ring-accent/25"
                      : "border-brand ring-2 ring-brand/20"
                    : "border-slate-200 hover:border-slate-300"
                )}
              >
                <input
                  type="radio"
                  name="category"
                  value={value}
                  checked={selected}
                  onChange={() => setCategory(value)}
                  className="sr-only"
                />
                <span
                  className={clsx(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                    positive ? "bg-accent-soft text-accent-strong" : "bg-brand-soft text-brand"
                  )}
                >
                  <Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-900">{label}</span>
                  <span className="block text-xs leading-5 text-slate-500">{hint}</span>
                </span>
                {selected && <Check size={16} className={positive ? "text-accent" : "text-brand"} />}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Details */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight">3. Tell us more</h2>

        <div>
          <label htmlFor="description" className="mb-1.5 block text-sm font-semibold text-slate-700">
            Describe what you saw
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESCRIPTION))}
            rows={5}
            placeholder="What is happening on site? How long has it been like this? Please don't include your name or anyone's personal details."
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-4 py-3 text-base leading-6 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <p
            className={clsx(
              "mt-1 text-right text-xs",
              descriptionLength > 0 && descriptionLength < MIN_DESCRIPTION ? "text-amber-600" : "text-slate-400"
            )}
          >
            {descriptionLength < MIN_DESCRIPTION
              ? `At least ${MIN_DESCRIPTION - descriptionLength} more characters`
              : `${descriptionLength} / ${MAX_DESCRIPTION}`}
          </p>
        </div>

        <div>
          <label htmlFor="observed_on" className="mb-1.5 block text-sm font-semibold text-slate-700">
            When did you see this?
          </label>
          <input
            id="observed_on"
            type="date"
            value={observedOn}
            max={today()}
            onChange={(e) => setObservedOn(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 sm:w-60"
          />
        </div>

        {/* Photo */}
        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-700">
            Photo <span className="font-normal text-slate-400">(optional, but very helpful)</span>
          </p>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handlePhoto(e.target.files?.[0])}
          />
          {photoPreview ? (
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-white">
              <img src={photoPreview} alt="Selected site photo" className="max-h-72 w-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
                className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-slate-900/70 text-white hover:bg-slate-900"
                aria-label="Remove photo"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-7 text-sm font-medium text-slate-600 transition hover:border-brand/50 hover:bg-brand-soft/40"
            >
              <Camera size={22} className="text-brand" />
              Take or choose a photo
              <span className="text-xs font-normal text-slate-400">Location and camera details are removed</span>
            </button>
          )}
        </div>

        {/* Location */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
          <LocateFixed size={18} className="shrink-0 text-slate-400" />
          <p className="min-w-0 flex-1 text-sm text-slate-600">
            {coords
              ? `Location added (${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)})`
              : "Are you at the site? Sharing your location helps confirm the report."}
          </p>
          {coords ? (
            <button type="button" onClick={() => setCoords(null)} className="text-sm font-semibold text-slate-500 hover:text-red-600">
              Remove
            </button>
          ) : (
            <button
              type="button"
              onClick={handleLocate}
              disabled={locating}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-60"
            >
              {locating && <Loader2 size={14} className="animate-spin" />}
              Add location
            </button>
          )}
        </div>
      </section>

      {/* Honeypot: invisible to people, tempting to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="space-y-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand py-3.5 text-base font-bold text-white shadow-card transition hover:bg-brand-strong disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
        >
          {submitting ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
          {submitting ? "Sending securely…" : "Send anonymous report"}
        </button>
        {!category && <p className="text-center text-xs text-slate-400">Choose what you saw to continue.</p>}
      </div>
    </form>
  );
}

function SubmittedCard({ result }: { result: ReportStatus }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(result.tracking_code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable; the code is still visible */
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-card sm:p-10">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
        <CheckCircle2 size={30} />
      </span>
      <h1 className="mt-4 text-2xl font-extrabold tracking-tight">Thank you. Your report was sent.</h1>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
        The monitoring team will review it. Save this code: it's the only way to check on your report, because we
        don't know who you are.
      </p>

      <div className="mx-auto mt-6 flex max-w-xs items-center justify-between gap-3 rounded-xl border-2 border-dashed border-brand/30 bg-brand-soft px-4 py-3">
        <span className="font-mono text-xl font-bold tracking-widest text-brand">{result.tracking_code}</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-brand shadow-sm"
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <Link
          to={`/track/${result.tracking_code}`}
          className="rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-white hover:bg-brand-strong"
        >
          Check status
        </Link>
        <Link to="/" className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Report another project
        </Link>
      </div>
    </div>
  );
}
