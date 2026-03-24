import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { useCreateProject } from "@/features/projects/hooks";

export function ProjectCreatePage() {
  const navigate = useNavigate();
  const createProject = useCreateProject();

  const [form, setForm] = useState({
    project_code: "",
    title: "",
    description: "",
    agency: 1,
    contractor: 1,
    supervising_department: "Infrastructure Delivery Unit",
    category: "BUILDING",
    sector: "HEALTH",
    state: "Ondo",
    lga: "Akure North",
    ward: "",
    site_address: "",
    latitude: 7.25,
    longitude: 5.22,
    geo_fence_radius_meters: 50,
    budget_amount: 10000000,
    currency: "NGN",
    funding_cycle: "2026-Q2",
    start_date: "2026-03-01",
    expected_end_date: "2026-09-30",
    requires_independent_validation: true,
    risk_status: "LOW",
    current_status: "NOT_STARTED"
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const project = await createProject.mutateAsync(form);
    navigate(`/projects/${project.id}`);
  }

  return (
    <Card className="max-w-4xl p-6">
      <h1 className="text-xl font-semibold">Create Project</h1>
      <form className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <input className="rounded-lg border p-2" placeholder="Project Code" value={form.project_code} onChange={(e) => setForm({ ...form, project_code: e.target.value })} />
        <input className="rounded-lg border p-2" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <input className="rounded-lg border p-2 md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <input className="rounded-lg border p-2" placeholder="Site Address" value={form.site_address} onChange={(e) => setForm({ ...form, site_address: e.target.value })} />
        <input className="rounded-lg border p-2" placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
        <input className="rounded-lg border p-2" placeholder="LGA" value={form.lga} onChange={(e) => setForm({ ...form, lga: e.target.value })} />
        <input className="rounded-lg border p-2" type="number" placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })} />
        <input className="rounded-lg border p-2" type="number" placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })} />
        <input className="rounded-lg border p-2" type="number" placeholder="Budget Amount" value={form.budget_amount} onChange={(e) => setForm({ ...form, budget_amount: Number(e.target.value) })} />
        <button className="rounded-lg bg-slate-900 px-4 py-2 text-white md:col-span-2" type="submit">
          {createProject.isPending ? "Creating..." : "Create Project"}
        </button>
      </form>
    </Card>
  );
}