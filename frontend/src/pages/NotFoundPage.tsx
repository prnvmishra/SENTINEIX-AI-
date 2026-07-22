import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ROUTES } from "@/app/routes";
import { fadeUp } from "@/theme/motion";

export function NotFoundPage() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-4 overflow-hidden bg-bg text-text-primary">
      <div className="grid-lines-bg absolute inset-0 opacity-20" />
      <motion.div
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        className="relative z-10 flex flex-col items-center gap-4"
      >
        <p className="font-mono text-sm tracking-widest text-primary">ERROR 404</p>
        <h1 className="text-2xl font-semibold">Signal not found</h1>
        <p className="text-sm text-text-secondary">The requested route does not exist in this intelligence grid.</p>
        <Link
          to={ROUTES.landing}
          className="mt-2 rounded-md border border-border-strong bg-surface px-4 py-2 text-sm text-primary transition hover:border-primary"
        >
          Return to base
        </Link>
      </motion.div>
    </main>
  );
}
