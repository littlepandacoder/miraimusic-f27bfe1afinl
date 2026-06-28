import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check, Zap, ShieldCheck, GraduationCap, Users, Mic } from "lucide-react";

const studentFeatures = [
  "$17/month or $199/year — cancel anytime",
  "Access all Foundation & Course modules",
  "AI-powered piano feedback",
  "Gamified learning maps & quizzes",
  "Track your progress in real time",
  "1-on-1 live lessons with teachers",
  "Priority lesson booking",
  "Community access",
];

const premiumFeatures = [
  "$29/month — AI Tutor plan",
  "Everything in Student plan",
  "AI Tutor with Voice — unlimited conversations",
  "Real-time voice feedback & guidance",
  "Advanced progress analytics",
  "Priority support",
  "Ad-free experience",
];

const teacherFeatures = [
  "10 student seats included",
  "Onboard & manage your own students",
  "Live Piano Hero room for lessons",
  "Shared piano — teacher + student view",
  "All Foundation & Course content",
  "AI lesson plan generator",
  "Lesson scheduling & management",
  "+$1 per extra student seat",
];

const Pricing = () => {
  const { user, roles } = useAuth();
  const navigate = useNavigate();

  const handleStudentCTA = () => {
    if (user && roles.length > 0) navigate("/dashboard");
    else navigate("/signup?plan=student");
  };

  const handlePremiumCTA = () => {
    if (user && roles.includes("student")) navigate("/dashboard?upgrade=premium");
    else navigate("/signup?plan=premium");
  };

  const handleTeacherCTA = () => {
    if (user && roles.includes("teacher")) navigate("/dashboard");
    else navigate("/teacher-signup");
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navbar />
      <main className="pt-20 sm:pt-24 md:pt-28 pb-12 sm:pb-16 md:pb-20">
        <div className="container mx-auto px-4 sm:px-6">

          <div className="text-center max-w-2xl mx-auto mb-12 sm:mb-16">
            <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full bg-primary/10 text-primary mb-4 sm:mb-6">
              <Zap className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-semibold">Simple, honest pricing</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black mb-3 sm:mb-4">
              Pick Your <span className="text-primary">Plan.</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
              Whether you're learning or teaching — we have a plan that fits.
            </p>
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">

            {/* Student Plan */}
            <Card className="relative bg-card border-primary ring-2 ring-primary/20 flex flex-col">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1 rounded-full bg-primary text-primary-foreground text-xs font-bold whitespace-nowrap">
                Most Popular
              </div>
              <CardHeader className="pb-4 text-center pt-6 sm:pt-8">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-lg sm:text-xl font-black mb-1">Student</CardTitle>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl sm:text-4xl font-black">$17</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground text-xs mt-1">or $199/year. Cancel anytime.</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4 sm:space-y-6">
                <ul className="space-y-2 flex-1">
                  {studentFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button className="w-full btn-hero text-sm sm:text-base py-2 sm:py-3" onClick={handleStudentCTA}>
                  {user && roles.length > 0 ? "Go to Dashboard" : "Get Started"}
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3 h-3 text-primary" /> Secure via Stripe
                </div>
              </CardContent>
            </Card>

            {/* Premium AI Tutor Plan */}
            <Card className="relative bg-card border-purple-500/30 ring-2 ring-purple-500/20 flex flex-col md:scale-105">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1 rounded-full bg-purple-500 text-white text-xs font-bold whitespace-nowrap">
                AI Tutor
              </div>
              <CardHeader className="pb-4 text-center pt-6 sm:pt-8">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <Mic className="w-5 h-5 text-purple-400" />
                  </div>
                </div>
                <CardTitle className="text-lg sm:text-xl font-black mb-1">Premium</CardTitle>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl sm:text-4xl font-black">$29</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">/month</span>
                </div>
                <p className="text-muted-foreground text-xs mt-1">AI Tutor with Voice included</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4 sm:space-y-6">
                <ul className="space-y-2 flex-1">
                  {premiumFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white text-sm sm:text-base py-2 sm:py-3"
                  onClick={handlePremiumCTA}
                >
                  Upgrade to Premium
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3 h-3 text-purple-400" /> Secure via Stripe · Cancel anytime
                </div>
              </CardContent>
            </Card>

            {/* Teacher Plan */}
            <Card className="relative bg-card border-blue-500/30 ring-2 ring-blue-500/20 flex flex-col">
              <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 sm:px-4 py-1 rounded-full bg-blue-500 text-white text-xs font-bold whitespace-nowrap">
                For Teachers
              </div>
              <CardHeader className="pb-4 text-center pt-6 sm:pt-8">
                <div className="flex justify-center mb-2">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <GraduationCap className="w-5 h-5 text-blue-400" />
                  </div>
                </div>
                <CardTitle className="text-lg sm:text-xl font-black mb-1">Teacher</CardTitle>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-3xl sm:text-4xl font-black">$20</span>
                  <span className="text-xs sm:text-sm text-muted-foreground">/month</span>
                </div>
                <div className="flex items-center justify-center gap-1 text-xs text-blue-400 mt-1">
                  <Users className="w-3 h-3" /> 10 student seats included
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col space-y-4 sm:space-y-6">
                <ul className="space-y-2 flex-1">
                  {teacherFeatures.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                      <span className="text-xs sm:text-sm">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full bg-blue-500 hover:bg-blue-600 text-white text-sm sm:text-base py-2 sm:py-3"
                  onClick={handleTeacherCTA}
                >
                  {user && roles.includes("teacher") ? "Go to Dashboard" : "Get Teacher Plan"}
                </Button>
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-3 h-3 text-blue-400" /> Secure via Stripe · Cancel anytime
                </div>
              </CardContent>
            </Card>

          </div>

          {/* FAQ */}
          <div className="max-w-2xl mx-auto mt-12 sm:mt-16 md:mt-20 space-y-4 sm:space-y-6">
            <h2 className="text-xl sm:text-2xl font-black text-center mb-6 sm:mb-8">Common Questions</h2>
            {[
              { q: "Can I pay yearly instead of monthly?", a: "Yes — choose Yearly at checkout to pay $199/year instead of $17/month." },
              { q: "How does the teacher plan work?", a: "You get 10 student seat slots. You can onboard students directly from your dashboard. Need more? Add seats for $1 each." },
              { q: "Can I add more than 10 students as a teacher?", a: "Yes — buy additional seats from your My Students dashboard at $1/seat. Each seat unlocks one more student slot." },
              { q: "How do I cancel?", a: "Cancel from the Stripe Customer Portal your subscription at any time. You keep access until the end of your billing period." },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-border/40 pb-4 sm:pb-6">
                <h3 className="font-bold mb-2 text-sm sm:text-base">{q}</h3>
                <p className="text-muted-foreground text-xs sm:text-sm">{a}</p>
              </div>
            ))}
          </div>

        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Pricing;
