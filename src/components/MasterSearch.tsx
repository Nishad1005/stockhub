import { useState } from "react";
import { useMasterSearch } from "@/hooks/useMasterSearch";
import type { MasterItem } from "@/types/master";

export interface MasterSearchProps {
  value: string;
  onChange: (v: string) => void;
  onPick: (item: MasterItem) => void;
  placeholder?: string;
  inputId?: string;
  autoFocus?: boolean;
}

/** Item-name input with master typeahead — v0.1 renderSuggestions + pickMaster. */
export function MasterSearch({ value, onChange, onPick, placeholder, inputId, autoFocus }: MasterSearchProps) {
  const [open, setOpen] = useState(false);
  const { results, tooShort } = useMasterSearch(value);
  const show = open && !tooShort;

  return (
    <div className="relative">
      <input
        id={inputId}
        type="text"
        value={value}
        autoFocus={autoFocus}
        autoComplete="off"
        placeholder={placeholder ?? "Type item name (4+ chars) or scan…"}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="w-full rounded-lg border border-brand-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
      />

      {show && results.length > 0 && (
        <ul className="absolute z-20 mt-1 w-full bg-white border border-brand-line rounded-lg shadow-lg max-h-72 overflow-auto">
          {results.map((it) => (
            <li key={it.code}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault(); // keep input from blurring before pick
                  onPick(it);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-brand-accent-soft"
              >
                <div className="text-xs font-mono text-brand-accent-2">{it.code}</div>
                <div className="text-sm text-brand-ink">{it.name}</div>
                <div className="text-xs text-brand-mute">
                  {(it.definition ?? "—") + " · " + (it.category ?? "—")}
                </div>
                {it.section && (
                  <div className="text-[10px] text-brand-accent-2 font-medium mt-0.5">🏠 {it.section}</div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}

      {show && results.length === 0 && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-brand-line rounded-lg shadow-lg px-3 py-2 text-xs text-brand-mute">
          No master matches — will save as a NEW item.
        </div>
      )}
    </div>
  );
}
