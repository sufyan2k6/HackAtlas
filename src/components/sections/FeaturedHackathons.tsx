import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { GradientText } from "@/components/ui/GradientText";
import { HackathonCard } from "@/components/sections/HackathonCard";

// Map Prisma's HackathonMode enum → HackathonCard's mode union
function mapMode(
  mode: "online" | "in_person" | "hybrid"
): "online" | "in-person" | "hybrid" {
  if (mode === "in_person") return "in-person";
  return mode;
}

export async function FeaturedHackathons() {
  // Query real active/upcoming hackathons from Neon PostgreSQL
  // Respects lifecycle policy: excludes ended and cancelled
  const featuredHackathons = await db.hackathon.findMany({
    where: {
      submissionStatus: "approved",
      status: { notIn: ["ended", "cancelled"] },
    },
    orderBy: [
      { featured: "desc" },
      { prizePool: "desc" },
      { startDate: "asc" },
    ],
    take: 4,
    select: {
      id: true,
      title: true,
      organizerName: true,
      source: true,
      mode: true,
      status: true,
      prizePool: true,
      currency: true,
      startDate: true,
      endDate: true,
      registrationDeadline: true,
      tags: true,
      featured: true,
      participantCount: true,
      location: true,
    },
  });

  if (featuredHackathons.length === 0) {
    return null;
  }

  return (
    <section className="relative py-24 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px]" />
      </div>

      <Container>
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-widest mb-5">
              Hand-picked
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-3">
              <GradientText variant="violet">Featured</GradientText> Hackathons
            </h2>
            <p className="text-neutral-400 text-base max-w-sm">
              High-impact opportunities happening right now and coming soon.
            </p>
          </div>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 transition-colors font-medium shrink-0 group"
          >
            View all hackathons
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>

        {/* Hackathon grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {featuredHackathons.map((h) => (
            <HackathonCard
              key={h.id}
              hackathon={{
                id: h.id,
                title: h.title,
                organizer: h.organizerName,
                source: h.source,
                mode: mapMode(h.mode),
                status: h.status,
                prizePool: h.prizePool ?? undefined,
                currency: h.currency ?? undefined,
                startDate: h.startDate.toISOString(),
                endDate: h.endDate.toISOString(),
                registrationDeadline:
                  h.registrationDeadline?.toISOString() ?? undefined,
                tags: h.tags,
                featured: h.featured,
                participantCount: h.participantCount ?? undefined,
                location: h.location ?? undefined,
              }}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
