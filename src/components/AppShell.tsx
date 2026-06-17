import type { ReactNode } from "react";
import { TabBar } from "./TabBar";
import { useEditLockPolicy } from "@/hooks/useEditLockPolicy";

/** Wraps an authenticated screen with the bottom tab bar. */
export function AppShell({ children }: { children: ReactNode }) {
  useEditLockPolicy(); // seed the session edit-lock window from the shared DB policy
  return (
    <>
      {children}
      <TabBar />
    </>
  );
}
