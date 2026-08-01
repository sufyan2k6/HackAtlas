export type HackathonMode = "in-person" | "online" | "hybrid";
export type HackathonStatus = "upcoming" | "live" | "ended";
export type HackathonTrack = string;

export interface HackathonOrganizer {
  name: string;
  logo?: string;
  url?: string;
}

export interface HackathonPrize {
  title: string;
  amount?: number;
  currency?: string;
  description?: string;
}

export interface Hackathon {
  id: string;
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  source: string; // devpost | devfolio | mlh | unstop | etc.
  sourceUrl: string;
  logoUrl?: string;
  bannerUrl?: string;
  organizer: HackathonOrganizer;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
  registrationDeadline?: string;
  mode: HackathonMode;
  location?: string;
  city?: string;
  country?: string;
  prizePool?: number;
  prizes?: HackathonPrize[];
  currency?: string;
  tracks?: HackathonTrack[];
  tags?: string[];
  teamSize?: { min: number; max: number };
  participantCount?: number;
  status: HackathonStatus;
  featured?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HackathonFilters {
  search?: string;
  mode?: HackathonMode | "all";
  status?: HackathonStatus | "all";
  track?: string;
  source?: string;
  minPrize?: number;
  maxPrize?: number;
  country?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedHackathons {
  data: Hackathon[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
