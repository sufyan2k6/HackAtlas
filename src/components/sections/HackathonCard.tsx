import { MapPin, Clock, Users, Trophy } from "lucide-react";
import { Card, CardFooter } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDateRange, formatPrize, daysUntil } from "@/lib/utils";
import type { BadgeVariant } from "@/components/ui/Badge";

interface HackathonCardData {
  id: string;
  title: string;
  organizer: string;
  source: string;
  mode: "online" | "in-person" | "hybrid";
  status: "upcoming" | "live" | "ended";
  prizePool?: number;
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  tags?: string[];
  featured?: boolean;
  participantCount?: number;
  location?: string;
}

interface HackathonCardProps {
  hackathon: HackathonCardData;
}

const modeConfig: Record<
  string,
  { label: string; variant: BadgeVariant }
> = {
  online: { label: "Online", variant: "info" },
  "in-person": { label: "In-Person", variant: "success" },
  hybrid: { label: "Hybrid", variant: "purple" },
};

const statusConfig: Record<
  string,
  { label: string; variant: BadgeVariant; dot: boolean }
> = {
  upcoming: { label: "Upcoming", variant: "warning", dot: false },
  live: { label: "Live Now", variant: "danger", dot: true },
  ended: { label: "Ended", variant: "default", dot: false },
};

export function HackathonCard({ hackathon }: HackathonCardProps) {
  const modeInfo = modeConfig[hackathon.mode] ?? modeConfig.online;
  const statusInfo = statusConfig[hackathon.status] ?? statusConfig.upcoming;
  const daysLeft = hackathon.registrationDeadline
    ? daysUntil(hackathon.registrationDeadline)
    : null;

  return (
    <Card hover glow padding="none" className="flex flex-col overflow-hidden">
      {/* Card header bar */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/6">
        <div className="flex items-center gap-2">
          <Badge variant={statusInfo.variant} dot={statusInfo.dot}>
            {statusInfo.label}
          </Badge>
          <Badge variant={modeInfo.variant}>{modeInfo.label}</Badge>
        </div>
        <span className="text-xs text-neutral-600 font-medium">
          via {hackathon.source}
        </span>
      </div>

      {/* Card body */}
      <div className="px-5 py-5 flex-1">
        {hackathon.featured && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium mb-3">
            <Trophy className="w-3.5 h-3.5" />
            Featured
          </div>
        )}

        <h3 className="text-white font-semibold text-base leading-snug mb-1.5 line-clamp-2">
          {hackathon.title}
        </h3>
        <p className="text-sm text-neutral-500 mb-4">by {hackathon.organizer}</p>

        {/* Meta info */}
        <div className="space-y-2.5 mb-4">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Clock className="w-3.5 h-3.5 shrink-0 text-neutral-600" />
            {formatDateRange(hackathon.startDate, hackathon.endDate)}
          </div>
          {hackathon.location && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <MapPin className="w-3.5 h-3.5 shrink-0 text-neutral-600" />
              {hackathon.location}
            </div>
          )}
          {hackathon.participantCount && (
            <div className="flex items-center gap-2 text-xs text-neutral-500">
              <Users className="w-3.5 h-3.5 shrink-0 text-neutral-600" />
              {hackathon.participantCount.toLocaleString()} participants
            </div>
          )}
        </div>

        {/* Tags */}
        {hackathon.tags && hackathon.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {hackathon.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <CardFooter className="px-5 flex items-center justify-between">
        <div>
          {hackathon.prizePool ? (
            <div>
              <div className="text-xs text-neutral-600 mb-0.5">Prize Pool</div>
              <div className="text-base font-bold text-violet-400">
                {formatPrize(hackathon.prizePool)}
              </div>
            </div>
          ) : null}
          {daysLeft !== null && daysLeft > 0 && (
            <div className="text-xs text-amber-500/80 mt-1">
              Registration closes in {daysLeft}d
            </div>
          )}
          {daysLeft !== null && daysLeft <= 0 && (
            <div className="text-xs text-neutral-600 mt-1">
              Registration closed
            </div>
          )}
        </div>
        <Button size="sm" variant="outline">
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}
