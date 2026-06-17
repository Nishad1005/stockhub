import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const appSettingsKeys = { all: ["app_settings"] as const };

export interface AppSettings {
  editLockHours: number;
}

async function fetchAppSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("app_settings")
    .select("edit_lock_hours")
    .eq("id", 1)
    .single();
  if (error) throw error;
  return { editLockHours: data.edit_lock_hours };
}

/** The single shared settings row. */
export function useAppSettings() {
  return useQuery({ queryKey: appSettingsKeys.all, queryFn: fetchAppSettings });
}
