import { useMemo, useState } from "react";
import { PageShell } from "@/app/layouts/PageShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/features/auth/hooks";
import {
  useAgencies,
  useContractors,
  useCreateAgency,
  useCreateContractor,
  useDeleteAgency,
  useDeleteContractor,
  useUpdateAgency,
  useUpdateContractor
} from "@/features/organizations/hooks";
import type { Agency, Contractor } from "@/features/organizations/types";
import { getApiErrorMessage } from "@/lib/api/errors";

const agencyTypeOptions = ["MINISTRY", "DEPARTMENT", "AGENCY", "PARASTATAL", "PROGRAMME"];
const contractorRiskOptions = ["LOW", "MEDIUM", "HIGH"];

type AgencyFormState = {
  name: string;
  code: string;
  type: string;
  state_scope: string;
  is_active: boolean;
};

type ContractorFormState = {
  name: string;
  registration_number: string;
  contact_person: string;
  email: string;
  phone: string;
  address: string;
  risk_level: string;
  is_active: boolean;
};

const initialAgencyForm: AgencyFormState = {
  name: "",
  code: "",
  type: "MINISTRY",
  state_scope: "Ondo",
  is_active: true
};

const initialContractorForm: ContractorFormState = {
  name: "",
  registration_number: "",
  contact_person: "",
  email: "",
  phone: "",
  address: "",
  risk_level: "LOW",
  is_active: true
};

function getAgencyFormState(agency: Agency): AgencyFormState {
  return {
    name: agency.name,
    code: agency.code,
    type: agency.type,
    state_scope: agency.state_scope,
    is_active: agency.is_active
  };
}

function getContractorFormState(contractor: Contractor): ContractorFormState {
  return {
    name: contractor.name,
    registration_number: contractor.registration_number,
    contact_person: contractor.contact_person,
    email: contractor.email,
    phone: contractor.phone,
    address: contractor.address,
    risk_level: contractor.risk_level,
    is_active: contractor.is_active
  };
}

