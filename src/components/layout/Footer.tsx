import Link from "next/link";
import { Zap, Code2, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { FOOTER_LINKS, HACKATHON_SOURCES } from "@/constants/navigation";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative border-t border-white/8 bg-neutral-950">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

      <Container>
        {/* Main footer content */}
        <div className="py-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4 w-fit group">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600 shadow-lg shadow-violet-900/50 group-hover:bg-violet-500 transition-colors">
                <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">
                Hack<span className="text-violet-400">Radar</span>
              </span>
            </Link>
            <p className="text-sm text-neutral-500 leading-relaxed max-w-xs mb-6">
              The unified hackathon discovery platform for students and
              developers. Find your next breakthrough moment.
            </p>

            {/* Sources */}
            <div className="mb-6">
              <p className="text-xs text-neutral-600 uppercase tracking-widest font-semibold mb-2">
                Aggregating from
              </p>
              <div className="flex flex-wrap gap-2">
                {HACKATHON_SOURCES.map((source) => (
                  <span
                    key={source.id}
                    className="px-2 py-0.5 rounded-full bg-white/5 border border-white/8 text-xs text-neutral-500"
                  >
                    {source.label}
                  </span>
                ))}
              </div>
            </div>

            {/* Social links */}
            <div className="flex items-center gap-3">
              <a
                href="https://x.com/hackradar"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/5 border border-white/8 text-neutral-500 hover:text-white hover:border-white/20 transition-all"
                aria-label="Twitter"
              >
                <X className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/hackradar"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-white/5 border border-white/8 text-neutral-500 hover:text-white hover:border-white/20 transition-all"
                aria-label="GitHub"
              >
                <Code2 className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-widest mb-4">
                {category}
              </h3>
              <ul className="space-y-2.5">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="py-6 border-t border-white/6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-neutral-600">
            © {currentYear} HackRadar. All rights reserved.
          </p>
          <p className="text-sm text-neutral-700">
            Built for the builder community 🛠️
          </p>
        </div>
      </Container>
    </footer>
  );
}
