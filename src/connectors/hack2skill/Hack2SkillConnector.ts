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
// Helper: Parse prize amount and currency from Hack2Skill text chunks
// ---------------------------------------------------------------------------

export function parseHack2SkillPrize(text: string): {
  prizePool?: number;
  currency?: string | null;
} {
  if (!text) return {};

  // Reject overall text that has zero prize indicators
  const hasPrizeKeyword = /(?:prize|prizes|reward|rewards|winning|winnings|bounty|grant)/i.test(text);
  if (!hasPrizeKeyword) return {};

  // Context Patterns:
  // 1. "prize pool: ₹65 lakhs" / "prizes worth INR 8,00,000" / "cash prizes of $30,000" / "prizes: 100 EUR"
  // 2. "₹65 lakhs in cash prizes" / "₹7,00,000/- in prizes" / "$30,000 prize pool"
  // 3. Structured properties like `prize: "₹7,00,000"`
  const patterns = [
    /(?:prize\s*pool|cash\s*prizes?|total\s*prizes?|worth\s*of\s*prizes?|prizes?|rewards?|winnings?)\s*(?:of|worth|up\s*to|is|:|\-|\–)?\s*(?:(?:of|worth|up\s*to)\s*)?((?:₹|INR|\$|USD|€|EUR|£|GBP|CAD)?\s*[0-9,]+(?:\.[0-9]+)?\s*(?:lakhs?|lac|lacs?|crores?|cr|k|m)?(?:\s*\/-)?(?:\s*(?:INR|USD|EUR|GBP|CAD|₹|\$|€|£))?)/gi,
    /((?:₹|INR|\$|USD|€|EUR|£|GBP|CAD)?\s*[0-9,]+(?:\.[0-9]+)?\s*(?:lakhs?|lac|lacs?|crores?|cr|k|m)?(?:\s*\/-)?(?:\s*(?:INR|USD|EUR|GBP|CAD|₹|\$|€|£))?)\s*(?:in\s*cash\s*prizes?|in\s*prizes?|prize\s*pool|total\s*prizes?|worth\s*of\s*prizes?|cash\s*prizes?|prizes?|rewards?)/gi,
    /["']?prize(?:Pool|_amount)?["']?\s*:\s*["']?([^"',}\n]+)["']?/gi,
  ];

  for (const regex of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const candidate = match[1] || match[0];
      if (!candidate) continue;

      // Filter out false positives (loan examples, FAQs, EMI, etc.)
      if (/loan|home\s*loan|emi|interest|budget|fee|cost|price\s*tag|discount|tax/i.test(match[0])) {
        continue;
      }

      // Extract currency
      let currency: string | null = null;
      if (/₹|INR/i.test(candidate)) currency = "INR";
      else if (/\$|USD/i.test(candidate)) currency = "USD";
      else if (/€|EUR/i.test(candidate)) currency = "EUR";
      else if (/£|GBP/i.test(candidate)) currency = "GBP";
      else if (/CAD|C\$/i.test(candidate)) currency = "CAD";

      // Extract number part
      const numMatch = candidate.match(/([0-9,]+(?:\.[0-9]+)?)/);
      if (!numMatch) continue;

      const cleanNumStr = numMatch[1].replace(/,/g, "").trim();
      const numVal = parseFloat(cleanNumStr);
      if (isNaN(numVal) || numVal <= 0) continue;

      // Extract unit (lakh, crore, k, m)
      const unitMatch = candidate.match(/(?:lakhs?|lac|lacs?|crores?|cr|\bk\b|\bm\b)/i);
      let multiplier = 1;

      if (unitMatch) {
        const u = unitMatch[0].toLowerCase();
        if (u.startsWith("lakh") || u.startsWith("lac")) multiplier = 100_000;
        else if (u.startsWith("crore") || u === "cr") multiplier = 10_000_000;
        else if (u === "k") multiplier = 1_000;
        else if (u === "m") multiplier = 1_000_000;
      }

      const total = Math.round(numVal * multiplier);

      // Protect against tiny single numbers without unit or currency
      if (total < 100 && !unitMatch && !currency) {
        continue;
      }

      if (total > 0) {
        return { prizePool: total, currency };
      }
    }
  }

  return {};
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

    // Extract prize with contextual validation and Indian unit support
    const { prizePool, currency } = parseHack2SkillPrize(text);

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
      currency: currency ?? undefined,
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
