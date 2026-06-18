import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { UserRole } from "@/types/profile";
import { usersKeys } from "./useUsers";

/** Change a user's role. RLS + the guard_role_change trigger restrict this to admins. */
export function useUpdateUserRole() {
  const qc = useQueryClient();
  return useMutation<void, Error, { id: string; role: UserRole }>({
    mutationFn: async ({ id, role }) => {
      const { error } = await supabase.from("profiles").update({ role }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: usersKeys.all }),
  });
}
