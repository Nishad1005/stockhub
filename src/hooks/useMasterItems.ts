import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { MasterItem } from "@/types/master";

/**
 * The master is static reference data (~4,561 rows), so v0.1 kept it all in
 * memory and searched locally. We do the same: fetch the whole catalog once and
 * cache it forever (until manual invalidation after a re-seed). This gives
 * instant search and is offline-friendly.
 */
export const masterKeys = {
  all: ["master"] as const,
};

const PAGE = 1000; // Supabase caps a single select at 1000 rows

async function fetchAllMaster(): Promise<MasterItem[]> {
  const all: MasterItem[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("master_items")
      .select("code,name,definition,category,section,unit,sku")
      .order("code", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as MasterItem[]));
    if (data.length < PAGE) break;
  }
  return all;
}

export function useMasterItems() {
  return useQuery({
    queryKey: masterKeys.all,
    queryFn: fetchAllMaster,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
