import { Search, X } from "./icons";

export interface SearchFieldProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

export function SearchField({ value, onChange, placeholder = "Search…" }: SearchFieldProps) {
  return (
    <div className="flex items-center gap-2 bg-white rounded-xl border border-brand-line px-3 py-2.5 shadow-card">
      <Search className="w-4 h-4 text-brand-mute shrink-0" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm focus:outline-none placeholder:text-brand-mute"
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear" className="text-brand-mute">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
