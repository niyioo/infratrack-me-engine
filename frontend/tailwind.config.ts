import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#0F3D78",
          strong: "#0A2E5C",
          soft: "#E7EEF8",
          muted: "#C7D8EF",
        },
        accent: {
          DEFAULT: "#0F9C92",
          strong: "#0B7D75",
          soft: "#E7F7F5",
        },
        // Semantic status tokens — use these instead of raw colors for consistency
        status: {
          active: "#2563EB",
          "active-bg": "#EFF6FF",
          delayed: "#D97706",
          "delayed-bg": "#FFFBEB",
          flagged: "#DC2626",
          "flagged-bg": "#FEF2F2",
          completed: "#059669",
          "completed-bg": "#ECFDF5",
          pending: "#6366F1",
          "pending-bg": "#EEF2FF",
        },
        // Risk semantic tokens
        risk: {
          critical: "#7F1D1D",
          "critical-bg": "#FEF2F2",
          high: "#DC2626",
          "high-bg": "#FEF2F2",
          medium: "#D97706",
          "medium-bg": "#FFFBEB",
          low: "#059669",
          "low-bg": "#ECFDF5",
        },
      },
      boxShadow: {
        brand: "0 18px 40px rgba(15, 61, 120, 0.08)",
        card: "0 1px 3px rgba(15, 23, 42, 0.06), 0 4px 16px rgba(15, 23, 42, 0.04)",
        elevated: "0 4px 24px rgba(15, 23, 42, 0.10)",
        "inner-t": "inset 0 1px 0 rgba(255,255,255,0.06)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #0F3D78 0%, #0A2E5C 100%)",
        "accent-gradient": "linear-gradient(135deg, #0F9C92 0%, #0B7D75 100%)",
      },
      borderWidth: {
        "3": "3px",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
      },
    }
  },
  plugins: []
} satisfies Config;
