import { useState, useRef, useEffect } from "react";
import { LogIn } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import gsap from "gsap";

const LANGS = [{ code: "en", label: "EN" }];

const Navbar = () => {
  const [isOpen, setIsOpen]   = useState(false);
  const menuRef  = useRef<HTMLDivElement>(null);
  const tlRef    = useRef<gsap.core.Timeline | null>(null);
  const btnRef   = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const { t, i18n } = useTranslation();

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
        <div className="hidden md:flex items-center justify-center gap-8">
          <Link to="/" className="text-2xl font-black text-foreground">Musicable</Link>

          {isHomePage && navLinks.map((link) => (
            <a key={link.href} href={link.href} className="nav-link">{link.label}</a>
          ))}

          <Link to="/pricing" className="nav-link font-semibold">{t("nav.pricing")}</Link>
          <Link to="/affiliate" className="nav-link font-semibold">Affiliate</Link>

          <Link to="/login" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors font-medium">
            <LogIn className="w-4 h-4" /> {t("nav.login")}
          </Link>

          <Link to="/signup" className="btn-primary animate-pulse-glow text-sm px-6 py-3">
            {t("nav.start")}
          </Link>

          <LangSwitcher />
        </div>

        {/* Mobile row */}
        <div className="flex md:hidden items-center justify-between">
          <Link to="/" className="text-2xl font-black text-foreground">Musicable</Link>
          <div className="flex items-center gap-3">
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

          <Link
            to="/affiliate"
            data-item
            className="nav-link py-2 font-semibold border-b border-border/20 pb-3"
            onClick={close}
          >
            Affiliate
          </Link>

          <Link
            to="/login"
            data-item
            className="flex items-center gap-2 nav-link py-2 font-medium border-b border-border/20 pb-3"
            onClick={close}
          >
            <LogIn className="w-4 h-4" /> {t("nav.login")}
          </Link>

          <Link
            to="/signup"
            data-item
            className="btn-primary text-sm text-center mt-1"
            onClick={close}
          >
            {t("nav.start")}
          </Link>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;
