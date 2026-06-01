import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  getMyAffiliate, getMyClicks, getMyConversions,
  buildReferralLink, generateCode,
} from "@/lib/affiliateService";
import {
  Copy, Check, LogOut, MousePointerClick,
  Users, DollarSign, TrendingUp, RefreshCw, Loader2,
} from "lucide-react";

/* ── Stat card ───────────────────────────────────────────────────────── */
const StatCard = ({
  icon: Icon, label, value, sub, color,
}: { icon: React.ElementType; label: string; value: string; sub?: string; color: string }) => (
  <div
    className="rounded-2xl border border-border/30 p-5 flex items-start gap-4"
    style={{ background: "hsl(222 47% 13%)" }}
  >
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
      style={{ background: `${color}18` }}
    >
      <Icon size={22} style={{ color }} />
    </div>
    <div>
      <p className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">{label}</p>
      <p className="text-foreground text-2xl font-black leading-tight mt-0.5">{value}</p>
      {sub && <p className="text-muted-foreground text-xs mt-0.5">{sub}</p>}
    </div>
  </div>
);

/* ── Main component ──────────────────────────────────────────────────── */
const AffiliateDashboard = () => {
  const navigate = useNavigate();
  const [affiliate,    setAffiliate]    = useState<any>(null);
  const [clicks,       setClicks]       = useState<any[]>([]);
  const [conversions,  setConversions]  = useState<any[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [copied,       setCopied]       = useState(false);
  const [newCode,      setNewCode]      = useState("");
  const [codeError,    setCodeError]    = useState("");
  const [savingCode,   setSavingCode]   = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate(`/login?next=/affiliate-dashboard`); return; }

      const aff = await getMyAffiliate();
      if (!aff) { navigate("/affiliate-signup"); return; }

      const [cls, convs] = await Promise.all([
        getMyClicks(aff.code),
        getMyConversions(aff.code),
      ]);

      setAffiliate(aff);
      setClicks(cls);
      setConversions(convs);
      setNewCode(aff.code);
      setLoading(false);
    })();
  }, []);

  const copyLink = async () => {
    await navigator.clipboard.writeText(buildReferralLink(affiliate.code));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/affiliate");
  };

  const saveNewCode = async () => {
    setCodeError("");
    const cleaned = newCode.toUpperCase().trim().replace(/[^A-Z0-9]/g, "");
    if (cleaned.length < 4) { setCodeError("Code must be at least 4 characters."); return; }
    setSavingCode(true);
    try {
      const { error } = await (supabase as any)
        .from("affiliates")
        .update({ code: cleaned })
        .eq("user_id", affiliate.user_id);
      if (error) throw error;
      setAffiliate({ ...affiliate, code: cleaned });
    } catch (e: any) {
      setCodeError(e.message ?? "Failed to save code — it may already be taken.");
    } finally {
      setSavingCode(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-pink" />
      </div>
    );
  }

  const convRate = clicks.length > 0
    ? ((conversions.length / clicks.length) * 100).toFixed(1)
    : "0.0";

  const link = buildReferralLink(affiliate.code);

  return (
    <div className="min-h-screen bg-background">

      {/* Top nav */}
      <nav className="border-b border-border/30 bg-background/90 backdrop-blur-md sticky top-0 z-40">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-xl font-black text-foreground">Musicable</Link>
            <span className="text-border/60">·</span>
            <span className="text-pink text-xs font-bold uppercase tracking-widest">Affiliate</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground text-sm hidden sm:block">{affiliate.email}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              <LogOut size={15} /> Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 sm:px-6 py-10 max-w-5xl">

        {/* Welcome */}
        <div className="mb-8">
          <p className="text-pink text-xs font-bold uppercase tracking-widest mb-1">Dashboard</p>
          <h1 className="text-3xl font-black text-foreground">
            Hey, {affiliate.name.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            You earn <span className="text-pink font-bold">{affiliate.commission_pct}%</span> on every student you refer.
            Status:{" "}
            <span
              className={`font-bold ${affiliate.status === "active" ? "text-green-400" : "text-yellow-400"}`}
            >
              {affiliate.status}
            </span>
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            icon={MousePointerClick}
            label="Total Clicks"
            value={clicks.length.toLocaleString()}
            sub="All time"
            color="#ec4899"
          />
          <StatCard
            icon={Users}
            label="Conversions"
            value={conversions.length.toLocaleString()}
            sub="Paid sign-ups"
            color="#a855f7"
          />
          <StatCard
            icon={TrendingUp}
            label="Conv. Rate"
            value={`${convRate}%`}
            sub="Clicks → sign-ups"
            color="#22d3ee"
          />
          <StatCard
            icon={DollarSign}
            label="Total Earnings"
            value={`$${Number(affiliate.total_earnings).toFixed(2)}`}
            sub={`at ${affiliate.commission_pct}% commission`}
            color="#84cc16"
          />
        </div>

        {/* Referral link */}
        <div
          className="rounded-2xl border border-border/30 p-6 mb-6"
          style={{ background: "hsl(222 47% 13%)" }}
        >
          <h2 className="text-foreground font-black text-lg mb-4">Your Referral Link</h2>

          {/* Link copy */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <input
              readOnly
              value={link}
              className="flex-1 bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-pink font-mono focus:outline-none"
            />
            <button
              onClick={copyLink}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all"
              style={{ background: copied ? "#22c55e" : "hsl(330 85% 55%)" }}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>

          {/* Code customisation */}
          <div>
            <p className="text-muted-foreground text-xs mb-2 font-semibold uppercase tracking-wider">
              Customise your code
            </p>
            <div className="flex gap-2 items-start">
              <input
                value={newCode}
                onChange={e => setNewCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
                maxLength={12}
                className="w-36 bg-background border border-border rounded-xl px-4 py-2 text-foreground text-sm font-mono tracking-widest focus:outline-none focus:border-pink uppercase"
              />
              <button
                onClick={() => setNewCode(generateCode(affiliate.name))}
                title="Random code"
                className="w-9 h-9 rounded-xl bg-background border border-border flex items-center justify-center hover:border-pink transition-colors"
              >
                <RefreshCw size={13} className="text-muted-foreground" />
              </button>
              <button
                onClick={saveNewCode}
                disabled={savingCode || newCode === affiliate.code}
                className="px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-40 transition-all"
                style={{ background: "hsl(330 85% 55%)" }}
              >
                {savingCode ? "Saving…" : "Save"}
              </button>
            </div>
            {codeError && <p className="text-red-400 text-xs mt-1">{codeError}</p>}
          </div>
        </div>

        {/* Conversions table */}
        <div
          className="rounded-2xl border border-border/30 p-6 mb-6"
          style={{ background: "hsl(222 47% 13%)" }}
        >
          <h2 className="text-foreground font-black text-lg mb-4">
            Recent Conversions
            <span className="ml-2 text-muted-foreground font-normal text-sm">
              ({conversions.length} total)
            </span>
          </h2>

          {conversions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">🎹</p>
              <p className="text-muted-foreground">No conversions yet — share your link to get started!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/30">
                    <th className="text-left text-muted-foreground font-semibold pb-3 pr-4">Date</th>
                    <th className="text-left text-muted-foreground font-semibold pb-3 pr-4">Student</th>
                    <th className="text-right text-muted-foreground font-semibold pb-3 pr-4">Plan</th>
                    <th className="text-right text-muted-foreground font-semibold pb-3">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {conversions.map((c: any) => (
                    <tr key={c.id} className="border-b border-border/20 hover:bg-white/[0.02] transition-colors">
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(c.converted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-3 pr-4 text-foreground">
                        {c.new_user_email ? c.new_user_email.split("@")[0] + "@…" : "Anonymous"}
                      </td>
                      <td className="py-3 pr-4 text-right text-foreground">${Number(c.plan_amount).toFixed(2)}</td>
                      <td className="py-3 text-right font-bold text-green-400">+${Number(c.commission_amount).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* How it works */}
        <div
          className="rounded-2xl border border-border/30 p-6"
          style={{ background: "hsl(222 47% 13%)" }}
        >
          <h2 className="text-foreground font-black text-lg mb-4">How It Works</h2>
          <div className="grid sm:grid-cols-3 gap-4 text-sm text-muted-foreground">
            {[
              { n: "1", t: "Share your link", d: "Send your unique link to parents, students or on social media." },
              { n: "2", t: "They sign up",    d: "When someone uses your link and subscribes, it's tracked automatically." },
              { n: "3", t: "You get paid",    d: `Earn ${affiliate.commission_pct}% of every $8/month subscription. Paid monthly.` },
            ].map(s => (
              <div key={s.n} className="flex gap-3">
                <div className="w-7 h-7 rounded-full bg-pink/15 border border-pink/30 flex items-center justify-center shrink-0 font-black text-pink text-xs mt-0.5">
                  {s.n}
                </div>
                <div>
                  <p className="font-bold text-foreground mb-0.5">{s.t}</p>
                  <p>{s.d}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 p-4 rounded-xl bg-pink/8 border border-pink/20 text-sm">
            <p className="text-foreground font-semibold">💰 Payout email on file:</p>
            <p className="text-pink">{affiliate.payout_email ?? affiliate.email}</p>
            <p className="text-muted-foreground text-xs mt-1">
              Reach $20 minimum to trigger a payout. Contact <a href="mailto:hello@musicable.app" className="underline">hello@musicable.app</a> with any questions.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AffiliateDashboard;
