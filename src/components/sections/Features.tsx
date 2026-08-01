import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { GradientText } from "@/components/ui/GradientText";
import { FEATURES } from "@/constants/features";
import { Badge } from "@/components/ui/Badge";

export function Features() {
  return (
    <section className="relative py-28 overflow-hidden">
      {/* Background accent */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-violet-600/5 rounded-full blur-[100px]" />
      </div>

      <Container>
        {/* Section header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-widest mb-6">
            Everything you need
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-5">
            Built for the{" "}
            <GradientText variant="violet">hackathon community</GradientText>
          </h2>
          <p className="text-neutral-400 text-lg max-w-xl mx-auto leading-relaxed">
            From discovery to submission — HackRadar has every tool a hacker
            needs to find, track, and win.
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <Card
                key={feature.id}
                hover
                glow
                padding="lg"
                className="group relative"
              >
                {/* Subtle corner gradient */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-violet-600/8 to-transparent rounded-xl" />

                <div className="relative">
                  {/* Icon */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-violet-600/15 border border-violet-500/20 group-hover:bg-violet-600/25 transition-colors">
                      <Icon className="w-5 h-5 text-violet-400" />
                    </div>
                    {feature.badge && (
                      <Badge
                        variant={
                          feature.badge === "New"
                            ? "success"
                            : feature.badge === "Live"
                            ? "danger"
                            : "purple"
                        }
                        dot={feature.badge === "Live"}
                      >
                        {feature.badge}
                      </Badge>
                    )}
                  </div>

                  {/* Content */}
                  <h3 className="text-white font-semibold text-lg mb-2.5 tracking-tight">
                    {feature.title}
                  </h3>
                  <p className="text-neutral-500 text-sm leading-relaxed group-hover:text-neutral-400 transition-colors">
                    {feature.description}
                  </p>

                  {/* Feature number */}
                  <div className="absolute bottom-0 right-0 text-6xl font-black text-white/[0.03] select-none">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