function StatusChip({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
        isActive ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-100 text-slate-600"
      }`}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

export function VendorsPage() {
  const { capabilities } = useAuth();
  const canManageDirectory = capabilities.includes("users.view_directory");

  const agenciesQuery = useAgencies({});
  const contractorsQuery = useContractors({});
  const createAgency = useCreateAgency();
  const updateAgency = useUpdateAgency();
  const deleteAgency = useDeleteAgency();
  const createContractor = useCreateContractor();
  const updateContractor = useUpdateContractor();
  const deleteContractor = useDeleteContractor();

  const [agencyForm, setAgencyForm] = useState(initialAgencyForm);
  const [contractorForm, setContractorForm] = useState(initialContractorForm);
  const [agencyFeedback, setAgencyFeedback] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [contractorFeedback, setContractorFeedback] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [editingAgency, setEditingAgency] = useState<Agency | null>(null);
  const [editingAgencyForm, setEditingAgencyForm] = useState<AgencyFormState>(initialAgencyForm);
  const [agencyPendingDelete, setAgencyPendingDelete] = useState<Agency | null>(null);
  const [editingContractor, setEditingContractor] = useState<Contractor | null>(null);
  const [editingContractorForm, setEditingContractorForm] = useState<ContractorFormState>(initialContractorForm);
  const [contractorPendingDelete, setContractorPendingDelete] = useState<Contractor | null>(null);

  const agencies = agenciesQuery.data ?? [];
  const contractors = contractorsQuery.data ?? [];

  const stats = useMemo(
    () => ({
      agencyCount: agencies.length,
      activeAgencyCount: agencies.filter((agency) => agency.is_active).length,
      contractorCount: contractors.length,
      activeContractorCount: contractors.filter((contractor) => contractor.is_active).length
    }),
    [agencies, contractors]
  );

  async function handleCreateAgency(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAgencyFeedback(null);

    try {
      await createAgency.mutateAsync({
        ...agencyForm,
        name: agencyForm.name.trim(),
        code: agencyForm.code.trim().toUpperCase(),
        state_scope: agencyForm.state_scope.trim()
      });
      setAgencyForm(initialAgencyForm);
      setAgencyFeedback({ message: "Funding agency added to the directory.", variant: "success" });
    } catch (error) {
      setAgencyFeedback({
        message: getApiErrorMessage(error, "Civitness could not create the funding agency right now."),
        variant: "error"
      });
    }
  }

  async function handleUpdateAgency() {
    if (!editingAgency) {
      return;
    }

    setAgencyFeedback(null);

    try {
      await updateAgency.mutateAsync({
        agencyId: editingAgency.id,
        payload: {
          ...editingAgencyForm,
          name: editingAgencyForm.name.trim(),
          code: editingAgencyForm.code.trim().toUpperCase(),
          state_scope: editingAgencyForm.state_scope.trim()
        }
      });
      setAgencyFeedback({ message: "Funding agency updated successfully.", variant: "success" });
      setEditingAgency(null);
    } catch (error) {
      setAgencyFeedback({
        message: getApiErrorMessage(error, "Civitness could not update the funding agency right now."),
        variant: "error"
      });
    }
  }

  async function handleDeleteAgency() {
    if (!agencyPendingDelete) {
      return;
    }

    try {
      await deleteAgency.mutateAsync(agencyPendingDelete.id);
      setAgencyFeedback({ message: `${agencyPendingDelete.name} was removed from the directory.`, variant: "success" });
      setAgencyPendingDelete(null);
    } catch (error) {
      setAgencyFeedback({
        message: getApiErrorMessage(error, "Civitness could not delete this funding agency right now."),
        variant: "error"
      });
    }
  }

  async function handleCreateContractor(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setContractorFeedback(null);

    try {
      await createContractor.mutateAsync({
        ...contractorForm,
        name: contractorForm.name.trim(),
        registration_number: contractorForm.registration_number.trim().toUpperCase(),
        address: contractorForm.address.trim()
      });
      setContractorForm(initialContractorForm);
      setContractorFeedback({ message: "Contractor added to the directory.", variant: "success" });
    } catch (error) {
      setContractorFeedback({
        message: getApiErrorMessage(error, "Civitness could not create the contractor right now."),
        variant: "error"
      });
    }
  }

  async function handleUpdateContractor() {
    if (!editingContractor) {
      return;
    }

    setContractorFeedback(null);

    try {
      await updateContractor.mutateAsync({
        contractorId: editingContractor.id,
        payload: {
          ...editingContractorForm,
          name: editingContractorForm.name.trim(),
          registration_number: editingContractorForm.registration_number.trim().toUpperCase(),
          address: editingContractorForm.address.trim()
        }
      });
      setContractorFeedback({ message: "Contractor updated successfully.", variant: "success" });
      setEditingContractor(null);
    } catch (error) {
      setContractorFeedback({
        message: getApiErrorMessage(error, "Civitness could not update the contractor right now."),
        variant: "error"
      });
    }
  }

  async function handleDeleteContractor() {
    if (!contractorPendingDelete) {
      return;
    }

    try {
      await deleteContractor.mutateAsync(contractorPendingDelete.id);
      setContractorFeedback({ message: `${contractorPendingDelete.name} was removed from the directory.`, variant: "success" });
      setContractorPendingDelete(null);
    } catch (error) {
      setContractorFeedback({
        message: getApiErrorMessage(error, "Civitness could not delete this contractor right now."),
        variant: "error"
      });
    }
  }

  if (agenciesQuery.isLoading || contractorsQuery.isLoading) {
    return (
      <PageShell title="Vendors" description="Loading vendor directories...">
        <QueryStateCard
          state="loading"
          title="Loading vendor directories"
          description="Preparing agencies and contractors used across project registration and execution tracking."
        />
      </PageShell>
    );
  }

  if (agenciesQuery.isError || contractorsQuery.isError) {
    return (
      <PageShell title="Vendors" description="Directory workspace for agencies and contractors.">
        <QueryStateCard
          state="error"
          title="Vendor directories unavailable"
          description="Civitness could not load agencies or contractors right now."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Vendors"
      description="Manage the funding agencies and delivery contractors referenced by project procurement workflows."
    >
      {!canManageDirectory ? (
        <Alert
          variant="info"
          title="Read-only directory access"
          message="This account can review vendors used by projects, but only directory administrators can add, update, or delete agencies and contractors."
        />
      ) : null}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Agencies</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.agencyCount}</p>
          <p className="mt-1 text-sm text-slate-500">{stats.activeAgencyCount} active for project setup</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Contractors</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.contractorCount}</p>
          <p className="mt-1 text-sm text-slate-500">{stats.activeContractorCount} active for assignment</p>
        </Card>
        <Card className="p-5 md:col-span-2">
          <p className="text-sm font-medium text-slate-500">Procurement Context</p>
          <p className="mt-2 text-sm text-slate-700">
            Projects reference labeled directory records instead of relying on unlabeled defaults. Keep this directory current so teams can assign the right funding owner and executing contractor at project creation time.
          </p>
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Funding Agency Directory</h2>
            <p className="mt-1 text-sm text-slate-500">
              Register ministries, departments, agencies, and program offices that own or fund projects.
            </p>
          </div>

          {agencyFeedback ? <div className="mt-4"><Alert variant={agencyFeedback.variant} message={agencyFeedback.message} /></div> : null}

          {canManageDirectory ? (
            <form className="mt-5 space-y-4" onSubmit={handleCreateAgency}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Agency Name</label>
                  <Input
                    value={agencyForm.name}
                    onChange={(event) => setAgencyForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Federal Monitoring Works - Ondo"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Agency Code</label>
                  <Input
                    value={agencyForm.code}
                    onChange={(event) => setAgencyForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
                    placeholder="FMW-OND"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Agency Type</label>
                  <Select value={agencyForm.type} onChange={(event) => setAgencyForm((current) => ({ ...current, type: event.target.value }))}>
                    {agencyTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">State Scope</label>
                  <Input
                    value={agencyForm.state_scope}
                    onChange={(event) => setAgencyForm((current) => ({ ...current, state_scope: event.target.value }))}
                    placeholder="Ondo"
                  />
                </div>
              </div>

              <Button type="submit" disabled={createAgency.isPending}>
                {createAgency.isPending ? "Adding agency..." : "Add Funding Agency"}
              </Button>
            </form>
          ) : null}

          <div className="mt-6 space-y-3">
            {agencies.length > 0 ? (
              agencies.map((agency) => (
                <div key={agency.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{agency.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {agency.code} / {agency.type}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip isActive={agency.is_active} />
                      {canManageDirectory ? (
                        <>
                          <Button
                            type="button"
                            className="border border-slate-300 bg-white px-3 py-1 text-slate-900 shadow-none hover:bg-slate-50"
                            onClick={() => {
                              setEditingAgency(agency);
                              setEditingAgencyForm(getAgencyFormState(agency));
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            className="bg-red-600 px-3 py-1 shadow-none hover:bg-red-700"
                            onClick={() => setAgencyPendingDelete(agency)}
                          >
                            Delete
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    {agency.state_scope ? `Scope: ${agency.state_scope}` : "No state scope configured."}
                  </p>
                </div>
              ))
            ) : (
              <QueryStateCard
                state="empty"
                title="No funding agencies yet"
                description="Add the first funding agency so project teams can assign ownership during setup."
              />
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Contractor Directory</h2>
            <p className="mt-1 text-sm text-slate-500">
              Maintain the executing vendors responsible for site delivery, milestone evidence, and fund utilization.
            </p>
          </div>

          {contractorFeedback ? <div className="mt-4"><Alert variant={contractorFeedback.variant} message={contractorFeedback.message} /></div> : null}

          {canManageDirectory ? (
            <form className="mt-5 space-y-4" onSubmit={handleCreateContractor}>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Contractor Name</label>
                  <Input
                    value={contractorForm.name}
                    onChange={(event) => setContractorForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="PrimeBuild Nigeria Ltd"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Registration Number</label>
                  <Input
                    value={contractorForm.registration_number}
                    onChange={(event) =>
                      setContractorForm((current) => ({ ...current, registration_number: event.target.value.toUpperCase() }))
                    }
                    placeholder="RC-20415"
                    required
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Contact Person</label>
                  <Input
                    value={contractorForm.contact_person}
                    onChange={(event) => setContractorForm((current) => ({ ...current, contact_person: event.target.value }))}
                    placeholder="Amina Yusuf"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Risk Level</label>
                  <Select
                    value={contractorForm.risk_level}
                    onChange={(event) => setContractorForm((current) => ({ ...current, risk_level: event.target.value }))}
                  >
                    {contractorRiskOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                  <Input
                    type="email"
                    value={contractorForm.email}
                    onChange={(event) => setContractorForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="contact@primebuild.ng"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
                  <Input
                    value={contractorForm.phone}
                    onChange={(event) => setContractorForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="+234 800 000 0000"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-slate-700">Address</label>
                  <Input
                    value={contractorForm.address}
                    onChange={(event) => setContractorForm((current) => ({ ...current, address: event.target.value }))}
                    placeholder="12 Alagbaka Road, Akure"
                  />
                </div>
              </div>

              <Button type="submit" disabled={createContractor.isPending}>
                {createContractor.isPending ? "Adding contractor..." : "Add Contractor"}
              </Button>
            </form>
          ) : null}

          <div className="mt-6 space-y-3">
            {contractors.length > 0 ? (
              contractors.map((contractor) => (
                <div key={contractor.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{contractor.name}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-500">
                        {contractor.registration_number} / {contractor.risk_level} risk
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusChip isActive={contractor.is_active} />
                      {canManageDirectory ? (
                        <>
                          <Button
                            type="button"
                            className="border border-slate-300 bg-white px-3 py-1 text-slate-900 shadow-none hover:bg-slate-50"
                            onClick={() => {
                              setEditingContractor(contractor);
                              setEditingContractorForm(getContractorFormState(contractor));
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            type="button"
                            className="bg-red-600 px-3 py-1 shadow-none hover:bg-red-700"
                            onClick={() => setContractorPendingDelete(contractor)}
                          >
                            Delete
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-sm text-slate-600 md:grid-cols-2">
                    <p>{contractor.contact_person || "No contact person recorded."}</p>
                    <p>{contractor.email || contractor.phone || "No contact channel recorded."}</p>
                  </div>
                </div>
              ))
            ) : (
              <QueryStateCard
                state="empty"
                title="No contractors yet"
                description="Add the first contractor so projects can assign an executing vendor."
              />
            )}
          </div>
        </Card>
      </section>

      <Modal
        open={!!editingAgency}
        title="Edit Funding Agency"
        onClose={() => {
          if (!updateAgency.isPending) {
            setEditingAgency(null);
          }
        }}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Agency Name</label>
              <Input
                value={editingAgencyForm.name}
                onChange={(event) => setEditingAgencyForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Agency Code</label>
              <Input
                value={editingAgencyForm.code}
                onChange={(event) => setEditingAgencyForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Agency Type</label>
              <Select
                value={editingAgencyForm.type}
                onChange={(event) => setEditingAgencyForm((current) => ({ ...current, type: event.target.value }))}
              >
                {agencyTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">State Scope</label>
              <Input
                value={editingAgencyForm.state_scope}
                onChange={(event) => setEditingAgencyForm((current) => ({ ...current, state_scope: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
              <Select
                value={editingAgencyForm.is_active ? "true" : "false"}
                onChange={(event) =>
                  setEditingAgencyForm((current) => ({ ...current, is_active: event.target.value === "true" }))
                }
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              className="border border-slate-300 bg-white text-slate-900 shadow-none hover:bg-slate-50"
              onClick={() => setEditingAgency(null)}
              disabled={updateAgency.isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdateAgency} disabled={updateAgency.isPending}>
              {updateAgency.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!agencyPendingDelete}
        title="Delete Funding Agency"
        onClose={() => {
          if (!deleteAgency.isPending) {
            setAgencyPendingDelete(null);
          }
        }}
      >
        {agencyPendingDelete ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Delete <span className="font-semibold text-slate-900">{agencyPendingDelete.name}</span> from the directory?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                className="border border-slate-300 bg-white text-slate-900 shadow-none hover:bg-slate-50"
                onClick={() => setAgencyPendingDelete(null)}
                disabled={deleteAgency.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDeleteAgency}
                disabled={deleteAgency.isPending}
              >
                {deleteAgency.isPending ? "Deleting..." : "Delete Agency"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <Modal
        open={!!editingContractor}
        title="Edit Contractor"
        onClose={() => {
          if (!updateContractor.isPending) {
            setEditingContractor(null);
          }
        }}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Contractor Name</label>
              <Input
                value={editingContractorForm.name}
                onChange={(event) => setEditingContractorForm((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Registration Number</label>
              <Input
                value={editingContractorForm.registration_number}
                onChange={(event) =>
                  setEditingContractorForm((current) => ({ ...current, registration_number: event.target.value.toUpperCase() }))
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Contact Person</label>
              <Input
                value={editingContractorForm.contact_person}
                onChange={(event) => setEditingContractorForm((current) => ({ ...current, contact_person: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Risk Level</label>
              <Select
                value={editingContractorForm.risk_level}
                onChange={(event) => setEditingContractorForm((current) => ({ ...current, risk_level: event.target.value }))}
              >
                {contractorRiskOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <Input
                type="email"
                value={editingContractorForm.email}
                onChange={(event) => setEditingContractorForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
              <Input
                value={editingContractorForm.phone}
                onChange={(event) => setEditingContractorForm((current) => ({ ...current, phone: event.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Address</label>
              <Input
                value={editingContractorForm.address}
                onChange={(event) => setEditingContractorForm((current) => ({ ...current, address: event.target.value }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Status</label>
              <Select
                value={editingContractorForm.is_active ? "true" : "false"}
                onChange={(event) =>
                  setEditingContractorForm((current) => ({ ...current, is_active: event.target.value === "true" }))
                }
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              className="border border-slate-300 bg-white text-slate-900 shadow-none hover:bg-slate-50"
              onClick={() => setEditingContractor(null)}
              disabled={updateContractor.isPending}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleUpdateContractor} disabled={updateContractor.isPending}>
              {updateContractor.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!contractorPendingDelete}
        title="Delete Contractor"
        onClose={() => {
          if (!deleteContractor.isPending) {
            setContractorPendingDelete(null);
          }
        }}
      >
        {contractorPendingDelete ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Delete <span className="font-semibold text-slate-900">{contractorPendingDelete.name}</span> from the directory?
              This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                className="border border-slate-300 bg-white text-slate-900 shadow-none hover:bg-slate-50"
                onClick={() => setContractorPendingDelete(null)}
                disabled={deleteContractor.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDeleteContractor}
                disabled={deleteContractor.isPending}
              >
                {deleteContractor.isPending ? "Deleting..." : "Delete Contractor"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </PageShell>
  );
}
