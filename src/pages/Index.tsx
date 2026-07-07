import { motion } from "framer-motion";
import {
  PlusCircle,
  Users,
  BarChart3,
  Package,
  UserCog,
  Settings,
  ArrowUpRight,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { SetupWizard } from "@/components/home/SetupWizard";
import { useSetupProgress } from "@/hooks/useSetupProgress";
import { useEffectiveStaff } from "@/hooks/useEffectiveStaff";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/motion/Reveal";
import { useParallax } from "@/hooks/useParallax";

type NavItem = {
  to: string;
  icon: typeof PlusCircle;
  label: string;
  description: string;
};

const Index = () => {
  const { isSetupComplete, allStepsComplete, isLoading } = useSetupProgress();
  const { effectiveStaff } = useEffectiveStaff();
  const showWizard = !isLoading && !isSetupComplete && !allStepsComplete;

  // Parallax layers — gentle, magazine-spread depth
  const bleedASlow = useParallax(0.12, 120);
  const bleedBSlow = useParallax(-0.08, 100);
  const eyebrowDrift = useParallax(0.18, 14);
  const headlineLift = useParallax(-0.12, 36);

  const getVisibleNavItems = (): NavItem[] => {
    const all: NavItem[] = [
      { to: "/new-bowl", icon: PlusCircle, label: "New Color Bowl", description: "Log a new formula mix for an active appointment" },
      { to: "/clients", icon: Users, label: "Clients", description: "Formula history & profiles" },
      { to: "/reports", icon: BarChart3, label: "Reports", description: "Dashboard & insights" },
      { to: "/inventory", icon: Package, label: "Inventory", description: "Stock management" },
      { to: "/staff", icon: UserCog, label: "Staff", description: "Team management" },
      { to: "/settings", icon: Settings, label: "Settings", description: "Preferences" },
    ];

    if (!effectiveStaff) return all;

    const p = effectiveStaff.permissions;
    return all.filter((item) => {
      switch (item.to) {
        case "/new-bowl": return p.can_create_bowls;
        case "/clients": return p.can_view_basic_client_info;
        case "/reports": return p.can_view_reports;
        case "/inventory": return p.can_manage_products;
        case "/staff": return p.can_manage_staff;
        case "/settings": return p.can_manage_settings;
        default: return false;
      }
    });
  };

  const visibleNavItems = getVisibleNavItems();
  const [hero, ...rest] = visibleNavItems;

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      {/* Atmosphere layer — fixed behind everything */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="grain-overlay" />
        <div
          className="ink-bleed"
          style={{
            width: 560,
            height: 560,
            top: "-10%",
            left: "-8%",
            transform: bleedASlow,
          }}
        />
        <div
          className="ink-bleed"
          style={{
            width: 720,
            height: 720,
            top: "30%",
            right: "-15%",
            transform: bleedBSlow,
          }}
        />
      </div>

      <div className="relative z-10">
        <Header />

        <main className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 md:py-14">

          {showWizard && (
            <div className="mb-10">
              <SetupWizard />
            </div>
          )}

          <div className="mb-10 md:mb-14">
            <motion.p
              className="eyebrow mb-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              style={{ transform: eyebrowDrift }}
            >
              {"\n"}
            </motion.p>
            <motion.h1
              className="font-display text-5xl md:text-7xl text-foreground leading-[0.9] tracking-tight uppercase"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              style={{ transform: headlineLift }}
            >
              Welcome<br className="md:hidden" /> back
            </motion.h1>
            <motion.p
              className="mt-4 text-sm md:text-base text-muted-foreground uppercase tracking-[0.22em] font-semibold"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              What would you like to do today?
            </motion.p>
          </div>

          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4 md:auto-rows-[200px]">
            {/* Hero tile */}
            {hero && (
              <Reveal duration={0.75} y={24} className="md:col-span-2 md:row-span-2">
                <Link
                  to={hero.to}
                  className="group relative block h-full bg-primary text-primary-foreground p-8 md:p-10 flex flex-col justify-between overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-20px_hsl(0_0%_5%/0.55)]"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  {/* Live grain on the deep-ink surface */}
                  <span className="grain-overlay" aria-hidden />
                  {/* Soft spotlight on hover */}
                  <span
                    className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 20%, hsl(40 23% 95% / 0.08), transparent 60%)",
                    }}
                    aria-hidden
                  />
                  <div className="relative flex justify-between items-start">
                    <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-primary-foreground/20 flex items-center justify-center transition-transform duration-500 group-hover:rotate-90 group-hover:border-primary-foreground/50">
                      <hero.icon className="w-7 h-7 md:w-8 md:h-8" />
                    </div>
                    <span className="px-3 py-1 border border-primary-foreground/20 rounded-full text-[10px] uppercase tracking-[0.22em] font-semibold">
                      Primary
                    </span>
                  </div>
                  <div className="relative">
                    <h2 className="font-display text-3xl md:text-4xl mb-2 uppercase tracking-tight leading-none">
                      {hero.label}
                    </h2>
                    <p className="text-primary-foreground/60 text-base md:text-lg">
                      {hero.description}
                    </p>
                  </div>
                </Link>
              </Reveal>
            )}

            {/* Remaining tiles */}
            {rest.map((item, i) => (
              <Reveal key={item.to} delay={0.08 + i * 0.06}>
                <Link
                  to={item.to}
                  className="group block h-full bg-card text-card-foreground p-7 md:p-8 flex flex-col justify-between border border-border transition-all duration-300 hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-[0_10px_30px_-18px_hsl(0_0%_5%/0.4)]"
                  style={{ borderRadius: "var(--radius)" }}
                >
                  <div className="flex items-start justify-between">
                    <div
                      className="w-10 h-10 border border-current/15 flex items-center justify-center transition-colors group-hover:border-current/40"
                      style={{ borderRadius: "var(--radius)" }}
                    >
                      <item.icon className="w-5 h-5" />
                    </div>
                    <ArrowUpRight className="w-4 h-4 opacity-30 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all duration-300" />
                  </div>
                  <div>
                    <h3 className="font-display text-lg md:text-xl mb-1 uppercase tracking-tight">
                      {item.label}
                    </h3>
                    <p className="text-xs opacity-60 uppercase tracking-[0.18em] font-semibold">
                      {item.description}
                    </p>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>

          <Reveal delay={0.2}>
            <div className="mt-12 md:mt-16 pt-6 border-t border-border text-center">
              <p className="text-xs text-muted-foreground uppercase tracking-[0.22em] font-semibold">
                Need help? Just ask{" "}
                <span className="story-link font-bold text-foreground">Mira</span>{" "}
                — your salon assistant.
              </p>
            </div>
          </Reveal>
        </main>
      </div>
    </div>
  );
};

export default Index;
