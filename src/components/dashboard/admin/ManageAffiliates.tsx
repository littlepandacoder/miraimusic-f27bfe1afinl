import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Copy, Check, ChevronDown, ChevronUp,
  MousePointerClick, Users, DollarSign, TrendingUp,
  CheckCircle, XCircle, Loader2,
} from "lucide-react";
import { buildReferralLink } from "@/lib/affiliateService";

/* ── Types ────────────────────────────────────────────────────────────── */
interface Affiliate {
  id: string;
  user_id: string;
  name: string;
  email: string;
  code: string;
  status: "pending" | "active" | "suspended";
  commission_pct: number;
  total_clicks: number;
  total_conversions: number;
  total_earnings: number;
  payout_email: string | null;
  notes: string | null;
  created_at: string;
}

interface Conversion {
  id: string;
  new_user_email: string | null;
  plan_amount: number;
  commission_amount: number;
  converted_at: string;
  paid_out: boolean;
}

/* ── Small stat card ───────────────────────────────────────────────────── */
const Stat = ({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string;
}) => (
  <div className="feature-card flex items-center gap-4 p-4">
    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${color}18` }}>
      <Icon size={18} style={{ color }} />
    </div>
    <div>
      <p className="text-muted-foreground text-xs uppercase tracking-wider">{label}</p>
      <p className="text-foreground font-black text-xl">{value}</p>
    </div>
  </div>
);

/* ── Status badge ─────────────────────────────────────────────────────── */
const StatusBadge = ({ status }: { status: string }) => {
  const cfg: Record<string, { label: string; class: string }> = {
    active:    { label: "Active",    class: "bg-green-500/15 text-green-400 border-green-500/30" },
    pending:   { label: "Pending",   class: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
    suspended: { label: "Suspended", class: "bg-red-500/15 text-red-400 border-red-500/30" },
  };
  const s = cfg[status] ?? cfg.pending;
  return (
    <span className={`text-xs font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${s.class}`}>
      {s.label}
    </span>
  );
};

/* ── Main component ────────────────────────────────────────────────────── */
const ManageAffiliates = () => {
  const [affiliates,   setAffiliates]   = useState<Affiliate[]>([]);
  const [filter,       setFilter]       = useState<"all" | "active" | "pending" | "suspended">("all");
  const [loading,      setLoading]      = useState(true);
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [convMap,      setConvMap]      = useState<Record<string, Conversion[]>>({});
  const [editingComm,  setEditingComm]  = useState<Record<string, string>>({});
  const [savingComm,   setSavingComm]   = useState<string | null>(null);
  const [copied,       setCopied]       = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any)
        .from("affiliates")
        .select("*")
        .order("created_at", { ascending: false });
      if (!error) setAffiliates(data ?? []);
      setLoading(false);
    })();
  }, []);

  /* ── Expand: load conversions ──────────────────────────────────────── */
  const toggleExpand = async (aff: Affiliate) => {
    if (expanded === aff.id) { setExpanded(null); return; }
    setExpanded(aff.id);
    if (convMap[aff.code]) return; // cached

    const { data } = await (supabase as any)
      .from("affiliate_conversions")
      .select("*")
      .eq("code", aff.code)
      .order("converted_at", { ascending: false });
    setConvMap(prev => ({ ...prev, [aff.code]: data ?? [] }));
  };

  /* ── Toggle status ─────────────────────────────────────────────────── */
  const toggleStatus = async (aff: Affiliate) => {
    const next = aff.status === "active" ? "suspended" : "active";
    const { error } = await (supabase as any)
      .from("affiliates").update({ status: next }).eq("id", aff.id);
    if (!error) {
      setAffiliates(prev => prev.map(a => a.id === aff.id ? { ...a, status: next } : a));
    }
  };

  /* ── Save commission ───────────────────────────────────────────────── */
  const saveCommission = async (aff: Affiliate) => {
    const pct = parseFloat(editingComm[aff.id] ?? aff.commission_pct.toString());
    if (isNaN(pct) || pct < 0 || pct > 100) return;
    setSavingComm(aff.id);
    const { error } = await (supabase as any)
      .from("affiliates").update({ commission_pct: pct }).eq("id", aff.id);
    if (!error) {
      setAffiliates(prev => prev.map(a => a.id === aff.id ? { ...a, commission_pct: pct } : a));
      setEditingComm(prev => { const n = { ...prev }; delete n[aff.id]; return n; });
    }
    setSavingComm(null);
  };

  /* ── Mark conversion paid ──────────────────────────────────────────── */
  const markPaid = async (convId: string, code: string) => {
    const { error } = await (supabase as any)
      .from("affiliate_conversions").update({ paid_out: true }).eq("id", convId);
    if (!error) {
      setConvMap(prev => ({
        ...prev,
        [code]: (prev[code] ?? []).map(c => c.id === convId ? { ...c, paid_out: true } : c),
      }));
    }
  };

  /* ── Copy link ─────────────────────────────────────────────────────── */
  const copyLink = async (code: string) => {
    await navigator.clipboard.writeText(buildReferralLink(code));
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  /* ── Derived stats ─────────────────────────────────────────────────── */
  const active       = affiliates.filter(a => a.status === "active").length;
  const totalRevenue = affiliates.reduce((s, a) => s + Number(a.total_earnings), 0);
  const totalConvs   = affiliates.reduce((s, a) => s + a.total_conversions, 0);

  const filtered = filter === "all" ? affiliates : affiliates.filter(a => a.status === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-foreground">Affiliate Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage affiliates, track conversions, and process payouts.
        </p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat icon={Users}              label="Total Affiliates" value={affiliates.length.toString()} color="#ec4899" />
        <Stat icon={CheckCircle}        label="Active"           value={active.toString()}             color="#22c55e" />
        <Stat icon={TrendingUp}         label="Conversions"      value={totalConvs.toString()}         color="#a855f7" />
        <Stat icon={DollarSign}         label="Commissions Owed" value={`$${totalRevenue.toFixed(2)}`} color="#84cc16" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["all", "active", "pending", "suspended"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${
              filter === f
                ? "bg-primary text-white"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Affiliates table */}
      {filtered.length === 0 ? (
        <div className="feature-card text-center py-12">
          <p className="text-3xl mb-3">🤝</p>
          <p className="text-muted-foreground">No affiliates found.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(aff => (
            <div key={aff.id} className="feature-card overflow-hidden">

              {/* Row */}
              <div className="flex flex-wrap items-center gap-4">

                {/* Avatar + info */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-black shrink-0">
                    {aff.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">{aff.name}</p>
                    <p className="text-muted-foreground text-xs truncate">{aff.email}</p>
                  </div>
                </div>

                {/* Code + link */}
                <div className="flex items-center gap-1.5">
                  <code className="text-pink font-mono text-sm font-black">{aff.code}</code>
                  <button
                    onClick={() => copyLink(aff.code)}
                    className="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10"
                    title="Copy referral link"
                  >
                    {copied === aff.code ? <Check size={12} className="text-green-400" /> : <Copy size={12} className="text-muted-foreground" />}
                  </button>
                </div>

                {/* Status badge */}
                <StatusBadge status={aff.status} />

                {/* Stats */}
                <div className="flex items-center gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-foreground font-black">{aff.total_clicks}</p>
                    <p className="text-muted-foreground text-xs">clicks</p>
                  </div>
                  <div className="text-center">
                    <p className="text-foreground font-black">{aff.total_conversions}</p>
                    <p className="text-muted-foreground text-xs">convs</p>
                  </div>
                  <div className="text-center">
                    <p className="text-green-400 font-black">${Number(aff.total_earnings).toFixed(2)}</p>
                    <p className="text-muted-foreground text-xs">earned</p>
                  </div>
                </div>

                {/* Commission editor */}
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={editingComm[aff.id] ?? aff.commission_pct}
                    onChange={e => setEditingComm(prev => ({ ...prev, [aff.id]: e.target.value }))}
                    className="w-16 bg-background border border-border rounded-lg px-2 py-1 text-sm text-center text-foreground focus:outline-none focus:border-primary"
                  />
                  <span className="text-muted-foreground text-xs">%</span>
                  {editingComm[aff.id] !== undefined && (
                    <button
                      onClick={() => saveCommission(aff)}
                      disabled={savingComm === aff.id}
                      className="text-xs text-primary font-bold hover:underline"
                    >
                      {savingComm === aff.id ? "…" : "Save"}
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => toggleStatus(aff)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${
                      aff.status === "active"
                        ? "bg-red-500/15 text-red-400 hover:bg-red-500/25"
                        : "bg-green-500/15 text-green-400 hover:bg-green-500/25"
                    }`}
                  >
                    {aff.status === "active" ? "Suspend" : "Activate"}
                  </button>

                  <button
                    onClick={() => toggleExpand(aff)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {expanded === aff.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>
              </div>

              {/* Expanded: conversions */}
              {expanded === aff.id && (
                <div className="mt-4 pt-4 border-t border-border/30">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Conversions
                    </p>
                    <span className="text-xs text-muted-foreground">
                      · Payout email: <span className="text-pink">{aff.payout_email ?? aff.email}</span>
                    </span>
                  </div>

                  {!convMap[aff.code] ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : convMap[aff.code].length === 0 ? (
                    <p className="text-muted-foreground text-sm">No conversions yet.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border/30 text-muted-foreground text-xs uppercase tracking-wider">
                            <th className="text-left pb-2 pr-4">Date</th>
                            <th className="text-left pb-2 pr-4">Student</th>
                            <th className="text-right pb-2 pr-4">Plan</th>
                            <th className="text-right pb-2 pr-4">Commission</th>
                            <th className="text-right pb-2">Paid?</th>
                          </tr>
                        </thead>
                        <tbody>
                          {convMap[aff.code].map((c: Conversion) => (
                            <tr key={c.id} className="border-b border-border/20 hover:bg-white/[0.02]">
                              <td className="py-2 pr-4 text-muted-foreground">
                                {new Date(c.converted_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                              </td>
                              <td className="py-2 pr-4 text-foreground">
                                {c.new_user_email ? c.new_user_email.replace(/(.{3}).*(@)/, "$1…$2") : "—"}
                              </td>
                              <td className="py-2 pr-4 text-right">${Number(c.plan_amount).toFixed(2)}</td>
                              <td className="py-2 pr-4 text-right font-bold text-green-400">
                                +${Number(c.commission_amount).toFixed(2)}
                              </td>
                              <td className="py-2 text-right">
                                {c.paid_out ? (
                                  <span className="text-green-400 text-xs font-bold">✓ Paid</span>
                                ) : (
                                  <button
                                    onClick={() => markPaid(c.id, aff.code)}
                                    className="text-xs text-yellow-400 hover:text-yellow-300 font-bold underline"
                                  >
                                    Mark paid
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {aff.notes !== null && (
                    <p className="text-muted-foreground text-xs mt-3 italic">Note: {aff.notes}</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ManageAffiliates;
