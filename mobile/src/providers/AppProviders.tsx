import { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";
import { AuthBootstrap } from "./AuthBootstrap";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryProvider>
      <AuthBootstrap>{children}</AuthBootstrap>
    </QueryProvider>
  );
}