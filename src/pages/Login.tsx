import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client"; // used for Google OAuth + forgot password
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Music, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const { signIn, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  useEffect(() => {
    if (!user || authLoading) return;
    // Route through /auth/callback so both email and Google logins
    // get the same welcome screen, subscription check, and final routing.
    // Pass through the next parameter if it exists
    const params = new URLSearchParams(window.location.search);
    const nextPath = params.get("next");
    const callbackUrl = nextPath ? `/auth/callback?next=${encodeURIComponent(nextPath)}` : "/auth/callback";
    navigate(callbackUrl);
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: t("login.errors.validation"), description: t("login.errors.enterBoth"), variant: "destructive" });
      return;
    }
    if (import.meta.env.DEV) console.log("[login] attempting sign in — email:", email.trim());
    setIsLoading(true);
    try {
      const { error } = await signIn(email.trim(), password);
      if (error) {
        if (import.meta.env.DEV) console.error("[login] signIn error:", error.message);
        toast({ title: t("login.errors.loginFailed"), description: error.message || t("login.errors.invalidCredentials"), variant: "destructive" });
      } else {
        if (import.meta.env.DEV) console.log("[login] signIn success");
        const firstName = email.split("@")[0];
        toast({ title: t("login.welcome", { name: firstName }), description: t("login.loggedIn") });
      }
    } catch (err) {
      if (import.meta.env.DEV) console.error("[login] unexpected error:", err);
      toast({ title: t("login.errors.loginFailed"), description: t("login.errors.unexpected"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setIsGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      toast({ title: t("login.errors.googleFailed"), description: error.message, variant: "destructive" });
      setIsGoogleLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast({ title: t("login.errors.enterEmail"), description: t("login.errors.enterEmailDesc"), variant: "destructive" });
      return;
    }
    setIsSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsSendingReset(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setForgotSent(true);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-card border-border">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
              <Music className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {showForgot ? t("login.resetTitle") : t("login.title")}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {showForgot ? t("login.resetSubtitle") : t("login.subtitle")}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {showForgot ? (
            forgotSent ? (
              <div className="text-center space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  {t("login.resetSent", { email: forgotEmail })}
                </p>
                <Button variant="outline" className="w-full" onClick={() => { setShowForgot(false); setForgotSent(false); setForgotEmail(""); }}>
                  {t("login.backToLogin")}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="forgot-email">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder={t("login.emailPlaceholder")}
                    className="bg-secondary border-border"
                  />
                </div>
                <Button type="submit" className="w-full btn-primary" disabled={isSendingReset}>
                  {isSendingReset ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("login.sending")}</> : t("login.sendReset")}
                </Button>
                <button type="button" onClick={() => setShowForgot(false)} className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                  {t("login.backToLogin")}
                </button>
              </form>
            )
          ) : (
            <>
              {/* Google Login */}
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center gap-3 border-border"
                onClick={handleGoogleLogin}
                disabled={isGoogleLoading}
              >
                {isGoogleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                {t("login.google")}
              </Button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">{t("login.or")}</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Email / Password */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("login.email")}</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("login.emailPlaceholder")}
                    required
                    className="bg-secondary border-border"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">{t("login.password")}</Label>
                    <button
                      type="button"
                      onClick={() => { setShowForgot(true); setForgotEmail(email); }}
                      className="text-xs text-primary hover:underline"
                    >
                      {t("login.forgot")}
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("login.passwordPlaceholder")}
                    required
                    className="bg-secondary border-border"
                  />
                </div>
                <Button type="submit" className="w-full btn-primary" disabled={isLoading}>
                  {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t("login.signingIn")}</> : t("login.signIn")}
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
