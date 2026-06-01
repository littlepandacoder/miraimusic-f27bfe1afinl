import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Capacitor } from "@capacitor/core";
import { PageTracking } from "@/hooks/usePageTracking";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Pricing from "./pages/Pricing";
import PianoTheory from "./pages/PianoTheory";
import SightReading from "./pages/SightReading";
import NoteNaming from "./pages/NoteNaming";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import Signup from "./pages/Signup";
import TeacherSignup from "./pages/TeacherSignup";
import ResetPassword from "./pages/ResetPassword";
import AuthCallback from "./pages/AuthCallback";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import OAuthRedirectHandler from "./components/OAuthRedirectHandler";
import MusicCursor from "./components/MusicCursor";
import NotFound from "./pages/NotFound";
import AffiliateLanding from "./pages/AffiliateLanding";
import AffiliateSignup from "./pages/AffiliateSignup";
import AffiliateDashboard from "./pages/AffiliateDashboard";

const queryClient = new QueryClient();

const App = () => (
  <>
    {!Capacitor.isNativePlatform() && <MusicCursor />}
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <PageTracking />
          <OAuthRedirectHandler />
          <Routes>
            <Route path="/" element={Capacitor.isNativePlatform() ? <Navigate to="/login" replace /> : <Index />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/blog/piano-theory" element={<PianoTheory />} />
            <Route path="/blog/sight-reading" element={<SightReading />} />
            <Route path="/blog/note-naming" element={<NoteNaming />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/teacher-signup" element={<TeacherSignup />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/dashboard/*" element={<Dashboard />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            {/* Affiliate program */}
            <Route path="/affiliate" element={<AffiliateLanding />} />
            <Route path="/affiliate-signup" element={<AffiliateSignup />} />
            <Route path="/affiliate-dashboard" element={<AffiliateDashboard />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </>
);

export default App;
