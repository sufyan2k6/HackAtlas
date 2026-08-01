import Link from "next/link";
import { ArrowRight, Search, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { GradientText } from "@/components/ui/GradientText";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center pt-16 overflow-hidden">
      {/* Background gradients */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Radial glow top-center */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-violet-600/10 rounded-full blur-[120px]" />
        {/* Bottom left accent */}
        <div className="absolute bottom-0 left-0 w-[500px] h-[400px] bg-indigo-600/8 rounded-full blur-[100px]" />
        {/* Top right accent */}
        <div className="absolute top-20 right-0 w-[400px] h-[300px] bg-purple-600/8 rounded-full blur-[100px]" />
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
            backgroundSize: "48px 48px",
          }}
        />
      </div>

      <Container>
        <div className="relative z-10 flex flex-col items-center text-center py-20">
          {/* Announcement badge */}
          <div className="mb-8 animate-fade-in">
            <Badge variant="purple" dot className="px-4 py-1.5 text-xs">
              <Sparkles className="w-3 h-3" />
              Now aggregating 4,200+ hackathons across 6 platforms
            </Badge>
          </div>

          {/* Heading */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-white leading-[1.05] mb-6 max-w-5xl">
            Discover Every{" "}
            <GradientText variant="violet">Hackathon.</GradientText>
            <br />
            Miss Nothing.
          </h1>

          {/* Subheading */}
          <p className="text-lg sm:text-xl text-neutral-400 max-w-2xl mb-10 leading-relaxed">
            HackAtlas aggregates hackathons from Devpost, Devfolio, MLH, Unstop
            and more — giving you one unified feed to find, filter, and track
            every opportunity that matters to you.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
            <Link href="/discover">
              <Button size="lg" variant="primary" className="w-full sm:w-auto shadow-xl shadow-violet-900/40">
                Explore Hackathons
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                How it works
              </Button>
            </Link>
          </div>

          {/* Search preview bar */}
          <div className="w-full max-w-2xl">
            <div className="relative group">
              <div className="absolute -inset-px rounded-xl bg-gradient-to-r from-violet-600/50 via-purple-600/30 to-indigo-600/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm" />
              <div className="relative flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-5 py-4 backdrop-blur-sm">
                <Search className="w-5 h-5 text-neutral-500 shrink-0" />
                <span className="text-neutral-500 text-sm flex-1 text-left">
                  Search{" "}
                  <span className="text-neutral-400">AI, Web3, Climate, Mobile...</span>
                </span>
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-600">
                  <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-xs">⌘</kbd>
                  <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded text-xs">K</kbd>
                </div>
              </div>
            </div>
            <p className="mt-3 text-xs text-neutral-600 text-center">
              No account needed · Updated hourly · 100% free
            </p>
          </div>

          {/* Source logos */}
          <div className="mt-16 flex flex-col items-center gap-4">
            <p className="text-xs text-neutral-600 uppercase tracking-widest font-semibold">
              Aggregating from
            </p>
            <div className="flex items-center gap-6 flex-wrap justify-center">
              {["Devpost", "Devfolio", "MLH", "Unstop", "HackerEarth", "Hackathon.io"].map(
                (source) => (
                  <span
                    key={source}
                    className="text-sm text-neutral-600 hover:text-neutral-400 transition-colors font-medium"
                  >
                    {source}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
