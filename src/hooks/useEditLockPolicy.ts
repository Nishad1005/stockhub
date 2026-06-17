import { useEffect } from "react";
import { useAppSettings } from "./useAppSettings";
import { useSessionStore } from "@/stores/session";

/**
 * Sync the shared edit-lock policy (DB) into the session store so existing
 * consumers (Items/Edit) keep reading one value. Call once in AppShell.
 */
export function useEditLockPolicy(): void {
  const { data } = useAppSettings();
  const setEditLockHours = useSessionStore((s) => s.setEditLockHours);
  useEffect(() => {
    if (data?.editLockHours != null) setEditLockHours(data.editLockHours);
  }, [data?.editLockHours, setEditLockHours]);
}
