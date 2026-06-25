import { NavLink } from "react-router-dom";
import { TAB_ICONS } from "./ui/icons";

const TABS = [
  { to: "/capture", label: "Capture" },
  { to: "/items", label: "Items" },
  { to: "/transfers", label: "Transfers" },
  { to: "/stock", label: "Stock" },
  { to: "/dashboard", label: "Find" },
  { to: "/barcodes", label: "Barcodes" },
  { to: "/settings", label: "Settings" },
];

export function TabBar() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-brand-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="max-w-md mx-auto grid" style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}>
        {TABS.map((t) => {
          const Icon = TAB_ICONS[t.to];
          return (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-1 min-h-[56px] text-[10px] font-medium ${
                  isActive ? "text-brand-accent-2 font-semibold" : "text-brand-mute"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`flex items-center justify-center w-9 h-6 rounded-full ${isActive ? "bg-brand-accent-soft" : ""}`}>
                    <Icon className="w-[18px] h-[18px]" />
                  </span>
                  {t.label}
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
