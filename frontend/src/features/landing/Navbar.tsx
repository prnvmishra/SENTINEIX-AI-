import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/Button";
import { cn } from "@/utils/cn";
import { navLinks } from "@/mock/landingContent";
import { ROUTES } from "@/app/routes";

export function Navbar() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 12);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function scrollToSection(id: string) {
    setMobileOpen(false);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-all duration-300",
        scrolled ? "border-b border-border bg-bg/85 backdrop-blur-lg" : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to={ROUTES.landing}>
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navLinks.map((link) => (
            <button
              key={link.id}
              type="button"
              onClick={() => scrollToSection(link.id)}
              className="rounded-md px-3 py-2 text-sm text-text-secondary transition hover:text-primary"
            >
              {link.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Button variant="ghost" size="sm" onClick={() => navigate(ROUTES.login)}>
            Sign in
          </Button>
          <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.login)}>
            Access Console
          </Button>
        </div>

        <button
          type="button"
          className="rounded-md p-2 text-text-secondary lg:hidden"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border bg-bg/95 backdrop-blur-lg lg:hidden"
          >
            <div className="flex flex-col gap-1 px-6 py-4">
              {navLinks.map((link) => (
                <button
                  key={link.id}
                  type="button"
                  onClick={() => scrollToSection(link.id)}
                  className="rounded-md px-3 py-2 text-left text-sm text-text-secondary transition hover:bg-surface-raised hover:text-primary"
                >
                  {link.label}
                </button>
              ))}
              <div className="mt-2 flex flex-col gap-2">
                <Button variant="secondary" size="sm" onClick={() => navigate(ROUTES.login)}>
                  Sign in
                </Button>
                <Button variant="primary" size="sm" onClick={() => navigate(ROUTES.login)}>
                  Access Console
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
