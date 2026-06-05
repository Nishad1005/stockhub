import type { ReactNode } from "react";
import { TabBar } from "./TabBar";

/** Wraps an authenticated screen with the bottom tab bar. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <TabBar />
    </>
  );
}
