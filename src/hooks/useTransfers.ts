import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { TransferRow } from "@/types/transfer";

export const transfersKeys = {
  all: ["transfers"] as const,
};

const PAGE = 1000; // Supabase caps a single select at 1000 rows

async function fetchAllTransfers(): Promise<TransferRow[]> {
  const all: TransferRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("transfers")
      .select("*")
      .order("created_at", { ascending: false }) // newest first (v0.1 list order)
      .range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as TransferRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

/** All STN transfers, newest first. */
export function useTransfers() {
  return useQuery({
    queryKey: transfersKeys.all,
    queryFn: fetchAllTransfers,
  });
}
