import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { generateCode, registerAffiliate } from "@/lib/affiliateService";
import { Loader2, RefreshCw } from "lucide-react";

const AffiliateRegister = () => {
  const navigate = useNavigate();
  const [name,         setName]         = useState("");
  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [code,         setCode]         = useState("");
  const [payoutEmail,  setPayoutEmail]  = useState("");
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  const refreshCode = () => {
    if (name.trim()) setCode(generateCode(name.trim()));
  };

  const handleNameChange = (v: string) => {
    setName(v);
    if (!code) setCode(generateCode(v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (code.length < 4) { setError("Code must be at least 4 characters."); return; }
    if (!/^[A-Z0-9]+$/i.test(code)) { setError("Code can only contain letters and numbers."); return; }

    setLoading(true);
    try {
      // Create Supabase auth account
      const { data, error: authErr } = await supabase.auth.signUp({ email, password });
      if (authErr || !data.user) throw new Error(authErr?.message ?? "Sign-up failed");

      // Insert affiliate record
      await registerAffiliate(
        data.user.id,
        name.trim(),
        email.trim(),
        code.toUpperCase().trim(),
        payoutEmail.trim() || email.trim()
      );

      navigate("/affiliate-dashboard");
    } catch (err: any) {
      setError(err.message ?? "Something went wrong");
      // If affiliate insert failed, clean up auth user
      await supabase.auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-10">
      <Link to="/" className="text-3xl font-black text-foreground mb-2">Musicable</Link>
      <p className="text-pink text-xs font-bold uppercase tracking-widest mb-10">Affiliate Registration</p>

      <div
        className="w-full max-w-md rounded-2xl border border-border/40 p-8"
        style={{ background: "hsl(222 47% 12%)", boxShadow: "0 0 60px hsl(330 85% 55% / 0.08)" }}
      >
        <h1 className="text-2xl font-black text-foreground mb-1">Become an Affiliate</h1>
        <p className="text-muted-foreground text-sm mb-6">
          Earn <span className="text-pink font-bold">20%</span> commission on every student you refer.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => handleNameChange(e.target.value)}
              required
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-pink"
              placeholder="Jane Smith"
            />
          </div>

          {/* Email */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-pink"
              placeholder="jane@example.com"
            />
          </div>

          {/* Password */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-pink"
              placeholder="Min. 6 characters"
            />
          </div>

          {/* Referral code */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">
              Your Referral Code
              <span className="text-muted-foreground font-normal ml-1">(auto-generated, editable)</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                required
                maxLength={12}
                className="flex-1 bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-pink font-mono tracking-widest uppercase"
                placeholder="JANE1234"
              />
              <button
                type="button"
                onClick={refreshCode}
                className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center hover:border-pink transition-colors"
                title="Regenerate code"
              >
                <RefreshCw size={14} className="text-muted-foreground" />
              </button>
            </div>
            <p className="text-muted-foreground text-xs mt-1">
              Your link will be: <span className="text-pink">musicable.app/signup?ref={code || "JANE1234"}</span>
            </p>
          </div>

          {/* Payout email */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1">
              Payout Email
              <span className="text-muted-foreground font-normal ml-1">(PayPal or bank — defaults to your email)</span>
            </label>
            <input
              type="email"
              value={payoutEmail}
              onChange={e => setPayoutEmail(e.target.value)}
              className="w-full bg-secondary border border-border rounded-xl px-4 py-2.5 text-foreground text-sm focus:outline-none focus:border-pink"
              placeholder="paypal@example.com (optional)"
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
            className="w-full btn-primary flex items-center justify-center gap-2 py-3 mt-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? "Creating account…" : "Create Affiliate Account"}
          </button>
        </form>

        <p className="text-center text-muted-foreground text-sm mt-6">
          Already a member?{" "}
          <Link to="/affiliate-signup" className="text-pink font-semibold hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
};

export default AffiliateRegister;
