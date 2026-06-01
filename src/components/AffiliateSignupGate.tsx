import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertCircle, Check } from "lucide-react";

interface AffiliateFormData {
  fullName: string;
  email: string;
  website: string;
  payoutMethod: "stripe" | "paypal" | "bank";
  bankEmail?: string;
  acceptTerms: boolean;
}

const AffiliateSignupGate = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<AffiliateFormData>({
    fullName: "",
    email: user?.email || "",
    website: "",
    payoutMethod: "stripe",
    bankEmail: user?.email,
    acceptTerms: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  if (!user) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!formData.fullName.trim()) {
        setError("Full name is required");
        setLoading(false);
        return;
      }

      if (!formData.website.trim() && !formData.bankEmail) {
        setError("Please provide a website or contact method");
        setLoading(false);
        return;
      }

      if (!formData.acceptTerms) {
        setError("You must accept the terms and conditions");
        setLoading(false);
        return;
      }

      // 1. Save affiliate profile to Firestore
      if (db) {
        await addDoc(collection(db, "affiliates"), {
          userId: user.id,
          email: user.email,
          fullName: formData.fullName,
          website: formData.website || null,
          payoutMethod: formData.payoutMethod,
          payoutEmail: formData.bankEmail,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // 2. Add "affiliate" role to user in Supabase
      const { error: roleError } = await (supabase as any)
        .from("user_roles")
        .insert({ user_id: user.id, role: "affiliate" });

      if (roleError && !roleError.message.includes("duplicate")) {
        console.warn("Role insert warning:", roleError);
      }

      setSuccess(true);
      setTimeout(() => navigate("/dashboard"), 2000);
    } catch (err: any) {
      console.error("Signup error:", err);
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <div className="w-16 h-16 bg-pink/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-pink" />
          </div>
          <h1 className="text-4xl font-black text-foreground mb-3">Welcome Aboard!</h1>
          <p className="text-muted-foreground mb-6">
            Your affiliate account is being set up. You'll receive a welcome email with your unique
            affiliate link and dashboard access.
          </p>
          <p className="text-sm text-muted-foreground">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-16 flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-3xl font-black tracking-tighter">
            Become a <span className="text-pink">Musicable</span> Affiliate
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Join our affiliate program and start earning 15% recurring commission. Students and
            teachers can become affiliates too!
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-sm font-semibold mb-1">Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Your name"
                className="w-full px-4 py-2 bg-background/50 border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink/50"
                disabled={loading}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-semibold mb-1">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full px-4 py-2 bg-background/50 border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink/50"
                disabled={loading}
              />
            </div>

            {/* Website / Social */}
            <div>
              <label className="block text-sm font-semibold mb-1">
                Website or Social Media
                <span className="text-muted-foreground font-normal text-xs ml-1">(optional)</span>
              </label>
              <input
                type="text"
                name="website"
                value={formData.website}
                onChange={handleChange}
                placeholder="https://yourwebsite.com or @instagram_handle"
                className="w-full px-4 py-2 bg-background/50 border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink/50"
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Where will you be promoting Musicable?
              </p>
            </div>

            {/* Payout Method */}
            <div>
              <label className="block text-sm font-semibold mb-1">Payout Method</label>
              <select
                name="payoutMethod"
                value={formData.payoutMethod}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-background/50 border border-border/50 rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-pink/50"
                disabled={loading}
              >
                <option value="stripe">Stripe (Recommended)</option>
                <option value="paypal">PayPal</option>
                <option value="bank">Bank Transfer</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Monthly payouts on the 15th of each month
              </p>
            </div>

            {/* Payout Email */}
            {(formData.payoutMethod === "paypal" || formData.payoutMethod === "bank") && (
              <div>
                <label className="block text-sm font-semibold mb-1">
                  {formData.payoutMethod === "paypal" ? "PayPal Email" : "Bank Contact Email"}
                </label>
                <input
                  type="email"
                  name="bankEmail"
                  value={formData.bankEmail}
                  onChange={handleChange}
                  placeholder="payout@email.com"
                  className="w-full px-4 py-2 bg-background/50 border border-border/50 rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-pink/50"
                  disabled={loading}
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Terms */}
            <div className="flex items-start gap-2 pt-2">
              <input
                type="checkbox"
                name="acceptTerms"
                checked={formData.acceptTerms}
                onChange={handleChange}
                className="w-4 h-4 mt-1 rounded"
                disabled={loading}
              />
              <label className="text-xs text-muted-foreground">
                I agree to the Musicable Affiliate Terms and Conditions. I understand that affiliate
                accounts are subject to approval and may be suspended for violation of policies.
              </label>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-3 rounded-lg mt-6"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Setting Up...
                </>
              ) : (
                "Become an Affiliate"
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground mt-4">
              Already an affiliate?{" "}
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="text-pink hover:underline font-semibold"
              >
                Go to Dashboard
              </button>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AffiliateSignupGate;
