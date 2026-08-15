// =============================================================================
// HackAtlas Connector — MLHConnector
//
// Acquisition method: Public structured season schedule & Schema.org Microdata
//
// Confirmed endpoints:
//   GET https://mlh.io/seasons/2026/events
//   GET https://mlh.io/seasons/2025/events
//
// Each card embeds schema.org/Event microdata with exact ISO dates,
// official event URLs, attendance mode, and verified logos.
// =============================================================================

import { BaseConnector } from "../base";
import type { HackAtlasEvent } from "../types";

// ---------------------------------------------------------------------------
// Raw event shape extracted from MLH cards
// ---------------------------------------------------------------------------

export interface MLHRawEvent {
  sourceId: string;
  title: string;
  sourceUrl: string;
  logoUrl?: string;
  startDate: string; // ISO 8601
  endDate: string;   // ISO 8601
  attendanceMode?: string;
  seasonYear: number;
  locationText?: string;
  tags?: string[];
}

// ---------------------------------------------------------------------------
// MLHConnector Implementation
// ---------------------------------------------------------------------------

const MLH_SEASONS = [2026, 2025];

export class MLHConnector extends BaseConnector<MLHRawEvent> {
  readonly name = "MLH Connector";
  readonly version = "1.0.0";
  readonly source = "mlh";
  readonly description =
    "Fetches hackathons from Major League Hacking (MLH) official season schedules " +
    "using public structured schema.org event microdata.";

  // ── Public entry point ────────────────────────────────────────────────────

  async fetch(): Promise<HackAtlasEvent[]> {
    const rawEventsMap = new Map<string, MLHRawEvent>();

    for (const year of MLH_SEASONS) {
      try {
        await this.fetchSeason(year, rawEventsMap);
      } catch (err) {
        console.error(
          `[MLHConnector] Season ${year} fetch failed — skipping: ` +
            (err instanceof Error ? err.message : String(err))
        );
      }
    }

    console.log(
      `[MLHConnector] Discovered ${rawEventsMap.size} unique MLH hackathons across seasons.`
    );

    const events: HackAtlasEvent[] = [];
    for (const raw of rawEventsMap.values()) {
      try {
        const mapped = this.mapEvent(raw);
        if (mapped) events.push(mapped);
      } catch (err) {
        console.warn(
          `[MLHConnector] Skipping event [${raw.sourceId}]: ` +
            (err instanceof Error ? err.message : String(err))
        );
      }
    }

    console.log(`[MLHConnector] Ingestion ready: ${events.length} events mapped.`);
    return events;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async fetchSeason(
    year: number,
    rawEventsMap: Map<string, MLHRawEvent>
  ): Promise<void> {
    const url = `https://mlh.io/seasons/${year}/events`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} — GET ${url}`);
    }

    const html = await response.text();
    this.extractCardsFromHtml(html, year, rawEventsMap);
  }

  private extractCardsFromHtml(
    html: string,
    year: number,
    rawEventsMap: Map<string, MLHRawEvent>
  ): void {
    // Each event card in modern MLH contains schema.org microdata meta tags
    const cardRegex = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?<meta itemProp="startDate"[\s\S]*?)<\/a>/gi;
    let match;

    while ((match = cardRegex.exec(html)) !== null) {
      const href = match[1].replace(/&amp;/g, "&");
      const cardHtml = match[0];

      const getMeta = (prop: string): string | null => {
        const m = cardHtml.match(
          new RegExp(`<meta\\s+itemProp="${prop}"\\s+content="([^"]*)"`, "i")
        );
        return m ? m[1].trim() : null;
      };

      const titleMatch = cardHtml.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i);
      const title = titleMatch
        ? titleMatch[1].replace(/<[^>]*>/g, "").trim()
        : getMeta("name");

      if (!title || href.startsWith("#")) continue;

      const startDate = getMeta("startDate");
      const endDate = getMeta("endDate") || startDate;
      if (!startDate || !endDate) continue;

      const attendanceMode = getMeta("eventAttendanceMode") || undefined;
      const logoUrl = getMeta("image") || undefined;
      const canonicalUrl = getMeta("url") || href;

      // Extract UUID or slug from URL / image / title
      const uuidMatch = (logoUrl || "").match(/events\/([a-f0-9-]+)\//i);
      const slug = uuidMatch
        ? uuidMatch[1]
        : title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const sourceId = `mlh-${year}-${slug}`;

      // Extract badges/tags
      const tags = ["mlh", `season-${year}`];
      if (cardHtml.includes("DIVERSITY")) tags.push("Diversity");
      if (cardHtml.includes("HIGH SCHOOL")) tags.push("High School");

      // Extract location text from card text
      const textLines = cardHtml
        .replace(/<[^>]*>/g, "\n")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const locationText = textLines.find(
        (l) => l.includes(",") && !l.includes(" - ") && l !== title && !l.includes(String(year))
      );

      rawEventsMap.set(sourceId, {
        sourceId,
        title,
        sourceUrl: canonicalUrl,
        logoUrl,
        startDate,
        endDate,
        attendanceMode,
        seasonYear: year,
        locationText,
        tags,
      });
    }
  }

  // ── Field Mapping ──────────────────────────────────────────────────────────

  private mapEvent(raw: MLHRawEvent): HackAtlasEvent | null {
    if (!raw.sourceId || !raw.title?.trim() || !raw.startDate || !raw.endDate) {
      return null;
    }

    const startDate = new Date(raw.startDate).toISOString();
    const endDate = new Date(raw.endDate).toISOString();

    const isOnline =
      raw.attendanceMode?.includes("Online") ||
      raw.locationText?.toLowerCase().includes("online") ||
      raw.locationText?.toLowerCase().includes("everywhere") ||
      raw.title.toLowerCase().includes("digital") ||
      raw.title.toLowerCase().includes("global hack week");

    const mode: "online" | "in_person" | "hybrid" = isOnline ? "online" : "in_person";

    const description = `${raw.title.trim()} — Official MLH Member Hackathon (${raw.seasonYear} Season).`;
    const shortDescription = description;

    return {
      sourceId: raw.sourceId,
      source: this.source,
      sourceUrl: raw.sourceUrl,

      title: raw.title.trim(),
      description,
      shortDescription,

      organizerName: "Major League Hacking (MLH)",
      organizerLogo: undefined,
      organizerUrl: "https://mlh.io",

      logoUrl: raw.logoUrl,
      bannerUrl: undefined,

      startDate,
      endDate,
      registrationDeadline: endDate,

      mode,
      location: isOnline ? "Online / Digital" : raw.locationText,
      city: undefined,
      country: undefined,

      prizePool: undefined,
      currency: undefined,

      teamSizeMin: 1,
      teamSizeMax: 4,
      participantCount: undefined,

      tracks: [],
      tags: raw.tags ?? ["mlh", `season-${raw.seasonYear}`],

      featured: false,
    };
  }
}
