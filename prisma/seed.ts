/**
 * HackAtlas — Database Seed Script
 *
 * Inserts curated hackathon data from seed-data.json into the Neon database.
 * Run with: npm run db:seed
 *
 * Safe to re-run — uses upsert (no duplicate errors).
 */

import { config } from "dotenv";
import { PrismaClient, HackathonMode, HackathonStatus, SubmissionStatus } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import seedData from "./seed-data.json";

// Load env the same way prisma.config.ts does
config({ path: ".env.local" });
config({ path: ".env" });

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env["DATABASE_URL"]! }),
  log: ["error", "warn"],
});

interface SeedHackathon {
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  source: string;
  sourceUrl: string;
  organizerName: string;
  organizerUrl?: string;
  organizerLogo?: string;
  startDate: string;
  endDate: string;
  registrationDeadline?: string;
  mode: string;
  location?: string;
  city?: string;
  country?: string;
  prizePool?: number;
  currency?: string;
  teamSizeMin?: number;
  teamSizeMax?: number;
  participantCount?: number;
  tracks?: string[];
  tags?: string[];
  status?: string;
  featured?: boolean;
}

async function main() {
  console.log("🌱 Starting database seed...\n");

  let created = 0;
  let updated = 0;

  for (const item of seedData as SeedHackathon[]) {
    const result = await db.hackathon.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        description: item.description,
        shortDescription: item.shortDescription,
        source: item.source,
        sourceUrl: item.sourceUrl,
        organizerName: item.organizerName,
        organizerUrl: item.organizerUrl ?? null,
        organizerLogo: item.organizerLogo ?? null,
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate),
        registrationDeadline: item.registrationDeadline
          ? new Date(item.registrationDeadline)
          : null,
        mode: item.mode as HackathonMode,
        location: item.location ?? null,
        city: item.city ?? null,
        country: item.country ?? null,
        prizePool: item.prizePool ?? null,
        currency: item.currency ?? "USD",
        teamSizeMin: item.teamSizeMin ?? null,
        teamSizeMax: item.teamSizeMax ?? null,
        participantCount: item.participantCount ?? null,
        tracks: item.tracks ?? [],
        tags: item.tags ?? [],
        status: (item.status as HackathonStatus) ?? HackathonStatus.upcoming,
        featured: item.featured ?? false,
        submissionStatus: SubmissionStatus.approved,
        updatedAt: new Date(),
      },
      create: {
        title: item.title,
        slug: item.slug,
        description: item.description,
        shortDescription: item.shortDescription,
        source: item.source,
        sourceUrl: item.sourceUrl,
        organizerName: item.organizerName,
        organizerUrl: item.organizerUrl ?? null,
        organizerLogo: item.organizerLogo ?? null,
        startDate: new Date(item.startDate),
        endDate: new Date(item.endDate),
        registrationDeadline: item.registrationDeadline
          ? new Date(item.registrationDeadline)
          : null,
        mode: item.mode as HackathonMode,
        location: item.location ?? null,
        city: item.city ?? null,
        country: item.country ?? null,
        prizePool: item.prizePool ?? null,
        currency: item.currency ?? "USD",
        teamSizeMin: item.teamSizeMin ?? null,
        teamSizeMax: item.teamSizeMax ?? null,
        participantCount: item.participantCount ?? null,
        tracks: item.tracks ?? [],
        tags: item.tags ?? [],
        status: (item.status as HackathonStatus) ?? HackathonStatus.upcoming,
        featured: item.featured ?? false,
        submissionStatus: SubmissionStatus.approved,
      },
    });

    const isNew = result.createdAt.getTime() === result.updatedAt.getTime();
    if (isNew) {
      created++;
      console.log(`  ✅ Created: ${result.title}`);
    } else {
      updated++;
      console.log(`  🔄 Updated: ${result.title}`);
    }
  }

  console.log(`\n✨ Seed complete!`);
  console.log(`   Created: ${created} hackathons`);
  console.log(`   Updated: ${updated} hackathons`);
  console.log(`   Total:   ${created + updated} hackathons in DB\n`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
