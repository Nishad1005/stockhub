import type { LucideIcon } from "lucide-react";
export {
  Search, Plus, Check, X, Trash2, Camera, ArrowRight, ArrowLeftRight,
  ArrowDown, ArrowUp, AlertTriangle,
  Package, BarChart3, Settings, Tag, LayoutGrid, MapPin, Lock, Home, ChevronRight,
  Download, Clock, Image, Menu,
} from "lucide-react";
import { Camera, Package, ArrowLeftRight, Search, Tag, Menu } from "lucide-react";

/** Maps tab routes to their icon (used by TabBar). */
export const TAB_ICONS: Record<string, LucideIcon> = {
  "/capture": Camera,
  "/items": Package,
  "/movements": ArrowLeftRight,
  "/dashboard": Search,
  "/barcodes": Tag,
  "/more": Menu,
};
