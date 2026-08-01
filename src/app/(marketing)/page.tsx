import type { Metadata } from "next";
import { Hero } from "@/components/sections/Hero";
import { Features } from "@/components/sections/Features";
import { Stats } from "@/components/sections/Stats";
import { FeaturedHackathons } from "@/components/sections/FeaturedHackathons";
import { CTA } from "@/components/sections/CTA";

export const metadata: Metadata = {
  title: "HackRadar — Discover Every Hackathon. Miss Nothing.",
  description:
    "HackRadar aggregates hackathons from Devpost, Devfolio, MLH, Unstop, and more — giving you one unified feed to find, filter, and track every hackathon opportunity.",
};

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
