import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { appSettingsKeys } from "./useAppSettings";

/** Update the shared edit-lock window. RLS restricts this to manager/admin. */
export function useUpdateEditLockHours() {
  const qc = useQueryClient();
  return useMutation<number, Error, number>({
    mutationFn: async (hours) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      const { error } = await supabase
        .from("app_settings")
        .update({ edit_lock_hours: hours, updated_by: uid, updated_at: new Date().toISOString() })
        .eq("id", 1);
      if (error) throw error;
      return hours;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: appSettingsKeys.all }),
  });
}
