import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/capture", label: "Capture", icon: "📷" },
  { to: "/items", label: "Items", icon: "📦" },
  { to: "/transfers", label: "Transfers", icon: "🔄" },
  { to: "/stock", label: "Stock", icon: "📊" },
  { to: "/dashboard", label: "Find", icon: "🔍" },
  { to: "/barcodes", label: "Barcodes", icon: "🏷️" },
  { to: "/settings", label: "Settings", icon: "⚙️" },
];

/** Bottom navigation between the built screens (more tabs as phases land). */
export function TabBar() {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-brand-line"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div
        className="max-w-md mx-auto grid"
        style={{ gridTemplateColumns: `repeat(${TABS.length}, 1fr)` }}
      >
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 min-h-[56px] text-xs border-t-2 ${
                isActive
                  ? "text-brand-accent-2 font-semibold border-brand-accent-2 bg-brand-accent-soft/40"
                  : "text-brand-mute border-transparent"
              }`
            }
          >
            <span className="text-lg leading-none">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
