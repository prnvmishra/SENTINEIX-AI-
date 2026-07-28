import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { navLinks } from "@/mock/landingContent";
import { ROUTES } from "@/app/routes";

export function Footer() {
  return (
    <footer className="relative border-t border-border px-6 py-12">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row">
          <div className="flex flex-col gap-3">
            <Link to={ROUTES.landing} onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              <Logo />
            </Link>
            <p className="max-w-sm text-xs leading-relaxed text-text-secondary">
              A Digital Public Safety Intelligence Platform for Cyber Crime Cells, Banks, Telecom Operators and
              Government Agencies. Prototype build for hackathon evaluation.
            </p>
            <p className="text-xs font-medium text-text-primary">
              Built by <span className="text-primary">Pranav Mishra</span>
            </p>
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {navLinks.map((link) => (
              <a
                key={link.id}
                href={link.id === "top" ? "#" : `#${link.id}`}
                onClick={(e) => {
                  if (link.id === "top") {
                    e.preventDefault();
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="text-xs text-text-secondary transition hover:text-primary"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-border pt-6 text-[11px] text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            &copy; {new Date().getFullYear()} SentinelX AI · Built by Pranav Mishra · Demonstration purposes only.
          </p>
          <p>
            Demo stack: Firebase Auth/RTDB, Socket.IO live analysis, OpenRouter/Groq AI, and EmailJS contact delivery.
            Not a production government system.
          </p>
        </div>
      </div>
    </footer>
  );
}
