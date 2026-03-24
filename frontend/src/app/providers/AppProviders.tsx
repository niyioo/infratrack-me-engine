import { ReactNode } from "react";
import { QueryProvider } from "./QueryProvider";
import { AuthBootstrap } from "./AuthBootstrap";

type Props = {
  children: ReactNode;
};

export function AppProviders({ children }: Props) {
  return (
    <QueryProvider>
      <AuthBootstrap>{children}</AuthBootstrap>
    </QueryProvider>
  );
}