import type { BadgeTone } from "@/components/ui/Badge";
import type { UserRole } from "@/types/profile";

export const ROLE_TONE: Record<UserRole, BadgeTone> = {
  pending: "warn",
  security: "neutral",
  storekeeper: "neutral",
  manager: "ok",
  admin: "bad",
};
