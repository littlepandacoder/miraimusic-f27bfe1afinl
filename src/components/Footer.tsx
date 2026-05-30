import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { Mail, Phone, MapPin, Instagram, Facebook, Youtube } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const Footer = () => {
  const footerRef  = useRef<HTMLElement>(null);
  const colsRef    = useRef<(HTMLDivElement | null)[]>([]);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const socialRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const footer = footerRef.current;
    const cols   = colsRef.current.filter(Boolean) as HTMLDivElement[];
    const bottom = bottomRef.current;
    if (!footer || !cols.length) return;

    // Columns bounce up from below, staggered
    gsap.fromTo(
      cols,
      { y: 60, opacity: 0 },
      {
        y: 0,
        opacity: 1,
        duration: 0.72,
        ease: "back.out(1.6)",
        stagger: 0.12,
        scrollTrigger: { trigger: footer, start: "top 88%", once: true },
      }
    );

    // Copyright bar slides up after columns
    if (bottom) {
      gsap.fromTo(
        bottom,
        { y: 24, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.55,
          ease: "power2.out",
          delay: 0.55,
          scrollTrigger: { trigger: footer, start: "top 86%", once: true },
        }
      );
    }

    // Social icons spring in individually
    const icons = Array.from(socialRef.current?.querySelectorAll("a") ?? []);
    if (icons.length) {
      gsap.fromTo(
        icons,
        { scale: 0, rotation: -20 },
        {
          scale: 1,
          rotation: 0,
          duration: 0.5,
          ease: "back.out(2.2)",
          stagger: 0.09,
          delay: 0.35,
          scrollTrigger: { trigger: footer, start: "top 85%", once: true },
        }
      );
    }

    return () => ScrollTrigger.getAll().forEach((t) => t.kill());
  }, []);

  return (
    <footer ref={footerRef} id="contact" className="py-16 bg-navy-dark border-t border-border/30">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-12">

          {/* Brand */}
          <div ref={(el) => { colsRef.current[0] = el; }} className="md:col-span-1">
            <h3 className="text-2xl font-black text-foreground mb-4">Musicable</h3>
            <p className="text-muted-foreground text-sm">
              Transform your piano journey with our innovative AI-powered learning platform.
              100% guaranteed exam success.
            </p>
          </div>

          {/* Quick Links */}
          <div ref={(el) => { colsRef.current[1] = el; }}>
            <h4 className="font-bold text-foreground mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><a href="#home"   className="text-muted-foreground hover:text-primary transition-colors text-sm">Home</a></li>
              <li><a href="#about"  className="text-muted-foreground hover:text-primary transition-colors text-sm">About Us</a></li>
              <li><a href="/signup" className="text-muted-foreground hover:text-primary transition-colors text-sm">Start Free Trial</a></li>
              <li><a href="#contact"className="text-muted-foreground hover:text-primary transition-colors text-sm">Contact</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div ref={(el) => { colsRef.current[2] = el; }}>
            <h4 className="font-bold text-foreground mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-muted-foreground text-sm">
                <Mail className="w-4 h-4 text-primary shrink-0" />
                hello@musicable.app
              </li>
              <li className="flex items-center gap-3 text-muted-foreground text-sm">
                <Phone className="w-4 h-4 text-primary shrink-0" />
                +971562102658
              </li>
              <li className="flex items-start gap-3 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                Online Piano Academy<br />Available Worldwide
              </li>
            </ul>
          </div>

          {/* Social */}
          <div ref={(el) => { colsRef.current[3] = el; }}>
            <h4 className="font-bold text-foreground mb-4">Follow Us</h4>
            <div ref={socialRef} className="flex gap-3">
              <a href="#" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary transition-colors">
                <Instagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary transition-colors">
                <Facebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:bg-primary transition-colors">
                <Youtube className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>

        <div ref={bottomRef} className="border-t border-border/30 pt-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Musicableapp. All rights reserved.
          </p>
          <div className="flex gap-4 text-sm">
            <Link to="/terms"   className="text-muted-foreground hover:text-primary transition-colors">Terms &amp; Conditions</Link>
            <Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
