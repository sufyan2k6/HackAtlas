export interface Stat {
  id: string;
  value: string;
  label: string;
  description: string;
}

export const STATS: Stat[] = [
  {
    id: "hackathons",
    value: "4,200+",
    label: "Hackathons Indexed",
    description: "Active and upcoming events tracked across all major platforms",
  },
  {
    id: "developers",
    value: "120K+",
    label: "Developers",
    description: "Students and professionals discovering hackathons every month",
  },
  {
    id: "prizes",
    value: "$28M+",
    label: "Total Prize Pool",
    description: "Combined prize money across all tracked hackathons this year",
  },
  {
    id: "sources",
    value: "6",
    label: "Aggregation Sources",
    description: "Platforms aggregated: Devpost, Devfolio, MLH, Unstop, and more",
  },
];

export const SAMPLE_HACKATHONS = [
  {
    id: "1",
    title: "Global AI Hackathon 2025",
    organizer: "OpenAI Community",
    source: "Devpost",
    mode: "online" as const,
    status: "upcoming" as const,
    prizePool: 50000,
    startDate: "2025-09-15",
    endDate: "2025-09-17",
    registrationDeadline: "2025-09-10",
    tags: ["AI", "ML", "LLMs"],
    featured: true,
    participantCount: 3200,
  },
  {
    id: "2",
    title: "ETHGlobal Bangkok",
    organizer: "ETHGlobal",
    source: "Devfolio",
    mode: "in-person" as const,
    status: "upcoming" as const,
    prizePool: 120000,
    startDate: "2025-11-08",
    endDate: "2025-11-10",
    registrationDeadline: "2025-10-25",
    tags: ["Web3", "Blockchain", "Solidity"],
    featured: true,
    participantCount: 1800,
    location: "Bangkok, Thailand",
  },
  {
    id: "3",
    title: "HackMIT",
    organizer: "MIT",
    source: "MLH",
    mode: "in-person" as const,
    status: "upcoming" as const,
    prizePool: 30000,
    startDate: "2025-09-20",
    endDate: "2025-09-21",
    registrationDeadline: "2025-09-05",
    tags: ["Open Source", "Hardware", "Software"],
    featured: false,
    participantCount: 800,
    location: "Cambridge, MA",
  },
  {
    id: "4",
    title: "Climate Tech Hackathon",
    organizer: "Terra Labs",
    source: "Unstop",
    mode: "hybrid" as const,
    status: "live" as const,
    prizePool: 25000,
    startDate: "2025-08-01",
    endDate: "2025-08-03",
    registrationDeadline: "2025-07-28",
    tags: ["Climate", "Sustainability", "GreenTech"],
    featured: false,
    participantCount: 2100,
  },
];
