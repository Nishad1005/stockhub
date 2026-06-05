/**
 * Manager-password gate — calls the SECURITY DEFINER RPCs from migration 0005.
 * Both operate on the signed-in user's own profile row.
 *
 * `verifyManagerPassword` returns false for users with no manager password set
 * (e.g. storekeepers), so it doubles as the "is this a manager who proved it"
 * check used before unlocking entries / enabling manual-entry mode.
 */
import { supabase } from "@/lib/supabase";

export async function verifyManagerPassword(password: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("verify_manager_password", { pw: password });
  if (error) throw error;
  return data === true;
}

export async function setManagerPassword(password: string): Promise<void> {
  const { error } = await supabase.rpc("set_manager_password", { pw: password });
  if (error) throw error;
}
