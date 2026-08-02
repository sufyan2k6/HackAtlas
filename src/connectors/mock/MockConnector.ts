// =============================================================================
// HackAtlas Connector Framework — MockConnector
//
// A reference implementation of BaseConnector that returns sample events.
// This is the ONLY connector in the prototype; future connectors follow
// this exact pattern without any changes to the pipeline.
//
// To add a new source:
//   1. Copy this file to src/connectors/<source>/<Source>Connector.ts
//   2. Replace the raw mock data with real fetch() logic
//   3. Register it in src/app/api/ingest/route.ts
// =============================================================================

import { BaseConnector } from "../base";
import type { HackAtlasEvent } from "../types";

// ---------------------------------------------------------------------------
// Raw type for this connector's "source" data.
// In a real connector this would match the API response schema.
// ---------------------------------------------------------------------------
interface MockRawEvent {
  id: string;
  name: string;
  organiser: string;
  url: string;
  blurb: string;
  body: string;
  format: "online" | "in_person" | "hybrid";
  venue?: string;
  city?: string;
  country?: string;
  begins: string;
  ends: string;
  regCloses?: string;
  prizeCents?: number;
  themes: string[];
  labels: string[];
  teamMin?: number;
  teamMax?: number;
  attendees?: number;
  pinned?: boolean;
}

// ---------------------------------------------------------------------------
// Sample data — three events spanning all mode types and status states
// ---------------------------------------------------------------------------
const MOCK_RAW_EVENTS: MockRawEvent[] = [
  {
    id: "mock-001",
    name: "HackAtlas Open 2025",
    organiser: "HackAtlas Foundation",
    url: "https://example.com/hackathons/hackatlas-open-2025",
    blurb: "The inaugural open hackathon hosted by HackAtlas. Build anything.",
    body: "HackAtlas Open 2025 is a 48-hour global online hackathon open to builders of all skill levels. Hack on AI, Web3, developer tools, or anything that solves a real problem. Cash prizes, mentorship, and international exposure await.",
    format: "online",
    begins: "2025-11-14T09:00:00.000Z",
    ends: "2025-11-16T09:00:00.000Z",
    regCloses: "2025-11-10T23:59:00.000Z",
    prizeCents: 1500000, // $15,000
    themes: ["AI/ML", "Developer Tools", "Open Source"],
    labels: ["beginner-friendly", "global", "cash-prizes"],
    teamMin: 1,
    teamMax: 5,
    attendees: 1200,
    pinned: true,
  },
  {
    id: "mock-002",
    name: "Climate Tech Summit Hackathon",
    organiser: "GreenBuild Collective",
    url: "https://example.com/hackathons/climate-tech-summit",
    blurb: "72-hour in-person sprint tackling the climate crisis.",
    body: "Join 300+ builders at the Climate Tech Summit Hackathon in Singapore. Work with satellite data, carbon APIs, and climate scientists to prototype solutions in renewable energy, agriculture, and urban planning. Hardware welcome.",
    format: "in_person",
    venue: "Marina Bay Sands Expo",
    city: "Singapore",
    country: "SG",
    begins: "2025-10-03T08:00:00.000Z",
    ends: "2025-10-05T20:00:00.000Z",
    regCloses: "2025-09-20T23:59:00.000Z",
    prizeCents: 3000000, // $30,000
    themes: ["Climate Tech", "Hardware", "Sustainability"],
    labels: ["in-person", "travel-grants", "hardware"],
    teamMin: 2,
    teamMax: 4,
    attendees: 320,
    pinned: false,
  },
  {
    id: "mock-003",
    name: "Web3 Frontier Hack",
    organiser: "Frontier DAO",
    url: "https://example.com/hackathons/web3-frontier",
    blurb: "Hybrid hackathon exploring the decentralised frontier.",
    body: "Web3 Frontier Hack is a 5-day hybrid event merging an in-person hub in Bangalore with a global online track. Build DeFi protocols, NFT tooling, and cross-chain bridges. Top 3 teams receive grants and DAO membership.",
    format: "hybrid",
    venue: "Koramangala Innovation Hub",
    city: "Bangalore",
    country: "IN",
    begins: "2025-12-01T00:00:00.000Z",
    ends: "2025-12-05T23:59:00.000Z",
    regCloses: "2025-11-25T23:59:00.000Z",
    prizeCents: 5000000, // $50,000
    themes: ["Web3", "DeFi", "NFTs", "Cross-chain"],
    labels: ["dao", "grants", "hybrid", "advanced"],
    teamMin: 1,
    teamMax: 6,
    attendees: 850,
    pinned: false,
  },
];

// ---------------------------------------------------------------------------
// MockConnector
// ---------------------------------------------------------------------------

export class MockConnector extends BaseConnector<MockRawEvent> {
  readonly name = "Mock Connector";
  readonly version = "1.0.0";
  readonly source = "mock";
  readonly description =
    "A reference connector that returns hardcoded sample events. " +
    "Used to prototype and validate the full ingestion pipeline without scraping.";

  /**
   * Transforms MockRawEvent[] → HackAtlasEvent[].
   *
   * Notice: field mapping is entirely isolated here.
   * The rest of the pipeline never sees MockRawEvent.
   */
  async fetch(): Promise<HackAtlasEvent[]> {
    return MOCK_RAW_EVENTS.map(
      (raw): HackAtlasEvent => ({
        sourceId: raw.id,
        source: this.source, // always "mock"
        sourceUrl: raw.url,

        title: raw.name,
        description: raw.body,
        shortDescription: raw.blurb,

        organizerName: raw.organiser,

        startDate: raw.begins,
        endDate: raw.ends,
        registrationDeadline: raw.regCloses,

        mode: raw.format,
        location: raw.venue,
        city: raw.city,
        country: raw.country,

        prizePool: raw.prizeCents,
        currency: "USD",

        teamSizeMin: raw.teamMin,
        teamSizeMax: raw.teamMax,
        participantCount: raw.attendees,

        tracks: raw.themes,
        tags: raw.labels,

        featured: raw.pinned ?? false,
      })
    );
  }
}
