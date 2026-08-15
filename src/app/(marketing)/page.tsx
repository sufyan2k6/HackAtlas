import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { Stats } from "@/components/sections/Stats";
import { FeaturedHackathons } from "@/components/sections/FeaturedHackathons";
import { CTA } from "@/components/sections/CTA";

export const metadata: Metadata = {
  title: "HackAtlas — Discover Every Hackathon. Miss Nothing.",
  description:
    "HackAtlas aggregates hackathons from Devpost, Devfolio, MLH, Unstop, and more — giving you one unified feed to find, filter, and track every hackathon opportunity.",
};

// Revalidate every 5 minutes so homepage shows fresh database records
export const revalidate = 300;

export default function HomePage() {
  return (
    <>
      <Hero />
      <Stats />
      <FeaturedHackathons />
      <Features />
      <CTA />
    </>
  );
}
