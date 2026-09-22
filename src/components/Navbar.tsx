import { useState, useRef, useEffect } from "react";
import { LogIn, MessageCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import gsap from "gsap";
import { useSignupNavigation } from "@/hooks/useSignupNavigation";
import { useBillingPortal } from "@/hooks/useBillingPortal";
import { useAuth } from "@/hooks/useAuth";

const LANGS = [{ code: "en", label: "EN" }];

const Navbar = () => {
  const [isOpen, setIsOpen]   = useState(false);
  const menuRef  = useRef<HTMLDivElement>(null);
  const tlRef    = useRef<gsap.core.Timeline | null>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const { t, i18n } = useTranslation();
  const { goToSignup, isLoggedIn } = useSignupNavigation();
  const { user } = useAuth();
  const { openPortal } = useBillingPortal();

  const navLinks = [
    { href: "#home",    label: t("nav.home")    },
    { href: "#about",   label: t("nav.about")   },
    { href: "#contact", label: t("nav.contact") },
  ];

  // Build the GSAP timeline once on mount (and when isHomePage changes)
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const items = Array.from(menu.querySelectorAll<HTMLElement>("[data-item]"));

    // display:none takes the element out of flow entirely — no invisible space
    gsap.set(menu,  { display: "none", y: -12, pointerEvents: "none" });
    gsap.set(items, { x: -28, opacity: 0 });

    const tl = gsap.timeline({
      paused: true,
      onReverseComplete: () => {
        gsap.set(menu, { display: "none", pointerEvents: "none" });
      },
    });

    // Open: set display first, then animate panel + links
    tl.set(menu, { display: "flex", pointerEvents: "auto" })
      .fromTo(menu,
        { opacity: 0, y: -12 },
        { opacity: 1, y: 0, duration: 0.32, ease: "power3.out" }
      )
      .fromTo(items,
        { x: -28, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.3, ease: "back.out(1.6)", stagger: 0.07 },
        "-=0.08"
      );

    tlRef.current = tl;

    return () => { tl.kill(); };
  }, [isHomePage]);

  // Orchestrated open / ease-reverse close
  const toggle = () => {
    const tl = tlRef.current;
    if (!tl) return;

    if (!isOpen) {
      tl.play();
      // Animate hamburger → X
      gsap.to(btnRef.current, { rotation: 90, duration: 0.28, ease: "power2.out" });
    } else {
      tl.reverse();              // ease reverse — stagger unwinds, panel slides back up
      // Animate X → hamburger
      gsap.to(btnRef.current, { rotation: 0, duration: 0.28, ease: "power2.out" });
    }
    setIsOpen((v) => !v);
  };

  const close = () => {
    if (!isOpen) return;
    tlRef.current?.reverse();
    gsap.to(btnRef.current, { rotation: 0, duration: 0.28, ease: "power2.out" });
    setIsOpen(false);
  };

  const LangSwitcher = () => (
    <div className="flex items-center gap-1 text-xs font-semibold">
      {LANGS.map((l, idx) => (
        <span key={l.code} className="flex items-center gap-1">
          <button
            onClick={() => i18n.changeLanguage(l.code)}
            className={`px-1 transition-colors ${
              i18n.language === l.code ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {l.label}
          </button>
          {idx < LANGS.length - 1 && <span className="text-border">|</span>}
        </span>
      ))}
    </div>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
      <div className="container mx-auto px-6 sm:px-8 py-4">

        {/* Desktop row */}
        <div className="hidden md:flex items-center justify-between gap-8">
          {/* Left side navigation */}
          <div className="flex items-center gap-8">
            {isHomePage && navLinks.map((link) => (
              <a key={link.href} href={link.href} className="nav-link">{link.label}</a>
            ))}

            <Link to="/pricing" className="nav-link font-semibold">{t("nav.pricing")}</Link>

            <a
              href="https://wa.me/966563206225?text=Hi%20Musicable%21%20I%20need%20help"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center text-foreground hover:text-primary transition-colors font-medium"
              title="Contact us on WhatsApp"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.67-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.076 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421-7.403h-.004a9.87 9.87 0 00-5.031 1.378c-3.055 2.2-4.982 5.973-4.982 10.102 0 1.08.19 2.144.567 3.163l-1.294 4.726 4.993-1.282c3.12 1.657 6.592 1.538 8.933-.041 3.322-2.392 5.441-6.184 5.441-10.338 0-2.857-.956-5.634-2.764-7.897-1.817-2.272-4.52-3.693-7.418-3.774z"/>
              </svg>
            </a>

            {isLoggedIn ? (
              <button
                onClick={() => user?.id && openPortal(user.id)}
                className="flex items-center gap-2 text-foreground hover:text-primary transition-colors font-medium cursor-pointer"
              >
                <LogIn className="w-4 h-4" /> {t("nav.login")}
              </button>
            ) : (
              <Link to="/login" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors font-medium">
                <LogIn className="w-4 h-4" /> {t("nav.login")}
              </Link>
            )}

            <button
              onClick={goToSignup}
              className="btn-primary animate-pulse-glow text-sm px-6 py-3"
            >
              {t("nav.start")}
            </button>
          </div>

          {/* Right side - Logo and Language */}
          <div className="flex items-center gap-6">
            <Link to="/" className="text-2xl font-black text-foreground whitespace-nowrap">Musicable</Link>
            <LangSwitcher />
          </div>
        </div>

        {/* Mobile row */}
        <div className="flex md:hidden items-center justify-between">
          <div className="flex-1" />
          <Link to="/" className="text-2xl font-black text-foreground">Musicable</Link>
          <div className="flex-1 flex items-center justify-end gap-3">
            <LangSwitcher />

            {/* Animated hamburger / X button */}
            <button
              ref={btnRef}
              onClick={toggle}
              aria-label="Toggle menu"
              aria-expanded={isOpen}
              className="p-2 text-foreground hover:text-primary transition-colors rounded-lg w-10 h-10 flex items-center justify-center"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                className="w-6 h-6"
              >
                {isOpen ? (
                  // X icon
                  <>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6"  y1="6" x2="18" y2="18" />
                  </>
                ) : (
                  // Hamburger icon
                  <>
                    <line x1="3" y1="6"  x2="21" y2="6"  />
                    <line x1="3" y1="12" x2="21" y2="12" />
                    <line x1="3" y1="18" x2="21" y2="18" />
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation — always rendered, GSAP controls visibility */}
        <div
          ref={menuRef}
          className="md:hidden mt-4 pb-4 flex flex-col gap-3"
          style={{ overflow: "clip" }}
        >
          {isHomePage && navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              data-item
              className="nav-link py-2 border-b border-border/20 pb-3"
              onClick={close}
            >
              {link.label}
            </a>
          ))}

          <Link
            to="/pricing"
            data-item
            className="nav-link py-2 font-semibold border-b border-border/20 pb-3"
            onClick={close}
          >
            {t("nav.pricing")}
          </Link>

          <a
            href="https://wa.me/966563206225?text=Hi%20Musicable%21%20I%20need%20help"
            target="_blank"
            rel="noopener noreferrer"
            data-item
            className="flex items-center gap-2 nav-link py-2 font-medium border-b border-border/20 pb-3"
            onClick={close}
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </a>

          {isLoggedIn ? (
            <button
              data-item
              onClick={() => {
                close();
                user?.id && openPortal(user.id);
              }}
              className="flex items-center gap-2 nav-link py-2 font-medium border-b border-border/20 pb-3 text-left cursor-pointer w-full"
            >
              <LogIn className="w-4 h-4" /> {t("nav.login")}
            </button>
          ) : (
            <Link
              to="/login"
              data-item
              className="flex items-center gap-2 nav-link py-2 font-medium border-b border-border/20 pb-3"
              onClick={close}
            >
              <LogIn className="w-4 h-4" /> {t("nav.login")}
            </Link>
          )}

          <button
            data-item
            onClick={() => {
              close();
              goToSignup();
            }}
            className="btn-primary text-sm text-center mt-1 w-full"
          >
            {t("nav.start")}
          </button>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
