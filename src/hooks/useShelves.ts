import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { buildShelfCodeSet, isKnownShelf } from "@/lib/shelfRegistry";
import type { ShelfRow } from "@/types/shelf-row";

export const shelvesKeys = { all: ["shelves"] as const };

const PAGE = 1000;

async function fetchShelves(): Promise<ShelfRow[]> {
  const all: ShelfRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase.from("shelves").select("*").order("code").range(from, from + PAGE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...(data as ShelfRow[]));
    if (data.length < PAGE) break;
  }
  return all;
}

/** All registered shelves (612; static, cached forever). */
export function useShelves() {
  return useQuery({ queryKey: shelvesKeys.all, queryFn: fetchShelves, staleTime: Infinity, gcTime: Infinity });
}

/** Checker: true = registered, false = unregistered, null = registry loading or empty input. */
export function useShelfChecker() {
  const { data } = useShelves();
  const set = useMemo(() => (data ? buildShelfCodeSet(data) : null), [data]);
  return (code: string): boolean | null => {
    if (!set || !code || !code.trim()) return null;
    return isKnownShelf(set, code);
  };
}
