import { ReactNode, useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
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
  MessageSquare,
} from "lucide-react";

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  role: "admin" | "teacher" | "student";
  headerActions?: ReactNode;
}

const DashboardLayout = ({ children, title, role, headerActions }: DashboardLayoutProps) => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useTranslation();

  const [teacherNote, setTeacherNote] = useState<{ note_text: string; teacher_name: string; updated_at: string } | null>(null);
  const [noteExpanded, setNoteExpanded] = useState(false);

  useEffect(() => {
    if (role !== "student" || !user) return;
    const fetch = async () => {
      const { data } = await (supabase as any)
        .from("teacher_notes")
        .select("note_text, teacher_id, updated_at")
        .eq("student_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data?.note_text?.trim()) {
        setTeacherNote({ note_text: data.note_text, teacher_name: "Your Teacher", updated_at: data.updated_at });
      }
    };
    fetch();
  }, [role, user]);

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
    { href: "/note-quiz.html",       icon: Gamepad2,      label: "Note Quiz",     external: true },
  ];

  const studentGameIcons = [
    { href: "/piano_hero.html#room",img: "/game-icons/piano_room.png",    labelKey: "dashboard.nav.pianoRoom",    shadow: "0 0 14px 4px rgba(139,92,246,0.55)" },
    { href: "/piano_hero.html",     img: "/game-icons/piano_hero.png",    labelKey: "dashboard.nav.pianoHero",    shadow: "0 0 14px 4px rgba(14,165,233,0.55)" },
    { href: "/sight-reading.html",  img: "/game-icons/sight_reading.png", labelKey: "dashboard.nav.sightReading", shadow: "0 0 14px 4px rgba(139,92,246,0.55)" },
    { href: "/note_naming.html",    img: "/game-icons/note_naming.png",   labelKey: "dashboard.nav.noteNaming",   shadow: "0 0 14px 4px rgba(244,63,94,0.55)"  },
    { href: "/piano-theory.html",   img: "/game-icons/piano_theory.png",  labelKey: "dashboard.nav.pianoTheory",  shadow: "0 0 14px 4px rgba(202,138,4,0.55)"  },
    { href: "/rhythm-quiz.html",    img: "/game-icons/rhythm_quiz.png",   labelKey: "dashboard.nav.rhythmQuiz",   shadow: "0 0 14px 4px rgba(20,184,166,0.55)" },
  ];

  const getNavItems = () => {
    const baseItems = [
      { href: "/dashboard", icon: Home, label: t("dashboard.nav.dashboard") },
    ];

    if (role === "admin") {
      return [
        ...baseItems,
        { href: "/dashboard/users",      icon: Users,         label: t("dashboard.nav.manageUsers") },
        { href: "/dashboard/courses",    icon: BookOpen,      label: t("dashboard.nav.courseContent") },
        { href: "/dashboard/lessons",    icon: Calendar,      label: t("dashboard.nav.allLessons") },
        { href: "/dashboard/slots",      icon: ClipboardList, label: t("dashboard.nav.timeSlots") },
        { href: "/dashboard/foundation", icon: Gamepad2,      label: t("dashboard.nav.foundationModules") },
        { href: "/dashboard/piano-hero", icon: KeyboardMusic, label: t("dashboard.nav.pianoHeroSongs") },
        { href: "/dashboard/districts",  icon: Settings,      label: "Assignments" },
        { href: "/dashboard/affiliates", icon: Users,         label: "Affiliates" },
        ...gameItems,
      ];
    }

    if (role === "teacher") {
      return [
        ...baseItems,
        { href: "/dashboard/my-students",  icon: Users,         label: t("dashboard.nav.myStudents") },
        { href: "/dashboard/lesson-plans", icon: BookOpen,      label: t("dashboard.nav.lessonPlans") },
        { href: "/dashboard/schedule",     icon: Calendar,      label: t("dashboard.nav.schedule") },
        { href: "/dashboard/slots",        icon: ClipboardList, label: t("dashboard.nav.mySlots") },
        { href: "/dashboard/foundation",   icon: Gamepad2,      label: t("dashboard.nav.foundationModules") },
        ...gameItems,
      ];
    }

    return [
      ...baseItems,
      { href: "/dashboard/foundation", icon: Gamepad2, label: t("dashboard.nav.foundation") },
      { href: "/dashboard/resources",  icon: BookOpen, label: t("dashboard.nav.aiTeacher") },
    ];
  };

  const navItems = getNavItems();

  const NavLink = ({ item, onClick }: { item: typeof navItems[0]; onClick?: () => void }) => {
    const isActive = !(item as any).external && location.pathname === item.href;
    const baseClass = isActive
      ? "flex items-center gap-3 px-4 py-3 rounded-lg bg-primary text-primary-foreground font-semibold transition-colors shadow-[0_4px_20px_hsl(330_85%_55%/0.35)]"
      : "flex items-center gap-3 px-4 py-3 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors";

    return (item as any).external ? (
      <a href={item.href} onClick={onClick} className={baseClass}>
        <item.icon className="w-5 h-5 shrink-0" />
        <span className="truncate">{item.label}</span>
      </a>
    ) : (
      <Link to={item.href} onClick={onClick} className={baseClass}>
        <item.icon className="w-5 h-5 shrink-0" />
        <span className="truncate">{item.label}</span>
      </Link>
    );
  };

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
              <p className="text-xs text-muted-foreground uppercase tracking-widest px-1 mb-3">{t("dashboard.games")}</p>
              <div className="grid grid-cols-2 gap-y-5">
                {studentGameIcons.map(({ href, img, labelKey, shadow }) => (
                  <div key={labelKey} className="flex justify-center">
                    <a href={href} title={t(labelKey)} className="group flex flex-col items-center gap-1.5 w-[72px]">
                      <div className="relative w-[68px] h-[68px] shrink-0">
                        <div className="absolute inset-0 rounded-full animate-pulse" style={{ boxShadow: shadow, opacity: 0.6 }} />
                        <img
                          src={img}
                          alt={t(labelKey)}
                          className="relative w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
                          style={{ filter: `drop-shadow(0 0 6px ${shadow.match(/rgba\([^)]+\)/)?.[0] ?? "rgba(139,92,246,0.5)"})` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight w-full">{t(labelKey)}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>

        {role === "student" && teacherNote && (
          <div className="px-3 pb-3">
            <button
              onClick={() => setNoteExpanded(e => !e)}
              className="w-full rounded-xl p-3 text-left transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(255,45,120,0.12), rgba(168,85,247,0.12))",
                border: "1px solid rgba(255,45,120,0.3)",
                boxShadow: "0 0 16px rgba(255,45,120,0.15)",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color: "#FF2D78" }} />
                <span
                  className="text-xs font-black uppercase tracking-widest"
                  style={{ fontFamily: "'DM Mono',monospace", color: "#FF2D78" }}
                >
                  Teacher's Note
                </span>
                <span className="ml-auto text-xs text-muted-foreground">{noteExpanded ? "▲" : "▼"}</span>
              </div>
              {noteExpanded && (
                <>
                  <p className="text-xs text-gray-300 leading-relaxed mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,45,120,0.2)" }}>
                    {teacherNote.note_text}
                  </p>
                  {teacherNote.updated_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(teacherNote.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </>
              )}
              {!noteExpanded && (
                <p className="text-xs text-muted-foreground truncate">{teacherNote.note_text}</p>
              )}
            </button>
          </div>
        )}

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
            {t("dashboard.signOut")}
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
              <p className="text-xs text-muted-foreground uppercase tracking-widest px-1 mb-3">{t("dashboard.games")}</p>
              <div className="grid grid-cols-2 gap-y-5">
                {studentGameIcons.map(({ href, img, labelKey, shadow }) => (
                  <div key={labelKey} className="flex justify-center">
                    <a href={href} title={t(labelKey)} onClick={() => setMobileOpen(false)} className="group flex flex-col items-center gap-1.5 w-[68px]">
                      <div className="relative w-[64px] h-[64px] shrink-0">
                        <div className="absolute inset-0 rounded-full animate-pulse" style={{ boxShadow: shadow, opacity: 0.6 }} />
                        <img
                          src={img}
                          alt={t(labelKey)}
                          className="relative w-full h-full object-contain transition-transform duration-200 group-hover:scale-110"
                          style={{ filter: `drop-shadow(0 0 5px ${shadow.match(/rgba\([^)]+\)/)?.[0] ?? "rgba(139,92,246,0.5)"})` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground group-hover:text-foreground transition-colors text-center leading-tight w-full">{t(labelKey)}</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </nav>

        {role === "student" && teacherNote && (
          <div className="px-3 pb-3">
            <button
              onClick={() => setNoteExpanded(e => !e)}
              className="w-full rounded-xl p-3 text-left transition-all"
              style={{
                background: "linear-gradient(135deg, rgba(255,45,120,0.12), rgba(168,85,247,0.12))",
                border: "1px solid rgba(255,45,120,0.3)",
                boxShadow: "0 0 16px rgba(255,45,120,0.15)",
              }}
            >
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-3.5 h-3.5 shrink-0" style={{ color: "#FF2D78" }} />
                <span
                  className="text-xs font-black uppercase tracking-widest"
                  style={{ fontFamily: "'DM Mono',monospace", color: "#FF2D78" }}
                >
                  Teacher's Note
                </span>
                <span className="ml-auto text-xs text-muted-foreground">{noteExpanded ? "▲" : "▼"}</span>
              </div>
              {noteExpanded && (
                <>
                  <p className="text-xs text-gray-300 leading-relaxed mt-2 pt-2" style={{ borderTop: "1px solid rgba(255,45,120,0.2)" }}>
                    {teacherNote.note_text}
                  </p>
                  {teacherNote.updated_at && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(teacherNote.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </p>
                  )}
                </>
              )}
              {!noteExpanded && (
                <p className="text-xs text-muted-foreground truncate">{teacherNote.note_text}</p>
              )}
            </button>
          </div>
        )}

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
            {t("dashboard.signOut")}
          </Button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────── */}
      <main className="flex-1 min-w-0 h-screen overflow-y-auto">
        <header className="bg-card border-b border-border px-4 py-3 md:px-8 md:py-5 sticky top-0 z-30">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
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
            {headerActions && <div className="flex items-center gap-2 shrink-0">{headerActions}</div>}
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
