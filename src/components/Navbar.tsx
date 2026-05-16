import { useState } from "react";
import { Menu, X, LogIn } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const LANGS = [
  { code: "en", label: "EN" },
  { code: "ru", label: "RU" },
  { code: "ar", label: "AR" },
];

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";
  const { t, i18n } = useTranslation();

  const navLinks = [
    { href: "#home",    label: t("nav.home")    },
    { href: "#about",   label: t("nav.about")   },
    { href: "#contact", label: t("nav.contact") },
  ];

  const LangSwitcher = () => (
    <div className="flex items-center gap-1 text-xs font-semibold">
      {LANGS.map((l, idx) => (
        <span key={l.code} className="flex items-center gap-1">
          <button
            onClick={() => i18n.changeLanguage(l.code)}
            className={`px-1 transition-colors ${
              i18n.language === l.code
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
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
      <div className="container mx-auto px-8 py-4">

        {/* Desktop row */}
        <div className="hidden md:flex items-center justify-center gap-8">
          <Link to="/" className="text-2xl font-black text-foreground">Musicable</Link>

          {isHomePage && navLinks.map((link) => (
            <a key={link.href} href={link.href} className="nav-link">
              {link.label}
            </a>
          ))}

          <Link to="/pricing" className="nav-link font-semibold">{t("nav.pricing")}</Link>

          <Link to="/login" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors font-medium">
            <LogIn className="w-4 h-4" /> {t("nav.login")}
          </Link>

          <Link to="/signup" className="btn-primary text-sm px-6 py-3">{t("nav.start")}</Link>

          <LangSwitcher />
        </div>

        {/* Mobile row */}
        <div className="flex md:hidden items-center justify-between">
          <Link to="/" className="text-2xl font-black text-foreground">Musicable</Link>
          <div className="flex items-center gap-3">
            <LangSwitcher />
            <button className="p-2 text-foreground hover:text-primary transition-colors rounded-lg" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 flex flex-col gap-4">
            {isHomePage && navLinks.map((link) => (
              <a key={link.href} href={link.href} className="nav-link py-2" onClick={() => setIsOpen(false)}>
                {link.label}
              </a>
            ))}

            <Link to="/pricing" className="nav-link py-2 font-semibold" onClick={() => setIsOpen(false)}>
              {t("nav.pricing")}
            </Link>

            <Link to="/login" className="flex items-center gap-2 nav-link py-2 font-medium" onClick={() => setIsOpen(false)}>
              <LogIn className="w-4 h-4" /> {t("nav.login")}
            </Link>

            <Link to="/signup" className="btn-primary text-sm text-center" onClick={() => setIsOpen(false)}>
              {t("nav.start")}
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
