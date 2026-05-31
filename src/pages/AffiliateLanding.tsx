import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getMyAffiliate } from "@/lib/affiliateService";
import { Loader2, LogIn } from "lucide-react";

const AffiliateLanding = () => {
  const navigate = useNavigate();
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
      if (authErr || !data.user) throw new Error(authErr?.message ?? "Login failed");

      const aff = await getMyAffiliate();
      if (!aff) {
        await supabase.auth.signOut();
        throw new Error("No affiliate account found for this email. Please register first.");
      }

      navigate("/affiliate/dashboard");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Brand header */}
      <Link to="/" className="text-3xl font-black text-foreground mb-2">Musicable</Link>
      <p className="text-pink text-xs font-bold uppercase tracking-widest mb-10">Affiliate Portal</p>

      <div
        className="w-full max-w-sm rounded-2xl border border-border/40 p-8"
        style={{ background: "hsl(222 47% 12%)", boxShadow: "0 0 60px hsl(330 85% 55% / 0.08)" }}
      >
        <h1 className="text-2xl font-black text-foreground mb-1">Welcome back</h1>
        <p className="text-muted-foreground text-sm mb-6">Sign in to your affiliate dashboard</p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-pink"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-pink"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="text-red-400 text-xs bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-primary flex items-center justify-center gap-2 py-3"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="text-center text-muted-foreground text-sm mt-6">
          Not an affiliate yet?{" "}
          <Link to="/affiliate/register" className="text-pink font-semibold hover:underline">
            Apply here
          </Link>
        </p>
      </div>

      <p className="text-muted-foreground text-xs mt-8">
        <Link to="/" className="hover:text-foreground transition-colors">← Back to Musicable</Link>
      </p>
    </div>
  );
};

export default AffiliateLanding;
