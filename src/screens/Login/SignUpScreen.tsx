import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { signupSchema } from "@/lib/validators/auth";
import { Button, buttonClasses } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { Check } from "@/components/ui/icons";

export function SignUpScreen() {
  const status = useAuthStore((s) => s.status);
  const signUp = useAuthStore((s) => s.signUp);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // If a session is created (email confirmation off), the pending gate takes over.
  if (status === "signed-in") return <Navigate to="/capture" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = signupSchema.safeParse({ fullName, email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setBusy(true);
    try {
      await signUp(parsed.data.email, parsed.data.password, parsed.data.fullName);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-brand-ink p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M Designs</div>
          <h1 className="text-2xl font-bold mt-1">StockHub</h1>
        </div>

        {done ? (
          <div className="bg-white rounded-2xl shadow-card border border-brand-line p-6 text-center">
            <div className="flex items-center justify-center mb-2">
              <Check className="w-8 h-8 text-brand-ok" />
            </div>
            <h2 className="font-bold mb-1">Account created</h2>
            <p className="text-sm text-brand-mute">An admin will approve your access. You can sign in once approved.</p>
            <Link to="/login" className={`${buttonClasses("primary", "md")} mt-4 inline-flex`}>
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="bg-white rounded-2xl shadow-card border border-brand-line p-6 space-y-4">
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} autoFocus />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>

            {error && <p className="text-sm text-brand-bad" role="alert">{error}</p>}

            <Button type="submit" disabled={busy} loading={busy} fullWidth>
              {busy ? "Creating…" : "Create account"}
            </Button>
          </form>
        )}

        {!done && (
          <p className="text-xs text-brand-mute text-center mt-4">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-brand-accent-2">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
