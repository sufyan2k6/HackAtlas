// =============================================================================
// HackAtlas Connector — Hack2SkillConnector
//
// Acquisition method: Public Web Asset & Event Module Catalog
//
// Confirmed public entrypoint:
//   GET https://hack2skill.com/assets/index-4644e016.js
//   and respective public event component modules.
//
// Maps official Hack2Skill hackathons, challenges, and buildathons.
// =============================================================================

import { BaseConnector } from "../base";
import type { HackAtlasEvent } from "../types";

// ---------------------------------------------------------------------------
// Raw event shape extracted from Hack2Skill
// ---------------------------------------------------------------------------

export interface Hack2SkillRawEvent {
  slug: string;
  route: string;
  title: string;
  description?: string;
  startDate?: string | null;
  endDate?: string | null;
  registrationDeadline?: string | null;
  prizePool?: number;
  currency?: string;
  mode?: "online" | "in_person" | "hybrid";
  location?: string;
  logoUrl?: string;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// Hack2SkillConnector Implementation
// ---------------------------------------------------------------------------

const H2S_BASE_URL = "https://hack2skill.com";
const H2S_MAIN_BUNDLE = "https://hack2skill.com/assets/index-4644e016.js";

export class Hack2SkillConnector extends BaseConnector<Hack2SkillRawEvent> {
  readonly name = "Hack2Skill Connector";
  readonly version = "1.0.0";
  readonly source = "hack2skill";
  readonly description =
    "Fetches hackathons, challenges, and buildathons from Hack2Skill's public event catalog.";

  // ── Public entry point ────────────────────────────────────────────────────

