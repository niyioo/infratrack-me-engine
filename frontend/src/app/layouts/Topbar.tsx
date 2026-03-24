import { clearAuthStorage } from "@/features/auth/store";
import { useAuth } from "@/features/auth/hooks";

export function Topbar() {
  const { user } = useAuth();

  function handleLogout() {
    clearAuthStorage();
    window.location.href = "/login";
  }

  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
      <div>
        <h2 className="text-base font-semibold text-slate-900">Operations Dashboard</h2>
        <p className="text-sm text-slate-500">Geo-verified project monitoring and funding control</p>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right">
          <p className="text-sm font-medium">{user?.full_name}</p>
          <p className="text-xs text-slate-500">{user?.email}</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          Logout
        </button>
      </div>
    </header>
  );
}