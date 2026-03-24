import { Card } from "@/components/ui/Card";
import { useAuth } from "@/features/auth/hooks";

export function ProfilePage() {
  const { user, roles } = useAuth();

  return (
    <Card className="p-6">
      <h1 className="text-xl font-semibold">Profile</h1>
      <div className="mt-4 space-y-2 text-sm text-slate-600">
        <p><span className="font-medium text-slate-900">Name:</span> {user?.full_name || "-"}</p>
        <p><span className="font-medium text-slate-900">Email:</span> {user?.email || "-"}</p>
        <p><span className="font-medium text-slate-900">Roles:</span> {roles.join(", ") || "-"}</p>
      </div>
    </Card>
  );
}