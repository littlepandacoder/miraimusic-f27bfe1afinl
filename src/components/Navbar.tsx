import { useState } from "react";
import { Menu, X, LogIn, ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [gamesDropdownOpen, setGamesDropdownOpen] = useState(false);
  const location = useLocation();
  const isHomePage = location.pathname === "/";

  const navLinks = [
    { href: "#home", label: "Home" },
    { href: "#about", label: "About Us" },
    { href: "#contact", label: "Contact Us" },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/90 backdrop-blur-md border-b border-border/30">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="text-2xl font-black text-foreground">Musicable</Link>

          {/* Desktop Navigation */}
          <div className="flex-1 flex justify-center">
            <div className="hidden md:flex items-center gap-8">
              {isHomePage && navLinks.map((link, index) => (
                <a key={link.href} href={link.href} className={`nav-link ${index === 0 ? 'ml-5' : ''}`}>
                  {link.label}
                </a>
              ))}

              <Link to="/pricing" className="nav-link font-semibold">Pricing</Link>

              <div className="relative">
                <button
                  onClick={() => setGamesDropdownOpen(!gamesDropdownOpen)}
                  className="nav-link font-semibold flex items-center gap-1"
                >
                  GAMES <ChevronDown className="w-4 h-4" />
                </button>
                {gamesDropdownOpen && (
                  <div className="absolute top-full left-0 mt-2 bg-background border border-border rounded-md shadow-lg py-2 min-w-[200px]">
                    <a href="/note_naming.html" className="block px-4 py-2 text-foreground hover:bg-accent">Note Naming</a>
                    <a href="/sight-reading.html" className="block px-4 py-2 text-foreground hover:bg-accent">Sight Reading</a>
                    <a href="/piano-theory.html" className="block px-4 py-2 text-foreground hover:bg-accent">Piano Theory</a>
                  </div>
                )}
              </div>

              <Link to="/login" className="flex items-center gap-2 text-foreground hover:text-primary transition-colors font-medium">
                <LogIn className="w-4 h-4" /> Portal Login
              </Link>
              <Link to="/book-class" className="btn-primary text-sm px-6 py-3">Book a Class</Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button className="md:hidden text-foreground" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden mt-4 pb-4 flex flex-col gap-4">
            {isHomePage && navLinks.map(link => (
              <a key={link.href} href={link.href} className="nav-link py-2" onClick={() => setIsOpen(false)}>
                {link.label}
              </a>
            ))}
            <Link to="/pricing" className="nav-link py-2 font-semibold" onClick={() => setIsOpen(false)}>Pricing</Link>
            <button
              onClick={() => setGamesDropdownOpen(!gamesDropdownOpen)}
              className="nav-link py-2 font-semibold text-left flex items-center justify-between"
            >
              GAMES <ChevronDown className={`w-4 h-4 transition-transform ${gamesDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            {gamesDropdownOpen && (
              <div className="ml-4 flex flex-col gap-2">
                <a href="/note_naming.html" className="nav-link py-1" onClick={() => setIsOpen(false)}>Note Naming</a>
                <a href="/sight-reading.html" className="nav-link py-1" onClick={() => setIsOpen(false)}>Sight Reading</a>
                <a href="/piano-theory.html" className="nav-link py-1" onClick={() => setIsOpen(false)}>Piano Theory</a>
              </div>
            )}
            <Link to="/login" className="flex items-center gap-2 nav-link py-2 font-medium" onClick={() => setIsOpen(false)}>
              <LogIn className="w-4 h-4" /> Portal Login
            </Link>
            <Link to="/book-class" className="btn-primary text-sm text-center" onClick={() => setIsOpen(false)}>Book a Class</Link>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;