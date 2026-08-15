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

