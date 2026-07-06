import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { loginSchema } from "@/lib/validators/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";

interface LocationState {
  from?: { pathname?: string };
}

export function LoginScreen() {
  const status = useAuthStore((s) => s.status);
  const signIn = useAuthStore((s) => s.signIn);
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const dest = (location.state as LocationState | null)?.from?.pathname || "/capture";

  // Already signed in → bounce to the intended destination.
  if (status === "signed-in") return <Navigate to={dest} replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    try {
      await signIn(parsed.data.email, parsed.data.password);
      navigate(dest, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-brand-ink p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">
            U&amp;M Designs
          </div>
          <h1 className="text-2xl font-bold mt-1">Golai</h1>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white rounded-2xl shadow-card border border-brand-line p-6 space-y-4"
        >
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-brand-bad" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={busy} loading={busy} fullWidth>
            {busy ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="text-xs text-brand-mute text-center mt-4">
          New here?{" "}
          <Link to="/signup" className="font-semibold text-brand-accent-2">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}
