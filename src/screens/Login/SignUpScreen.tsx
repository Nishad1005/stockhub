import { useState, type FormEvent } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { signupSchema } from "@/lib/validators/auth";

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

  const field = "w-full rounded-lg border border-brand-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-brand-cream text-brand-ink p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-xs font-bold uppercase tracking-widest text-brand-mute">U&amp;M Designs</div>
          <h1 className="text-2xl font-bold mt-1">StockHub</h1>
        </div>

        {done ? (
          <div className="bg-white rounded-xl shadow-sm border border-brand-line p-6 text-center">
            <div className="text-2xl mb-2">✅</div>
            <h2 className="font-bold mb-1">Account created</h2>
            <p className="text-sm text-brand-mute">An admin will approve your access. You can sign in once approved.</p>
            <Link to="/login" className="inline-block mt-4 rounded-lg bg-brand-accent-2 text-white font-semibold px-4 py-2 text-sm">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-sm border border-brand-line p-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-semibold text-brand-mute mb-1">Full name</label>
              <input id="name" value={fullName} onChange={(e) => setFullName(e.target.value)} className={field} autoFocus />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-brand-mute mb-1">Email</label>
              <input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-brand-mute mb-1">Password</label>
              <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={field} />
            </div>

            {error && <p className="text-sm text-brand-bad" role="alert">{error}</p>}

            <button type="submit" disabled={busy} className="w-full rounded-lg bg-brand-accent-2 text-white font-semibold py-2.5 text-sm disabled:opacity-60">
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>
        )}

        {!done && (
          <p className="text-xs text-brand-mute text-center mt-4">
            Already have an account? <Link to="/login" className="font-semibold text-brand-accent-2">Sign in</Link>
          </p>
        )}
      </div>
    </div>
  );
}
