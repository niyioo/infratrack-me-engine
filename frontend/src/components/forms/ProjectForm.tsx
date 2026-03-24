import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

type Props = {
  onSubmit: (payload: Record<string, unknown>) => void;
  loading?: boolean;
};

export function ProjectForm({ onSubmit, loading }: Props) {
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

  return (
    <form
      className="grid grid-cols-1 gap-4 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <Input placeholder="Project Code" value={form.project_code} onChange={(e) => setForm({ ...form, project_code: e.target.value })} />
      <Input placeholder="Project Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      <Input className="md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      <Input placeholder="Site Address" value={form.site_address} onChange={(e) => setForm({ ...form, site_address: e.target.value })} />
      <Input placeholder="State" value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} />
      <Input placeholder="LGA" value={form.lga} onChange={(e) => setForm({ ...form, lga: e.target.value })} />
      <Input type="number" placeholder="Latitude" value={form.latitude} onChange={(e) => setForm({ ...form, latitude: Number(e.target.value) })} />
      <Input type="number" placeholder="Longitude" value={form.longitude} onChange={(e) => setForm({ ...form, longitude: Number(e.target.value) })} />
      <Input type="number" placeholder="Budget Amount" value={form.budget_amount} onChange={(e) => setForm({ ...form, budget_amount: Number(e.target.value) })} />
      <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
        <option value="BUILDING">Building</option>
        <option value="ROAD">Road</option>
        <option value="EQUIPMENT">Equipment</option>
      </Select>
      <Button className="md:col-span-2" type="submit" disabled={loading}>
        {loading ? "Saving..." : "Save Project"}
      </Button>
    </form>
  );
}