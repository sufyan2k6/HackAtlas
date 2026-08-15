import type { Metadata } from "next";
import { db } from "@/lib/db";
import { Container } from "@/components/ui/Container";
import { GradientText } from "@/components/ui/GradientText";
import { Badge } from "@/components/ui/Badge";
import { HackathonCard } from "@/components/sections/HackathonCard";
import { EmptyState } from "@/components/discover/EmptyState";
import { Layers } from "lucide-react";

export const metadata: Metadata = {
  title: "Discover Hackathons",
  description:
    "Browse every hackathon in one place. Filter by mode, status, prize pool, and more — from Devpost, Devfolio, MLH, Unstop, and beyond.",
};

// Revalidate every 5 minutes so fresh data is shown without a full redeploy
export const revalidate = 300;

// Map Prisma's HackathonMode enum → HackathonCard's mode union
function mapMode(
  mode: "online" | "in_person" | "hybrid"
): "online" | "in-person" | "hybrid" {
  if (mode === "in_person") return "in-person";
  return mode;
}

export default async function DiscoverPage() {
  // Fetch all non-rejected hackathons, sorted by start date
  const hackathons = await db.hackathon.findMany({
    where: {
      submissionStatus: "approved",
    },
    orderBy: [
      { featured: "desc" },
      { status: "asc" },
      { startDate: "asc" },
    ],
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

  const total = hackathons.length;

  return (
    <div className="min-h-screen bg-[#08080a]">
      {/* Background ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[600px] h-[500px] bg-violet-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-0 w-[500px] h-[400px] bg-indigo-600/4 rounded-full blur-[100px]" />
      </div>

      <Container className="relative pt-28 pb-20">
        {/* ── Page header ── */}
        <div className="mb-10 animate-fade-in">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-semibold uppercase tracking-widest mb-6">
            <Layers className="w-3.5 h-3.5" />
            All Hackathons
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight mb-3">
                <GradientText variant="violet">Discover</GradientText> Hackathons
              </h1>
              <p className="text-neutral-400 text-base max-w-xl text-pretty">
                Every hackathon, one feed. Aggregated from Devpost, Devfolio,
                MLH, Unstop, and more — updated continuously.
              </p>
            </div>

            {/* Live count badge */}
            {total > 0 && (
              <div className="shrink-0">
                <Badge variant="purple" className="text-sm px-3 py-1">
                  {total.toLocaleString()}{" "}
                  {total === 1 ? "hackathon" : "hackathons"}
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* ── Divider ── */}
        <div className="h-px bg-gradient-to-r from-transparent via-white/8 to-transparent mb-10" />

        {/* ── Content ── */}
        {total === 0 ? (
          <EmptyState />
        ) : (
          <div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            {hackathons.map((h) => (
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
        )}
      </Container>
    </div>
  );
}
