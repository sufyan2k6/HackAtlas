import Link from "next/link";
import { Search, Zap } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-32 px-4 text-center animate-fade-in">
      {/* Glowing icon */}
      <div className="relative mb-8">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-violet-600/20 blur-2xl scale-150" />
        <div className="relative flex items-center justify-center w-24 h-24 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-600/10 to-transparent" />
          <Search className="w-10 h-10 text-violet-400 relative z-10" strokeWidth={1.5} />
        </div>
      </div>

      {/* Heading */}
      <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 tracking-tight">
        No hackathons yet
      </h2>

      {/* Subtext */}
      <p className="text-neutral-400 text-base max-w-sm mb-2 text-pretty">
        The database is empty right now. Hackathons will appear here once
        they&apos;re imported from Devpost, Devfolio, MLH, and more.
      </p>
      <p className="text-neutral-600 text-sm mb-10">
        Check back soon — the feed is being set up.
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <Link href="/">
          <Button variant="primary" size="md" className="gap-2">
            <Zap className="w-4 h-4" />
            Back to Home
          </Button>
        </Link>
        <Link href="/api/health">
          <Button variant="ghost" size="md">
            Check system status
          </Button>
        </Link>
      </div>

      {/* Decorative dots grid */}
      <div className="mt-16 grid grid-cols-8 gap-3 opacity-[0.06]">
        {Array.from({ length: 32 }).map((_, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400" />
        ))}
      </div>
    </div>
  );
}
