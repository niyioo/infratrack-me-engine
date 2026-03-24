import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { login, fetchCurrentUserByEmail } from "@/features/auth/api";
import { setStoredUser } from "@/features/auth/store";

export function LoginPage() {
  const [email, setEmail] = useState("admin@infratrack.local");
  const [password, setPassword] = useState("Password123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const tokens = await login({ email, password });
      localStorage.setItem("access_token", tokens.access);
      localStorage.setItem("refresh_token", tokens.refresh);

      const user = await fetchCurrentUserByEmail(email);
      if (user) {
        setStoredUser(user);
      }

      window.location.href = "/dashboard";
    } catch {
      setError("Invalid credentials or unable to load profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md p-8">
      <div>
        <h1 className="text-2xl font-semibold">InfraTrack Sign In</h1>
        <p className="mt-2 text-sm text-slate-500">
          Access the monitoring and disbursement control dashboard
        </p>
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium">Email</label>
          <input
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">Password</label>
          <input
            type="password"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>
    </Card>
  );
}