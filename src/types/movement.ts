import type { Database } from "./database";

export type MovementRow = Database["public"]["Tables"]["movements"]["Row"];
export type MovementInsert = Database["public"]["Tables"]["movements"]["Insert"];
