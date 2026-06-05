import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/stores/auth";
import { Splash } from "./Splash";

/**
 * Initializes the auth listener once and blocks rendering until the initial
 * session is resolved, so child routes never flash the wrong state on reload.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const init = useAuthStore((s) => s.init);
  const status = useAuthStore((s) => s.status);

  useEffect(() => {
    init();
  }, [init]);

  if (status === "loading") return <Splash message="Starting up…" />;
  return <>{children}</>;
}