  async fetch(): Promise<HackAtlasEvent[]> {
    const rawEvents: Hack2SkillRawEvent[] = [];

    try {
      const response = await fetch(H2S_MAIN_BUNDLE, {
        method: "GET",
        headers: {
          Accept: "*/*",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} — GET ${H2S_MAIN_BUNDLE}`);
      }

      const mainText = await response.text();
      const routeEntries =
        mainText.match(
          /path:\s*["'](\/event\/[a-zA-Z0-9_-]+)\/?["'],component:\[[^\]]*children:s\(([a-zA-Z0-9_$]+)/gi
        ) || [];

      for (const entry of routeEntries) {
        const m = entry.match(
          /path:\s*["'](\/event\/[a-zA-Z0-9_-]+)\/?["'],component:\[[^\]]*children:s\(([a-zA-Z0-9_$]+)/i
        );
        if (!m) continue;
        const route = m[1];
        const comp = m[2];

        const lazyMatch = mainText.match(
          new RegExp(`${comp}=f\\.lazy\\(\\(\\)=>v0\\(\\(\\)=>import\\(["']\\.\\/([^"']+)["']\\)`)
        );
        if (!lazyMatch) continue;
        const chunkFile = lazyMatch[1];

        try {
          const raw = await this.fetchEventChunk(route, chunkFile);
          if (raw) rawEvents.push(raw);
        } catch (err) {
          console.warn(
            `[Hack2SkillConnector] Error parsing chunk for ${route}: ` +
              (err instanceof Error ? err.message : String(err))
          );
        }
      }
    } catch (err) {
      console.error(
        "[Hack2SkillConnector] Error fetching main catalog: " +
          (err instanceof Error ? err.message : String(err))
      );
    }

    console.log(
      `[Hack2SkillConnector] Discovered ${rawEvents.length} raw Hack2Skill events.`
    );

    const events: HackAtlasEvent[] = [];
    for (const raw of rawEvents) {
      try {
        const mapped = this.mapEvent(raw);
        if (mapped) events.push(mapped);
      } catch (err) {
        console.warn(
          `[Hack2SkillConnector] Skipping malformed event [${raw.slug}]: ` +
            (err instanceof Error ? err.message : String(err))
        );
      }
    }

    console.log(
      `[Hack2SkillConnector] Ingestion ready: ${events.length} canonical hackathons mapped.`
    );

    return events;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async fetchEventChunk(
    route: string,
    chunkFile: string
  ): Promise<Hack2SkillRawEvent | null> {
    const chunkUrl = `${H2S_BASE_URL}/assets/${chunkFile}`;
    const response = await fetch(chunkUrl, {
      method: "GET",
      headers: {
        Accept: "*/*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) return null;
    const text = await response.text();
    const slug = route.replace(/^\/event\//, "");

    // Extract title
    let title = "";
    const h1Match =
      text.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
      text.match(/<h2[^>]*>([^<]+)<\/h2>/i);
    if (h1Match) title = h1Match[1].trim();

    if (!title) {
      title = slug
        .replace(/[-_]/g, " ")
        .replace(/\b[a-z]/g, (c) => c.toUpperCase());
    }

    // Extract dates
    const dateMatches =
      text.match(
        /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?(?:\s*-\s*\d{1,2})?,?\s*20\d\d/gi
      ) || [];

    let startDate: string | null = null;
    let endDate: string | null = null;

    if (dateMatches.length > 0) {
      const validDates = dateMatches
        .map((d) => new Date(d.replace(/(\d+)(?:st|nd|rd|th)/, "$1")))
        .filter((d) => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());

      if (validDates.length > 0) {
        startDate = validDates[0].toISOString();
        endDate = validDates[validDates.length - 1].toISOString();
      }
    }

    // Fallback default season window if dates not in chunk
    if (!startDate || !endDate) {
      startDate = new Date("2026-01-01T00:00:00Z").toISOString();
      endDate = new Date("2026-12-31T23:59:59Z").toISOString();
    }

    // Extract prize
    let prizePool: number | undefined = undefined;
    let currency: string | undefined = undefined;

    const prizeMatch = text.match(/(?:₹|INR|\$|USD)\s*([0-9,]+(?:\s*[kKmM])?)/i);
    if (prizeMatch) {
      let numStr = prizeMatch[1].replace(/,/g, "").trim();
      let multiplier = 1;
      if (/k$/i.test(numStr)) {
        multiplier = 1000;
        numStr = numStr.slice(0, -1);
      } else if (/m$/i.test(numStr)) {
        multiplier = 1000000;
        numStr = numStr.slice(0, -1);
      }
      const parsed = parseFloat(numStr);
      if (!isNaN(parsed) && parsed > 0) {
        prizePool = Math.round(parsed * multiplier);
        currency = prizeMatch[0].includes("$") || prizeMatch[0].includes("USD") ? "USD" : "INR";
      }
    }

    // Extract logo / image
    const imgMatch = text.match(/https?:\/\/[^"']+\.(?:png|jpg|jpeg|webp|svg)/i);
    const logoUrl = imgMatch ? imgMatch[0] : undefined;

    return {
      slug,
      route,
      title,
      description: `${title} on Hack2Skill. Participate, build, and innovate.`,
      startDate,
      endDate,
      registrationDeadline: endDate,
      prizePool,
      currency,
      mode: "online",
      logoUrl,
      tags: ["hack2skill", "india", "innovation"],
    };
  }

  // ── Field Mapping ──────────────────────────────────────────────────────────

  private mapEvent(raw: Hack2SkillRawEvent): HackAtlasEvent | null {
    if (!raw.slug || !raw.title?.trim() || !raw.startDate || !raw.endDate) {
      return null;
    }

    const sourceUrl = `${H2S_BASE_URL}${raw.route}`;
    const description = raw.description || `${raw.title.trim()} on Hack2Skill.`;
    const shortDescription = description.length <= 200 ? description : description.slice(0, 200) + "…";

    return {
      sourceId: `h2s-${raw.slug}`,
      source: this.source,
      sourceUrl,

      title: raw.title.trim(),
      description,
      shortDescription,

      organizerName: "Hack2Skill",
      organizerLogo: undefined,
      organizerUrl: H2S_BASE_URL,

      logoUrl: raw.logoUrl,
      bannerUrl: undefined,

      startDate: raw.startDate,
      endDate: raw.endDate,
      registrationDeadline: raw.registrationDeadline ?? raw.endDate,

      mode: raw.mode ?? "online",
      location: "Online / India",
      city: undefined,
      country: "India",

      prizePool: raw.prizePool,
      currency: raw.currency,

      teamSizeMin: 1,
      teamSizeMax: 4,
      participantCount: undefined,

      tracks: [],
      tags: raw.tags ?? ["hack2skill", "india"],

      featured: false,
    };
  }
}
