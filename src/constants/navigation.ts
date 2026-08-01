export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

export const NAV_LINKS: NavLink[] = [
  { label: "Discover", href: "/discover" },
  { label: "Calendar", href: "/calendar" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Blog", href: "/blog" },
];

export const FOOTER_LINKS: Record<string, NavLink[]> = {
  Product: [
    { label: "Discover Hackathons", href: "/discover" },
    { label: "Calendar View", href: "/calendar" },
    { label: "Leaderboard", href: "/leaderboard" },
    { label: "Submit a Hackathon", href: "/submit" },
    { label: "Changelog", href: "/changelog" },
  ],
  Resources: [
    { label: "Blog", href: "/blog" },
    { label: "Hackathon Guide", href: "/guide" },
    { label: "API Docs", href: "/docs/api" },
    { label: "Embed Widget", href: "/embed" },
  ],
  Company: [
    { label: "About", href: "/about" },
    { label: "Careers", href: "/careers" },
    { label: "Press Kit", href: "/press" },
    { label: "Contact", href: "/contact" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Cookie Policy", href: "/cookies" },
  ],
};

export const SOCIAL_LINKS = [
  { label: "Twitter / X", href: "https://x.com/hackatlas", external: true },
  { label: "GitHub", href: "https://github.com/sufyan2k6/HackAtlas", external: true },
  { label: "Discord", href: "https://discord.gg/hackatlas", external: true },
];

export const HACKATHON_SOURCES = [
  { id: "devpost", label: "Devpost", url: "https://devpost.com" },
  { id: "devfolio", label: "Devfolio", url: "https://devfolio.co" },
  { id: "mlh", label: "Major League Hacking", url: "https://mlh.io" },
  { id: "unstop", label: "Unstop", url: "https://unstop.com" },
  { id: "hackerearth", label: "HackerEarth", url: "https://hackerearth.com" },
  { id: "hackathon-io", label: "Hackathon.io", url: "https://hackathon.io" },
];
