import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { BuildWitnessLogo } from "@/components/brand/BuildWitnessLogo";
import { Card } from "@/components/ui/Card";
import { fetchCurrentUser, login } from "@/features/auth/api";
import type { User } from "@/features/auth/types";
import { setStoredUser } from "@/features/auth/store";

function buildFallbackUser(email: string): User {
  return {
    id: 0,
    email,
    first_name: "",
    last_name: "",
    full_name: email,
    phone: "",
    is_active: true,
    roles: [],
    capabilities: ["dashboard.view"],
    created_at: new Date().toISOString(),
  };
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      try {
        const user = await fetchCurrentUser();
        setStoredUser(user);
      } catch {
        setStoredUser(buildFallbackUser(email));
      }

      navigate("/dashboard", { replace: true });
    } catch {
      setError("Invalid credentials or unable to load profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full border-brand/10 bg-white/95 p-8 backdrop-blur">
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4">
          <BuildWitnessLogo size={42} />
          <div
            className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]"
            style={{
              color: "#0F3D78",
              borderColor: "rgba(15, 61, 120, 0.14)",
              backgroundColor: "rgba(15, 61, 120, 0.06)",
            }}
          >
            Secure Access
          </div>
        </div>

        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.03em] text-slate-950">Sign In</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Access the monitoring, verification, and disbursement control workspace.
          </p>
        </div>
      </div>

      <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800">Email</label>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-950 shadow-sm outline-none transition focus:border-transparent focus:ring-2"
            style={{ boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@agency.gov"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-800">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-12 text-slate-950 shadow-sm outline-none transition focus:border-transparent focus:ring-2"
              style={{ boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)" }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-slate-500 transition hover:text-brand"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        {error ? <p className="text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          style={{
            background: "linear-gradient(135deg, #0F3D78 0%, #0B2F5D 100%)",
            boxShadow: "0 14px 30px rgba(15, 61, 120, 0.22)",
          }}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>

        <p className="text-center text-xs leading-5 text-slate-500">
          Authorized government and partner accounts only.
        </p>
      </form>
    </Card>
  );
}
