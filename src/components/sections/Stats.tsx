import { Container } from "@/components/ui/Container";
import { GradientText } from "@/components/ui/GradientText";
import { STATS } from "@/constants/stats";

export function Stats() {
  return (
    <section className="relative py-24 overflow-hidden">
      {/* Full-width gradient banner */}
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-950 via-violet-950/20 to-neutral-950 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[200px] bg-violet-600/10 rounded-full blur-[80px] pointer-events-none" />

      <Container>
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-4">
            The numbers speak{" "}
            <GradientText variant="violet">for themselves</GradientText>
          </h2>
          <p className="text-neutral-400 text-lg max-w-md mx-auto">
            Growing daily alongside the global hacker community.
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {STATS.map((stat, idx) => (
            <div
              key={stat.id}
              className="relative group flex flex-col items-center text-center p-8 rounded-2xl border border-white/8 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition-all duration-300"
            >
              {/* Top accent line */}
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                style={{ width: "80%" }}
              />

              {/* Value */}
              <div className="text-4xl sm:text-5xl font-black tracking-tight mb-2 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                {stat.value}
              </div>

              {/* Label */}
              <div className="text-sm font-semibold text-neutral-300 mb-1.5">
                {stat.label}
              </div>

              {/* Description */}
              <div className="text-xs text-neutral-600 leading-relaxed">
                {stat.description}
              </div>

              {/* Index marker */}
              <div className="absolute bottom-3 right-4 text-xs text-white/5 font-black select-none">
                {String(idx + 1).padStart(2, "0")}
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
