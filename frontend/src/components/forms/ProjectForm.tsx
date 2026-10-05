import { useEffect, useMemo, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { Agency, Contractor } from "@/features/organizations/types";
import type { CreateProjectPayload, Project } from "@/features/projects/types";
import { parseProjectLocationInput } from "@/features/projects/utils";

export type ProjectFormValues = Omit<CreateProjectPayload, "agency" | "contractor" | "latitude" | "longitude"> & {
  agency: number | "";
  contractor: number | "";
  location_input: string;
};

function toIsoDate(value: Date) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Blank starting values for a new project. Nothing site-specific is pre-filled,
 * so a project can't be created at a demo location or budget by accident; the
 * only defaults are derived from today's date or mirror backend defaults.
 */
export function getDefaultProjectFormValues(): ProjectFormValues {
  const today = new Date();
  const oneYearOut = new Date(today);
  oneYearOut.setFullYear(today.getFullYear() + 1);

  return {
    project_code: "",
    title: "",
    description: "",
    agency: "",
    contractor: "",
    supervising_department: "",
    category: "",
    sector: "",
    state: "",
    lga: "",
    ward: "",
    site_address: "",
    location_input: "",
    geo_fence_radius_meters: 50, // backend model default
    budget_amount: 0,
    currency: "NGN",
    funding_cycle: `${today.getFullYear()}-Q${Math.floor(today.getMonth() / 3) + 1}`,
    start_date: toIsoDate(today),
    expected_end_date: toIsoDate(oneYearOut),
    requires_independent_validation: true,
    risk_status: "LOW",
    current_status: "NOT_STARTED"
  };
}

// New projects may only start in these states (enforced by the API as well).
const CREATE_STATUSES = [
  { value: "NOT_STARTED", label: "Not Started" },
  { value: "ACTIVE", label: "Active" },
];
const ALL_STATUSES = [
  ...CREATE_STATUSES,
  { value: "AWAITING_VERIFICATION", label: "Awaiting Verification" },
  { value: "APPROVED_FOR_FUNDING", label: "Approved for Funding" },
  { value: "DELAYED", label: "Delayed" },
  { value: "FLAGGED", label: "Flagged" },
  { value: "COMPLETED", label: "Completed" },
];

type Props = {
  agencies: Agency[];
  contractors: Contractor[];
  initialValues?: ProjectFormValues;
  onSubmit: (payload: CreateProjectPayload) => Promise<void> | void;
  loading?: boolean;
  submitLabel: string;
  submitError?: string | null;
};

export function getProjectFormValues(project: Project): ProjectFormValues {
  return {
    project_code: project.project_code,
    title: project.title,
    description: project.description ?? "",
    agency: project.agency.id,
    contractor: project.contractor.id,
    supervising_department: project.supervising_department,
    category: project.category,
    sector: project.sector,
    state: project.state,
    lga: project.lga,
    ward: project.ward,
    site_address: project.site_address,
    location_input: `${project.latitude}, ${project.longitude}`,
    geo_fence_radius_meters: project.geo_fence_radius_meters,
    budget_amount: Number(project.budget_amount),
    currency: project.currency,
    funding_cycle: project.funding_cycle,
    start_date: project.start_date,
    expected_end_date: project.expected_end_date,
    requires_independent_validation: project.requires_independent_validation,
    risk_status: project.risk_status,
    current_status: project.current_status
  };
}

export function ProjectForm({
  agencies,
  contractors,
  initialValues,
  onSubmit,
  loading,
  submitLabel,
  submitError
}: Props) {
  const isCreate = !initialValues;
  const [form, setForm] = useState<ProjectFormValues>(() => initialValues ?? getDefaultProjectFormValues());
  const statusOptions = isCreate ? CREATE_STATUSES : ALL_STATUSES;
  const [locationError, setLocationError] = useState<string | null>(null);
  const parsedLocation = useMemo(() => parseProjectLocationInput(form.location_input), [form.location_input]);

  useEffect(() => {
    if (initialValues) {
      setForm(initialValues);
    }
  }, [initialValues]);

  return (
    <form
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();

        if (!form.agency || !form.contractor) {
          return;
        }

        if (!parsedLocation) {
          setLocationError("Paste a full Google Maps URL with coordinates or enter the site as latitude, longitude.");
          return;
        }

        setLocationError(null);
        onSubmit({
          ...form,
          agency: Number(form.agency),
          contractor: Number(form.contractor),
          latitude: parsedLocation.latitude,
          longitude: parsedLocation.longitude
        });
      }}
    >
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Project Identity</h2>
          <p className="mt-1 text-sm text-slate-500">Capture the formal reference, ownership, and procurement context.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Project Code</label>
            <Input
              value={form.project_code}
              onChange={(event) => setForm((current) => ({ ...current, project_code: event.target.value.toUpperCase() }))}
              placeholder="PRJ-2026-001"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Title</label>
            <Input
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Primary Health Centre Upgrade"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Description</label>
            <textarea
              className="min-h-28 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Summarize the intervention scope, intended outcomes, and delivery context."
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Funding Agency</label>
            <Select
              value={form.agency}
              onChange={(event) => setForm((current) => ({ ...current, agency: event.target.value ? Number(event.target.value) : "" }))}
              required
            >
              <option value="">-- Select Funding Agency --</option>
              {agencies.map((agency) => (
                <option key={agency.id} value={agency.id}>
                  {agency.name} ({agency.code})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Assigned Contractor</label>
            <Select
              value={form.contractor}
              onChange={(event) =>
                setForm((current) => ({ ...current, contractor: event.target.value ? Number(event.target.value) : "" }))
              }
              required
            >
              <option value="">-- Select Assigned Contractor --</option>
              {contractors.map((contractor) => (
                <option key={contractor.id} value={contractor.id}>
                  {contractor.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Supervising Department</label>
            <Input
              value={form.supervising_department}
              onChange={(event) => setForm((current) => ({ ...current, supervising_department: event.target.value }))}
              placeholder="Infrastructure Delivery Unit"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Category</label>
            <Input
              value={form.category}
              onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))}
              placeholder="BUILDING"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Sector</label>
            <Input
              value={form.sector}
              onChange={(event) => setForm((current) => ({ ...current, sector: event.target.value }))}
              placeholder="HEALTH"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Project Status</label>
            <Select
              value={form.current_status}
              onChange={(event) => setForm((current) => ({ ...current, current_status: event.target.value }))}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Site Profile</h2>
          <p className="mt-1 text-sm text-slate-500">Tie the project to its physical location and geo-verification boundary.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Site Address</label>
            <Input
              value={form.site_address}
              onChange={(event) => setForm((current) => ({ ...current, site_address: event.target.value }))}
              placeholder="12 Alagbaka Road, Akure"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">State</label>
            <Input
              value={form.state}
              onChange={(event) => setForm((current) => ({ ...current, state: event.target.value }))}
              placeholder="Ondo"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">LGA / District</label>
            <Input
              value={form.lga}
              onChange={(event) => setForm((current) => ({ ...current, lga: event.target.value }))}
              placeholder="Akure North"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Ward</label>
            <Input
              value={form.ward}
              onChange={(event) => setForm((current) => ({ ...current, ward: event.target.value }))}
              placeholder="Ward 1"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Geo-fence Radius (Meters)</label>
            <Input
              type="number"
              min="1"
              value={form.geo_fence_radius_meters}
              onChange={(event) =>
                setForm((current) => ({ ...current, geo_fence_radius_meters: Number(event.target.value) || 0 }))
              }
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">Google Maps URL or Coordinates</label>
            <Input
              value={form.location_input}
              onChange={(event) => {
                setForm((current) => ({ ...current, location_input: event.target.value }));
                if (locationError) {
                  setLocationError(null);
                }
              }}
              placeholder="7.2500, 5.2200"
              required
            />
            <p className="mt-2 text-xs text-slate-500">
              Paste a full Google Maps URL with coordinates, or enter a pair like `7.2500, 5.2200`.
            </p>
          </div>
        </div>

        {parsedLocation ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Location captured as {parsedLocation.latitude.toFixed(6)}, {parsedLocation.longitude.toFixed(6)}.
          </div>
        ) : null}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Funding Window</h2>
          <p className="mt-1 text-sm text-slate-500">Set budget, risk posture, and delivery dates for monitoring.</p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Budget Amount</label>
            <Input
              type="number"
              min="1"
              value={form.budget_amount || ""}
              placeholder="Approved budget"
              onChange={(event) => setForm((current) => ({ ...current, budget_amount: Number(event.target.value) || 0 }))}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Currency</label>
            <Input
              value={form.currency}
              onChange={(event) => setForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))}
              placeholder="NGN"
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Funding Cycle</label>
            <Input
              value={form.funding_cycle}
              onChange={(event) => setForm((current) => ({ ...current, funding_cycle: event.target.value }))}
              placeholder="e.g. 2027-Q1"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Risk Status</label>
            <Select
              value={form.risk_status}
              onChange={(event) => setForm((current) => ({ ...current, risk_status: event.target.value }))}
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Start Date</label>
            <Input
              type="date"
              value={form.start_date}
              onChange={(event) => setForm((current) => ({ ...current, start_date: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Expected End Date</label>
            <Input
              type="date"
              value={form.expected_end_date}
              onChange={(event) => setForm((current) => ({ ...current, expected_end_date: event.target.value }))}
              required
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Independent Validation</label>
            <Select
              value={form.requires_independent_validation ? "true" : "false"}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  requires_independent_validation: event.target.value === "true"
                }))
              }
            >
              <option value="true">Required</option>
              <option value="false">Not Required</option>
            </Select>
          </div>
        </div>
      </section>

      {locationError ? <Alert message={locationError} variant="error" /> : null}
      {submitError ? <Alert message={submitError} variant="error" /> : null}

      <Button className="w-full" type="submit" disabled={loading}>
        {loading ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
