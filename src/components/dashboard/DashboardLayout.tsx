import { ReactNode, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  LogOut,
  Home,
  Users,
  Calendar,
  BookOpen,
  Settings,
  ClipboardList,
  Gamepad2,
  KeyboardMusic,
  Music,
  Menu,
  X,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  role: "admin" | "teacher" | "student";
}

const DashboardLayout = ({ children, title, role }: DashboardLayoutProps) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const gameItems = [
    { href: "/piano_hero.html#room", icon: KeyboardMusic, label: "Piano Room",    external: true },
    { href: "/piano_hero.html",      icon: Gamepad2,      label: "Piano Hero",    external: true },
    { href: "/rhythm-quiz.html",     icon: Gamepad2,      label: "Rhythm Quiz",   external: true },
    { href: "/note_naming.html",     icon: Gamepad2,      label: "Note Naming",   external: true },
    { href: "/sight-reading.html",   icon: Gamepad2,      label: "Sight Reading", external: true },
    { href: "/piano-theory.html",    icon: Gamepad2,      label: "Piano Theory",  external: true },
  ];

  const studentGameIcons = [
    { href: "/piano_hero.html#room",img: "/game-icons/piano_room.png",    label: "Piano Room",    shadow: "0 0 14px 4px rgba(139,92,246,0.55)" },
    { href: "/piano_hero.html",     img: "/game-icons/piano_hero.png",    label: "Piano Hero",    shadow: "0 0 14px 4px rgba(14,165,233,0.55)" },
    { href: "/sight-reading.html",  img: "/game-icons/sight_reading.png", label: "Sight Reading", shadow: "0 0 14px 4px rgba(139,92,246,0.55)" },
    { href: "/note_naming.html",    img: "/game-icons/note_naming.png",   label: "Note Naming",   shadow: "0 0 14px 4px rgba(244,63,94,0.55)"  },
    { href: "/piano-theory.html",   img: "/game-icons/piano_theory.png",  label: "Piano Theory",  shadow: "0 0 14px 4px rgba(202,138,4,0.55)"  },
    { href: "/rhythm-quiz.html",    img: "/game-icons/rhythm_quiz.png",   label: "Rhythm Quiz",   shadow: "0 0 14px 4px rgba(20,184,166,0.55)" },
  ];

  const getNavItems = () => {
    const baseItems = [
      { href: "/dashboard", icon: Home, label: "Dashboard" },
    ];

    if (role === "admin") {
      return [
        ...baseItems,
        { href: "/dashboard/users",      icon: Users,         label: "Manage Users" },
        { href: "/dashboard/courses",    icon: BookOpen,      label: "Course Content" },
        { href: "/dashboard/lessons",    icon: Calendar,      label: "All Lessons" },
        { href: "/dashboard/slots",      icon: ClipboardList, label: "Time Slots" },
        { href: "/dashboard/foundation", icon: Gamepad2,      label: "Foundation Modules" },
        { href: "/dashboard/piano-hero", icon: KeyboardMusic, label: "Piano Hero Songs" },
        { href: "/dashboard/districts",  icon: Settings,      label: "Districts" },
        ...gameItems,
      ];
    }

    if (role === "teacher") {
      return [
        ...baseItems,
        { href: "/dashboard/my-students",  icon: Users,         label: "My Students" },
        { href: "/dashboard/lesson-plans", icon: BookOpen,      label: "Lesson Plans" },
        { href: "/dashboard/schedule",     icon: Calendar,      label: "Schedule" },
        { href: "/dashboard/slots",        icon: ClipboardList, label: "My Slots" },
        { href: "/dashboard/foundation",   icon: Gamepad2,      label: "Foundation Modules" },
        ...gameItems,
      ];
    }

    return [
      ...baseItems,
      { href: "/dashboard/foundation", icon: Gamepad2, label: "Foundation Fundamentals" },
      { href: "/dashboard/resources",  icon: BookOpen, label: "AI Music Teacher" },
      // Games are launched from the dashboard circle buttons, not the sidebar
    ];
  };

  const navItems = getNavItems();

  const NavLink = ({ item, onClick }: { item: typeof navItems[0]; onClick?: () => void }) =>
    (item as any).external ? (
      <a
        href={item.href}
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      >
        <item.icon className="w-5 h-5 shrink-0" />
        <span className="truncate">{item.label}</span>
      </a>
    ) : (
      <Link
        to={item.href}
        onClick={onClick}
        className="flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
      >
        <item.icon className="w-5 h-5 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );

  return (
    <div className="h-screen bg-background flex overflow-hidden">

      {/* ── Desktop sidebar ─────────────────────────────────── */}
      <aside className="hidden md:flex h-screen w-64 shrink-0 bg-card border-r border-border flex-col">
        <div className="p-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2">
            <Music className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold">Musicable</span>
          </Link>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <NavLink item={item} />
              </li>
            ))}
          </ul>

          {role === "student" && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-widest px-1 mb-3">Play a Game</p>
              <div className="grid grid-cols-2 gap-3 px-1">
                {studentGameIcons.map(({ href, img, label, shadow }) => (
                  <a key={label} href={href} title={label} className="group flex flex-col items-center gap-1">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full animate-pulse" style={{ boxShadow: shadow, opacity: 0.6 }} />
                      <div className="relative w-14 h-14 rounded-full overflow-hidden transition-transform duration-200 group-hover:scale-110" style={{ boxShadow: shadow }}>
                        <img src={img} alt={label} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight truncate w-full text-center">{label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-border shrink-0">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* ── Mobile drawer overlay ────────────────────────────── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer panel ──────────────────────────────── */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-card border-r border-border flex flex-col
          transform transition-transform duration-300 ease-in-out md:hidden
          ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-2">
            <Music className="w-7 h-7 text-primary" />
            <span className="text-lg font-bold">Musicable</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => (
              <li key={item.href}>
                <NavLink item={item} onClick={() => setMobileOpen(false)} />
              </li>
            ))}
          </ul>

          {role === "student" && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-widest px-1 mb-3">Play a Game</p>
              <div className="grid grid-cols-2 gap-3 px-1">
                {studentGameIcons.map(({ href, img, label, shadow }) => (
                  <a key={label} href={href} title={label} onClick={() => setMobileOpen(false)} className="group flex flex-col items-center gap-1">
                    <div className="relative">
                      <div className="absolute inset-0 rounded-full animate-pulse" style={{ boxShadow: shadow, opacity: 0.6 }} />
                      <div className="relative w-14 h-14 rounded-full overflow-hidden transition-transform duration-200 group-hover:scale-110" style={{ boxShadow: shadow }}>
                        <img src={img} alt={label} className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight truncate w-full text-center">{label}</span>
                  </a>
                ))}
              </div>
            </div>
          )}
        </nav>

        {/* Drawer footer */}
        <div className="p-4 border-t border-border shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 mb-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">
                {user?.email?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.email}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
            onClick={handleSignOut}
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        <header className="bg-card border-b border-border px-4 py-3 md:px-8 md:py-5 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            {/* Hamburger — mobile only */}
            <button
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="text-base md:text-2xl font-bold truncate">{title}</h1>
          </div>
        </header>

        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
