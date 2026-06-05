import type { Database } from "./database";

/** User roles, from the `user_role` DB enum. */
export type UserRole = Database["public"]["Enums"]["user_role"];

/** A user profile row — matches the `profiles` table 1:1. */
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
