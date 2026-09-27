import { Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden p-6"
      style={{
        background:
          "radial-gradient(circle at top left, rgba(15, 156, 146, 0.16), transparent 24%), radial-gradient(circle at top right, rgba(15, 61, 120, 0.18), transparent 30%), linear-gradient(180deg, #F8FBFF 0%, #EEF4FB 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="absolute -left-24 top-24 h-72 w-72 rounded-full bg-[#0F9C92]/10 blur-3xl" />
        <div className="absolute right-[-5rem] top-[-3rem] h-80 w-80 rounded-full bg-[#0F3D78]/10 blur-3xl" />
        <div className="absolute bottom-[-6rem] left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-white/70 blur-3xl" />
      </div>
      <div className="relative w-full max-w-lg">
        <Outlet />
      </div>
    </div>
  );
}
