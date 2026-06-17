import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MovementRow } from "@/types/movement";

export const movementsKeys = { all: ["movements"] as const };

const PAGE = 1000;

async function fetchAllMovements(): Promise<MovementRow[]> {
  const all: MovementRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("movements")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as MovementRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

/** All stock movements, newest first. */
export function useMovements() {
  return useQuery({ queryKey: movementsKeys.all, queryFn: fetchAllMovements });
}
