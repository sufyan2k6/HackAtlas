import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { GradientText } from "@/components/ui/GradientText";

export function CTA() {
  return (
    <section className="relative py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-violet-600/15 rounded-full blur-[80px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-transparent to-neutral-950" />
      </div>

      <Container size="lg">
        <div className="relative z-10 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/40 via-neutral-950/60 to-neutral-950/40 backdrop-blur-sm p-12 md:p-16 text-center overflow-hidden">
          {/* Inner decorative lines */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white tracking-tight mb-6">
            Ready to find your next <br className="hidden sm:block" />
            <GradientText variant="violet">breakthrough?</GradientText>
          </h2>

          <p className="text-neutral-400 text-lg max-w-lg mx-auto mb-10 leading-relaxed">
            Join 120K+ developers already using HackRadar to discover
            opportunities, build in public, and win prizes.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/discover">
              <Button
                size="lg"
                variant="primary"
                className="w-full sm:w-auto shadow-xl shadow-violet-900/40"
              >
                Start Exploring Free
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/submit">
              <Button size="lg" variant="secondary" className="w-full sm:w-auto">
                Submit a Hackathon
              </Button>
            </Link>
          </div>

          <p className="mt-6 text-xs text-neutral-600">
            Free forever · No credit card required · Cancel anytime
          </p>
        </div>
      </Container>
    </section>
  );
}
