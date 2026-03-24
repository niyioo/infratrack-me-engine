import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageShell } from "@/app/layouts/PageShell";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { ProjectsTable } from "@/components/tables/ProjectsTable";
import { useProjects } from "@/features/projects/hooks";
import { useQueryParams } from "@/hooks/useQueryParams";
import { useDebounce } from "@/hooks/useDebounce";

export function ProjectsPage() {
  const navigate = useNavigate();
  const { get, set } = useQueryParams();

  const [search, setSearchInput] = useState(get("search"));
  const debouncedSearch = useDebounce(search, 400);

  const status = get("status");

  const { data: projects = [], isLoading } = useProjects({
    search: debouncedSearch,
    current_status: status
  });

  function handleSearchChange(value: string) {
    setSearchInput(value);
    set("search", value);
  }

  function handleStatusChange(value: string) {
    set("status", value);
  }

  return (
    <PageShell
      title="Projects"
      description="Manage and monitor all registered infrastructure projects."
      actions={
        <Button onClick={() => navigate("/projects/new")}>
          + New Project
        </Button>
      }
    >
      {/* Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <Input
          placeholder="Search projects..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />

        <Select value={status} onChange={(e) => handleStatusChange(e.target.value)}>
          <option value="">All Status</option>
          <option value="NOT_STARTED">Not Started</option>
          <option value="ACTIVE">Active</option>
          <option value="AWAITING_VERIFICATION">Awaiting Verification</option>
          <option value="APPROVED_FOR_FUNDING">Approved for Funding</option>
          <option value="DELAYED">Delayed</option>
          <option value="FLAGGED">Flagged</option>
          <option value="COMPLETED">Completed</option>
        </Select>
      </div>

      {/* Table */}
      <ProjectsTable
        title="All Projects"
        projects={projects}
        loading={isLoading}
      />
    </PageShell>
  );
}