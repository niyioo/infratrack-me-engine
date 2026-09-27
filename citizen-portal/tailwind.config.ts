import type { Config } from "tailwindcss";

// Shares the brand palette with the staff dashboard so the two feel related,
// but the portal is a separate, public app.
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
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(15,23,42,0.04), 0 4px 16px rgba(15,23,42,0.06)",
      },
    },
  },
  plugins: [],
} satisfies Config;
