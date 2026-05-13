import { Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-24 max-w-3xl">
        <h1 className="text-4xl font-black text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground text-sm mb-10">Last updated: May 2026</p>

        <div className="space-y-10 text-foreground/90 leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Introduction</h2>
            <p className="text-muted-foreground">
              Musicable ("we", "us", "our") is committed to protecting your personal information. This Privacy
              Policy explains what data we collect, how we use it, and your rights regarding it. By using our
              Platform you agree to this policy. For questions, contact us at{" "}
              <a href="mailto:musicableapp@proton.me" className="text-primary hover:underline">musicableapp@proton.me</a>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Information We Collect</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-foreground mb-1">Account Information</h3>
                <p className="text-muted-foreground">
                  Name, email address, and password when you register. Administrators and teachers may also
                  provide information about students they enrol on the Platform.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Usage &amp; Performance Data</h3>
                <p className="text-muted-foreground">
                  Game scores, note accuracy, practice streaks, lesson progress, and quiz attempts. This data
                  powers your personalised dashboard and AI feedback.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Payment Information</h3>
                <p className="text-muted-foreground">
                  Subscription status and plan type. Actual payment details are processed entirely by PayPal
                  and never stored on our servers.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Device &amp; Log Data</h3>
                <p className="text-muted-foreground">
                  IP address, browser type, operating system, pages visited, and timestamps — collected
                  automatically to maintain security and improve performance.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Communications</h3>
                <p className="text-muted-foreground">
                  Messages you send to us via email or support channels.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li>Provide, operate, and improve the Platform and its features.</li>
              <li>Personalise your learning experience and generate AI performance feedback.</li>
              <li>Process subscription payments and manage your account.</li>
              <li>Send service-related communications (receipts, password resets, policy updates).</li>
              <li>Monitor for fraud, abuse, and security threats.</li>
              <li>Analyse aggregated, anonymised usage trends to improve our curriculum.</li>
              <li>Comply with legal obligations.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              We do <strong>not</strong> sell your personal data to third parties.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Data Sharing</h2>
            <p className="text-muted-foreground mb-3">We share data only in the following limited circumstances:</p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Service providers:</strong> Supabase (database &amp; auth), PayPal (payments), Anthropic (AI analysis), ElevenLabs (voice AI), Google (OAuth). Each provider processes data only as needed to deliver their service.</li>
              <li><strong>Teachers &amp; administrators:</strong> Teachers can view the progress data of students assigned to them. Administrators can view all user accounts within their organisation.</li>
              <li><strong>Legal requirements:</strong> Where required by law, court order, or to protect the safety of our users.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Cookies &amp; Tracking</h2>
            <p className="text-muted-foreground">
              We use essential cookies and local storage to keep you logged in and remember your preferences.
              We use Google Analytics (via Google Tag Manager) to understand traffic patterns — this data is
              aggregated and does not identify you personally. You can disable cookies in your browser settings,
              though some features may not function correctly.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Data Retention</h2>
            <p className="text-muted-foreground">
              We retain your account and performance data for as long as your account is active, plus up to
              2 years after deletion for legal and accounting purposes. Anonymised analytics data may be
              retained indefinitely.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">7. Children's Privacy</h2>
            <p className="text-muted-foreground">
              The Platform is designed for learners of all ages when accounts are created or supervised by a
              parent, guardian, teacher, or school administrator. We do not knowingly collect personal data
              directly from children under 13 without verified parental or institutional consent. If you believe
              we have inadvertently collected such data, contact us immediately and we will delete it.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">8. Security</h2>
            <p className="text-muted-foreground">
              We implement industry-standard safeguards including encrypted data transmission (TLS), hashed
              passwords, row-level database security, and access controls. However, no system is completely
              secure; we cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">9. Your Rights</h2>
            <p className="text-muted-foreground mb-3">
              Depending on your location, you may have the right to:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
              <li><strong>Access</strong> a copy of the personal data we hold about you.</li>
              <li><strong>Correct</strong> inaccurate or incomplete data.</li>
              <li><strong>Delete</strong> your account and associated personal data.</li>
              <li><strong>Restrict or object</strong> to certain processing activities.</li>
              <li><strong>Portability</strong> — receive your data in a structured, machine-readable format.</li>
            </ul>
            <p className="text-muted-foreground mt-3">
              To exercise any of these rights, email{" "}
              <a href="mailto:musicableapp@proton.me" className="text-primary hover:underline">musicableapp@proton.me</a>.
              We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">10. International Transfers</h2>
            <p className="text-muted-foreground">
              Musicable is operated from the UAE and uses cloud services whose servers may be located in the
              United States or European Union. By using the Platform you consent to your data being transferred
              to and processed in these jurisdictions in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">11. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you by email or a notice on
              the Platform before material changes take effect. Continued use constitutes acceptance of the
              updated policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">12. Contact Us</h2>
            <p className="text-muted-foreground">
              For any privacy-related questions or requests:{" "}
              <a href="mailto:musicableapp@proton.me" className="text-primary hover:underline">musicableapp@proton.me</a>
              <br />
              Phone: <a href="tel:+971562102658" className="text-primary hover:underline">+971 56 210 2658</a>
              <br />
              Also see our <Link to="/terms" className="text-primary hover:underline">Terms &amp; Conditions</Link>.
            </p>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Privacy;
