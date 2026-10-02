import { useMemo, useState } from "react";
import { format } from "date-fns";
import { PageShell } from "@/app/layouts/PageShell";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { QueryStateCard } from "@/components/ui/QueryStateCard";
import { Select } from "@/components/ui/Select";
import { useAuth } from "@/features/auth/hooks";
import { useAgencies } from "@/features/organizations/hooks";
import { useCreateUser, useDeleteUser, useRoles, useUpdateUser, useUsers } from "@/features/users/hooks";
import type { CreateUserPayload, DirectoryUser, UpdateUserPayload } from "@/features/users/types";
import { getApiErrorMessage } from "@/lib/api/errors";

type UserFormState = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_active: boolean;
  password: string;
  role_assignments: Array<{
    role_id: number | "";
    agency_id: number | "";
  }>;
};

const initialUserFormState: UserFormState = {
  email: "",
  first_name: "",
  last_name: "",
  phone: "",
  is_active: true,
  password: "",
  role_assignments: [{ role_id: "", agency_id: "" }]
};

function getUserFormState(user: DirectoryUser): UserFormState {
  return {
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone,
    is_active: user.is_active,
    password: "",
    role_assignments:
      user.role_assignments.length > 0
        ? user.role_assignments.map((assignment) => ({
            role_id: assignment.role_id,
            agency_id: assignment.agency_id ?? ""
          }))
        : [{ role_id: "", agency_id: "" }]
  };
}

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const usersQuery = useUsers();
  const rolesQuery = useRoles();
  const agenciesQuery = useAgencies({});
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [search, setSearch] = useState("");
  const [feedback, setFeedback] = useState<{ message: string; variant: "success" | "error" } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<"create" | "edit">("create");
  const [editingUser, setEditingUser] = useState<DirectoryUser | null>(null);
  const [userForm, setUserForm] = useState<UserFormState>(initialUserFormState);
  const [userPendingDelete, setUserPendingDelete] = useState<DirectoryUser | null>(null);

  const users = usersQuery.data?.items ?? [];
  const roles = rolesQuery.data ?? [];
  const agencies = agenciesQuery.data ?? [];

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return users;
    }

    return users.filter((user) =>
      [user.full_name, user.email, user.phone, user.roles.map((role) => role.name).join(" ")]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch)
    );
  }, [search, users]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.is_active).length,
      inactive: users.filter((user) => !user.is_active).length
    }),
    [users]
  );

  function openCreateModal() {
    setIsEditorOpen(true);
    setEditorMode("create");
    setEditingUser(null);
    setFormError(null);
    setUserForm(initialUserFormState);
  }

  function openEditModal(user: DirectoryUser) {
    setIsEditorOpen(true);
    setEditorMode("edit");
    setEditingUser(user);
    setFormError(null);
    setUserForm(getUserFormState(user));
  }

  function closeEditor() {
    if (createUser.isPending || updateUser.isPending) {
      return;
    }

    setEditingUser(null);
    setFormError(null);
    setIsEditorOpen(false);
    setUserForm(initialUserFormState);
    setEditorMode("create");
  }

  async function handleSubmitUser() {
    const roleAssignments = userForm.role_assignments
      .filter((assignment) => assignment.role_id !== "")
      .map((assignment) => ({
        role_id: Number(assignment.role_id),
        agency_id: assignment.agency_id === "" ? null : Number(assignment.agency_id)
      }));

    if (roleAssignments.length === 0) {
      setFormError("Assign at least one role before saving this user.");
      return;
    }

    if (editorMode === "create" && !userForm.password.trim()) {
      setFormError("Password is required when creating a user.");
      return;
    }

    setFormError(null);

    const basePayload = {
      email: userForm.email.trim().toLowerCase(),
      first_name: userForm.first_name.trim(),
      last_name: userForm.last_name.trim(),
      phone: userForm.phone.trim(),
      is_active: userForm.is_active,
      role_assignments: roleAssignments
    };

    try {
      if (editorMode === "create") {
        const payload: CreateUserPayload = {
          ...basePayload,
          password: userForm.password
        };
        await createUser.mutateAsync(payload);
        setFeedback({ message: "User account created successfully.", variant: "success" });
      } else if (editingUser) {
        const payload: UpdateUserPayload = userForm.password.trim()
          ? { ...basePayload, password: userForm.password }
          : basePayload;
        await updateUser.mutateAsync({ userId: editingUser.id, payload });
        setFeedback({ message: "User account updated successfully.", variant: "success" });
      }

      closeEditor();
    } catch (error) {
      setFormError(
        getApiErrorMessage(
          error,
          editorMode === "create" ? "Civitness could not create this user right now." : "Civitness could not update this user right now."
        )
      );
    }
  }

  async function handleDeleteUser() {
    if (!userPendingDelete) {
      return;
    }

    try {
      await deleteUser.mutateAsync(userPendingDelete.id);
      setFeedback({ message: `${userPendingDelete.full_name} was removed from the directory.`, variant: "success" });
      setUserPendingDelete(null);
    } catch (error) {
      setFeedback({
        message: getApiErrorMessage(error, "Civitness could not delete this user right now."),
        variant: "error"
      });
    }
  }

  if (usersQuery.isLoading || rolesQuery.isLoading || agenciesQuery.isLoading) {
    return (
      <PageShell title="Users" description="Loading user administration...">
        <QueryStateCard
          state="loading"
          title="Loading users"
          description="Preparing directory accounts, available roles, and agency assignments."
        />
      </PageShell>
    );
  }

  if (usersQuery.isError || rolesQuery.isError || agenciesQuery.isError) {
    return (
      <PageShell title="Users" description="Administrative user management workspace.">
        <QueryStateCard
          state="error"
          title="Users unavailable"
          description="Civitness could not load the user directory right now."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Users"
      description="Create, update, and retire user accounts with the role assignments used across the monitoring workspace."
      actions={<Button onClick={openCreateModal}>+ Add User</Button>}
    >
      {feedback ? <Alert message={feedback.message} variant={feedback.variant} /> : null}
      <Alert
        variant="info"
        message="Agency assignment is optional here and can be used when a role should be scoped to a particular funding agency."
      />

      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Total Users</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{stats.total}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Active Accounts</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-700">{stats.active}</p>
        </Card>
        <Card className="p-5">
          <p className="text-sm font-medium text-slate-500">Inactive Accounts</p>
          <p className="mt-2 text-3xl font-semibold text-slate-700">{stats.inactive}</p>
        </Card>
      </section>

      <Card className="p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">User Directory</h2>
            <p className="mt-1 text-sm text-slate-500">Search and manage the accounts that can access Civitness.</p>
          </div>
          <div className="w-full md:max-w-sm">
            <Input placeholder="Search by name, email, phone, or role" value={search} onChange={(event) => setSearch(event.target.value)} />
          </div>
        </div>

        <div className="mt-5 overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Roles</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    No users match the current search.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="border-t border-slate-100">
                    <td className="px-4 py-4">
                      <div>
                        <p className="font-medium text-slate-900">{user.full_name}</p>
                        <p className="text-slate-500">{user.email}</p>
                        <p className="text-slate-500">{user.phone || "No phone number recorded."}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-2">
                        {user.role_assignments.map((assignment) => (
                          <span
                            key={`${user.id}-${assignment.role_id}-${assignment.agency_id ?? "global"}`}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-700"
                          >
                            {assignment.role_name}
                            {assignment.agency_name ? ` - ${assignment.agency_name}` : ""}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
                          user.is_active
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-slate-100 text-slate-600"
                        }`}
                      >
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500">{format(new Date(user.created_at), "dd MMM yyyy")}</td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          className="border border-slate-300 bg-white text-slate-900 shadow-none hover:bg-slate-50"
                          onClick={() => openEditModal(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          className="bg-red-600 shadow-none hover:bg-red-700"
                          onClick={() => setUserPendingDelete(user)}
                          disabled={user.id === currentUser?.id}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Modal
        open={isEditorOpen}
        title={editorMode === "create" ? "Add User" : "Edit User"}
        onClose={closeEditor}
      >
        <div className="space-y-5">
          {formError ? <Alert variant="error" message={formError} /> : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">First Name</label>
              <Input
                value={userForm.first_name}
                onChange={(event) => setUserForm((current) => ({ ...current, first_name: event.target.value }))}
                placeholder="Amina"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Last Name</label>
              <Input
                value={userForm.last_name}
                onChange={(event) => setUserForm((current) => ({ ...current, last_name: event.target.value }))}
                placeholder="Yusuf"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
              <Input
                type="email"
                value={userForm.email}
                onChange={(event) => setUserForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="amina@example.com"
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
              <Input
                value={userForm.phone}
                onChange={(event) => setUserForm((current) => ({ ...current, phone: event.target.value }))}
                placeholder="+234 800 000 0000"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                {editorMode === "create" ? "Password" : "Reset Password"}
              </label>
              <Input
                type="password"
                value={userForm.password}
                onChange={(event) => setUserForm((current) => ({ ...current, password: event.target.value }))}
                placeholder={editorMode === "create" ? "Minimum 8 characters" : "Leave blank to keep the current password"}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">Account Status</label>
              <Select
                value={userForm.is_active ? "true" : "false"}
                onChange={(event) => setUserForm((current) => ({ ...current, is_active: event.target.value === "true" }))}
              >
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Role Assignments</h3>
                <p className="mt-1 text-sm text-slate-500">Add one or more role entries for this account.</p>
              </div>
              <Button
                type="button"
                className="border border-slate-300 bg-white text-slate-900 shadow-none hover:bg-slate-50"
                onClick={() =>
                  setUserForm((current) => ({
                    ...current,
                    role_assignments: [...current.role_assignments, { role_id: "", agency_id: "" }]
                  }))
                }
              >
                Add Role
              </Button>
            </div>

            <div className="space-y-3">
              {userForm.role_assignments.map((assignment, index) => (
                <div key={`${index}-${assignment.role_id}-${assignment.agency_id}`} className="grid grid-cols-1 gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[1fr_1fr_auto]">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Role</label>
                    <Select
                      value={assignment.role_id}
                      onChange={(event) =>
                        setUserForm((current) => ({
                          ...current,
                          role_assignments: current.role_assignments.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, role_id: event.target.value ? Number(event.target.value) : "" } : item
                          )
                        }))
                      }
                    >
                      <option value="">-- Select Role --</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Agency Scope</label>
                    <Select
                      value={assignment.agency_id}
                      onChange={(event) =>
                        setUserForm((current) => ({
                          ...current,
                          role_assignments: current.role_assignments.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, agency_id: event.target.value ? Number(event.target.value) : "" } : item
                          )
                        }))
                      }
                    >
                      <option value="">No agency scope</option>
                      {agencies.map((agency) => (
                        <option key={agency.id} value={agency.id}>
                          {agency.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      className="border border-slate-300 bg-white text-slate-900 shadow-none hover:bg-slate-50"
                      onClick={() =>
                        setUserForm((current) => ({
                          ...current,
                          role_assignments:
                            current.role_assignments.length === 1
                              ? [{ role_id: "", agency_id: "" }]
                              : current.role_assignments.filter((_, itemIndex) => itemIndex !== index)
                        }))
                      }
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button
              type="button"
              className="border border-slate-300 bg-white text-slate-900 shadow-none hover:bg-slate-50"
              onClick={closeEditor}
              disabled={createUser.isPending || updateUser.isPending}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitUser}
              disabled={createUser.isPending || updateUser.isPending}
            >
              {createUser.isPending || updateUser.isPending
                ? "Saving..."
                : editorMode === "create"
                  ? "Create User"
                  : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={!!userPendingDelete}
        title="Delete User"
        onClose={() => {
          if (!deleteUser.isPending) {
            setUserPendingDelete(null);
          }
        }}
      >
        {userPendingDelete ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Delete <span className="font-semibold text-slate-900">{userPendingDelete.full_name}</span> from the user
              directory? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                className="border border-slate-300 bg-white text-slate-900 shadow-none hover:bg-slate-50"
                onClick={() => setUserPendingDelete(null)}
                disabled={deleteUser.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="bg-red-600 hover:bg-red-700"
                onClick={handleDeleteUser}
                disabled={deleteUser.isPending}
              >
                {deleteUser.isPending ? "Deleting..." : "Delete User"}
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>
    </PageShell>
  );
}
