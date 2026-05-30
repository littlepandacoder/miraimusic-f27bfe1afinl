import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-4xl font-black text-foreground mb-2">Terms &amp; Conditions</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: May 2026</p>

        <div className="space-y-10 text-foreground/90 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing or using Musicable ("the Platform"), you agree to be bound by these Terms &amp; Conditions
              and our <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>. If you do not
              agree, please do not use the Platform. These terms apply to all users — students, teachers, and administrators.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground">
              Musicable is an AI-powered online piano learning platform. We provide interactive lessons, gamified
              practice tools, AI-generated feedback, live teacher sessions, and progress tracking. Access to certain
              features requires an active subscription.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. Accounts &amp; Registration</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for keeping your login credentials secure and for all activity under your account.</li>
              <li>Accounts created by administrators on behalf of students belong to those students individually.</li>
              <li>You must be at least 13 years old to register. Users under 18 require parental or guardian consent.</li>
              <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Subscriptions &amp; Payments</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Subscriptions are billed on the frequency stated at checkout (monthly or annually).</li>
              <li>Payments are processed securely via PayPal. Musicable does not store your payment card details.</li>
              <li>Subscription fees are non-refundable except where required by applicable law.</li>
              <li>You may cancel your subscription at any time. Access continues until the end of the current billing period.</li>
              <li>We reserve the right to change pricing with 30 days' notice. Continued use after notice constitutes acceptance.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Acceptable Use</h2>
            <p className="text-muted-foreground mb-3">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Share your account credentials with others or allow simultaneous use by multiple people.</li>
              <li>Reproduce, distribute, or resell any Platform content without written permission.</li>
              <li>Attempt to reverse-engineer, scrape, or bypass any security feature of the Platform.</li>
              <li>Upload or transmit harmful, offensive, or infringing content.</li>
              <li>Use the Platform for any unlawful purpose.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Intellectual Property</h2>
            <p className="text-muted-foreground">
              All content on the Platform — including lesson videos, exercises, sheet music, AI-generated feedback,
              software, and branding — is owned by or licensed to Musicable. You are granted a limited,
              non-exclusive, non-transferable licence to access this content for personal educational use only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. AI Features &amp; Limitations</h2>
            <p className="text-muted-foreground">
              Musicable uses AI to analyse your playing and provide feedback. AI-generated suggestions are
              educational aids and do not substitute for professional music instruction. We do not guarantee
              the accuracy of AI feedback in all cases. Exam pass guarantees (where stated) are subject to
              separate terms communicated at point of sale.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Disclaimer of Warranties</h2>
            <p className="text-muted-foreground">
              The Platform is provided "as is" without warranties of any kind. We do not guarantee uninterrupted
              or error-free access. To the fullest extent permitted by law, Musicable disclaims all implied
              warranties, including fitness for a particular purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, Musicable and its affiliates will not be liable for
              indirect, incidental, or consequential damages arising from your use of the Platform. Our total
              liability to you in any month will not exceed the subscription fees you paid in that month.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. Termination</h2>
            <p className="text-muted-foreground">
              We may suspend or terminate your access at any time for violation of these terms, non-payment,
              or at our discretion with reasonable notice. You may delete your account by contacting us at{" "}
              <a href="mailto:hello@musicable.app" className="text-primary hover:underline">hello@musicable.app</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">11. Governing Law</h2>
            <p className="text-muted-foreground">
              These terms are governed by the laws of the United Arab Emirates. Any disputes shall be resolved
              in the courts of the UAE, unless otherwise required by your local consumer protection laws.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">12. Changes to These Terms</h2>
            <p className="text-muted-foreground">
              We may update these terms from time to time. We will notify you via email or a notice on the
              Platform at least 14 days before significant changes take effect. Continued use constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">13. Contact</h2>
            <p className="text-muted-foreground">
              Questions about these terms? Reach us at{" "}
              <a href="mailto:hello@musicable.app" className="text-primary hover:underline">hello@musicable.app</a>{" "}
              or call <a href="tel:+971562102658" className="text-primary hover:underline">+971 56 210 2658</a>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Terms;
