import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export const grnSuppliersKeys = { all: ["grn-suppliers"] as const };

/** ISO timestamp for 90 days ago (local clock). */
function since90DaysIso(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString();
}

/** Distinct supplier names from GRNs in the last 90 days — feeds the gate-form autocomplete. */
async function fetchGrnSuppliers(): Promise<string[]> {
  const { data, error } = await supabase
    .from("grns")
    .select("supplier_name, created_at")
    .gte("created_at", since90DaysIso())
    .order("created_at", { ascending: false });
  if (error) throw error;

  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of data ?? []) {
    const name = r.supplier_name?.trim();
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase());
      out.push(name);
    }
  }
  return out;
}

export function useGrnSuppliers() {
  return useQuery({ queryKey: grnSuppliersKeys.all, queryFn: fetchGrnSuppliers });
}
