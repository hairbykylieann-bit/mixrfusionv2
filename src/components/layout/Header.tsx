import { Link, useLocation } from "react-router-dom";
import { ChevronLeft, Sparkles, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useMiraContext } from "@/contexts/MiraContext";
import { useKioskSafe } from "@/contexts/KioskContext";
import { useSalonSettings } from "@/hooks/useSalonSettings";
import { useScrollY } from "@/hooks/useParallax";

export function Header() {
  const location = useLocation();
  const isHome = location.pathname === "/";
  const { user, signOut } = useAuth();
  const { openMira } = useMiraContext();
  const kioskContext = useKioskSafe();
  const { settings } = useSalonSettings();
  const scrollY = useScrollY();
  const tightened = scrollY > 40;

  const isKioskMode = kioskContext?.isKioskMode ?? false;
  const isLocked = kioskContext?.isLocked ?? true;
  const activeStaff = kioskContext?.activeStaff ?? null;
  const logout = kioskContext?.logout;

  const salonName = settings?.salon_name || "MixR Fusion";
  const salonLogo = settings?.salon_logo_url;

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out successfully");
  };

  const handleLogout = () => {
    logout?.();
    toast.info("Session ended");
  };

  // Get initials for active staff
  const staffInitials = activeStaff?.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <motion.header
      className={`sticky top-0 z-50 w-full glass transition-[height,border-color] duration-300 ${
        tightened ? "border-b border-foreground/15" : "border-b border-border"
      }`}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{ borderRadius: 0 }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className={`flex items-center justify-between transition-[height] duration-300 ${tightened ? "h-14" : "h-16"}`}>
          <div className="flex items-center gap-3">
            {!isHome && (
              <Link to="/">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ChevronLeft className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <Link to="/" className="flex items-center gap-3">
              {salonLogo ? (
                <div className="w-9 h-9 overflow-hidden" style={{ borderRadius: "var(--radius)" }}>
                  <img src={salonLogo} alt={salonName} className="w-full h-full object-contain" />
                </div>
              ) : (
                <div
                  className="w-9 h-9 bg-foreground flex items-center justify-center"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <span className="text-background font-display text-sm">M</span>
                </div>
              )}
              <span className="font-display text-base sm:text-lg uppercase tracking-tight text-foreground">
                {salonName}
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            {/* Kiosk Mode Indicator */}
            {isKioskMode && !isLocked && activeStaff && (
              <div className="flex items-center gap-2 mr-2 px-3 py-1.5 bg-card border border-border rounded-full">
                <div className="w-6 h-6 rounded-full bg-foreground/10 flex items-center justify-center">
                  <span className="text-[10px] font-semibold text-foreground">
                    {staffInitials}
                  </span>
                </div>
                <span className="text-xs font-semibold text-foreground hidden sm:inline uppercase tracking-wider">
                  {activeStaff.name.split(" ")[0]}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 gap-1 text-muted-foreground hover:text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">End Session</span>
                </Button>
              </div>
            )}

            {/* Glass control cluster — bell / Mira / profile */}
            <div className="flex items-center gap-1.5 glass rounded-full p-1">
              <div className="px-1">
                <NotificationBell />
              </div>

              <button
                onClick={() => openMira()}
                className="group flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-foreground text-background hover:bg-foreground/85 transition-all"
              >
                <Sparkles className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                <span className="hidden sm:inline text-xs font-semibold uppercase tracking-[0.18em]">
                  Ask Mira
                </span>
              </button>

              {/* Only show user dropdown when NOT in kiosk mode */}
              {user && !isKioskMode && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-foreground/10 transition-colors">
                      <User className="h-4 w-4" />
                    </button>
                  </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{user.email}</p>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-[0.18em] font-semibold">
                      Salon Owner
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
