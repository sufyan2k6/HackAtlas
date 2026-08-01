import { Zap, Globe, Bell, Filter, BookmarkCheck, Rss } from "lucide-react";

export interface Feature {
  id: string;
  icon: typeof Zap;
  title: string;
  description: string;
  badge?: string;
}

export const FEATURES: Feature[] = [
  {
    id: "aggregation",
    icon: Globe,
    title: "Multi-Source Aggregation",
    description:
      "We pull hackathons from Devpost, Devfolio, MLH, Unstop, HackerEarth, and more — so you never miss an opportunity across any platform.",
    badge: "6+ Sources",
  },
  {
    id: "smart-filters",
    icon: Filter,
    title: "Smart Filtering",
    description:
      "Filter by mode (online, in-person, hybrid), prize pool, tech track, team size, location, and registration deadline — all in real-time.",
  },
  {
    id: "alerts",
    icon: Bell,
    title: "Deadline Alerts",
    description:
      "Get notified before registration closes. Set custom reminders per hackathon and never let a deadline slip through the cracks.",
    badge: "New",
  },
  {
    id: "bookmarks",
    icon: BookmarkCheck,
    title: "Personal Tracker",
    description:
      "Bookmark events, track your applications, log your wins, and build a portfolio of your hackathon journey — all in one dashboard.",
  },
  {
    id: "feed",
    icon: Rss,
    title: "Live Feed",
    description:
      "Real-time updates as new hackathons are announced. Our aggregation engine refreshes every hour so you always see the latest events.",
    badge: "Live",
  },
  {
    id: "lightning-fast",
    icon: Zap,
    title: "Blazing Fast Search",
    description:
      "Full-text search across thousands of hackathons instantly. Find by name, organizer, track, technology stack, or prize category.",
  },
];
