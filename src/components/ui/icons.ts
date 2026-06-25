import type { LucideIcon } from "lucide-react";
export {
  Search, Plus, Check, X, Trash2, Camera, ArrowRight, ArrowLeftRight,
  ArrowDown, ArrowUp, AlertTriangle,
  Package, BarChart3, Settings, Tag, LayoutGrid, MapPin, Lock, Home, ChevronRight,
  Download, ShieldCheck, Clock, CheckCircle, Users,
} from "lucide-react";
import { Camera, Package, ArrowLeftRight, BarChart3, Search, Tag, Settings } from "lucide-react";

/** Maps tab routes to their icon (used by TabBar). */
export const TAB_ICONS: Record<string, LucideIcon> = {
  "/capture": Camera,
  "/items": Package,
  "/transfers": ArrowLeftRight,
  "/stock": BarChart3,
  "/dashboard": Search,
  "/barcodes": Tag,
  "/settings": Settings,
};
