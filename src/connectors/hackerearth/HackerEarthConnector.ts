// =============================================================================
// HackAtlas Connector — HackerEarthConnector
//
// Acquisition method: Public Events API
//
// Confirmed public endpoint:
//   GET https://www.hackerearth.com/api/events/upcoming/?format=json
//
// Maps official HackerEarth hackathons and coding challenges.
// =============================================================================

import { BaseConnector } from "../base";
import type { HackAtlasEvent } from "../types";

// ---------------------------------------------------------------------------
// Raw event shape returned by HackerEarth
// ---------------------------------------------------------------------------

export interface HackerEarthRawEvent {
  title: string;
  description?: string;
  url: string;
  subscribe?: string;
  status: string; // e.g. "ONGOING", "UPCOMING", "CLOSED"
  college?: boolean;
  date?: string;
  time?: string;
  end_date?: string;
  end_time?: string;
  start_timestamp?: string;
  end_timestamp?: string;
  start_tz?: string;
  end_tz?: string;
  start_utc_tz?: string;
  end_utc_tz?: string;
  thumbnail?: string;
  cover_image?: string;
  is_hackerearth?: boolean;
  challenge_type?: string;
}

interface HackerEarthApiResponse {
  response?: HackerEarthRawEvent[];
}

// ---------------------------------------------------------------------------
// HackerEarthConnector Implementation
// ---------------------------------------------------------------------------

const HE_EVENTS_ENDPOINT = "https://www.hackerearth.com/api/events/upcoming/?format=json";

export class HackerEarthConnector extends BaseConnector<HackerEarthRawEvent> {
  readonly name = "HackerEarth Connector";
  readonly version = "1.0.0";
  readonly source = "hackerearth";
  readonly description =
    "Fetches hackathons and developer challenges from HackerEarth's public events API.";

  // ── Public entry point ────────────────────────────────────────────────────

  async fetch(): Promise<HackAtlasEvent[]> {
    let rawEvents: HackerEarthRawEvent[] = [];

    try {
      const response = await fetch(HE_EVENTS_ENDPOINT, {
        method: "GET",
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} — GET ${HE_EVENTS_ENDPOINT}`);
      }

      const text = await response.text();
      const parsed = this.parseResponse(text);
      rawEvents = parsed.response ?? [];
    } catch (err) {
      console.error(
        "[HackerEarthConnector] Ingestion error: " +
          (err instanceof Error ? err.message : String(err))
      );
    }

    console.log(
      `[HackerEarthConnector] Discovered ${rawEvents.length} raw HackerEarth events.`
    );

    const events: HackAtlasEvent[] = [];
    for (const raw of rawEvents) {
      try {
        const mapped = this.mapEvent(raw);
        if (mapped) events.push(mapped);
      } catch (err) {
        console.warn(
          `[HackerEarthConnector] Skipping event [${raw.title}]: ` +
            (err instanceof Error ? err.message : String(err))
        );
      }
    }

    console.log(
      `[HackerEarthConnector] Ingestion ready: ${events.length} canonical hackathons mapped.`
    );

    return events;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private parseResponse(rawText: string): HackerEarthApiResponse {
    let cleaned = rawText.trim();
    if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
      try {
        cleaned = JSON.parse(cleaned);
      } catch {
        cleaned = cleaned.slice(1, -1);
      }
    }

    // Safe parser handling Python-formatted dictionary literals (True, False, None)
    const True = true;
    const False = false;
    const None = null;

    try {
      const fn = new Function("True", "False", "None", `return (${cleaned});`);
      return fn(True, False, None) as HackerEarthApiResponse;
    } catch (err) {
      console.error("[HackerEarthConnector] Failed to parse API body:", err);
      return { response: [] };
    }
  }

  // ── Field Mapping ──────────────────────────────────────────────────────────

  private mapEvent(raw: HackerEarthRawEvent): HackAtlasEvent | null {
    if (!raw.title?.trim() || !raw.url) {
      return null;
    }

    // Extract slug from URL e.g. https://www.hackerearth.com/challenges/hackathon/github-repo-value-check/
    const slugMatch = raw.url.match(/challenges\/(?:hackathon|competitive|hiring)\/([^/]+)/i);
    const slug = slugMatch ? slugMatch[1] : raw.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const sourceId = `he-${slug}`;

    // Parse dates
    let startDate: string | null = null;
    let endDate: string | null = null;

    if (raw.start_utc_tz) {
      const s = new Date(raw.start_utc_tz.replace(" ", "T"));
      if (!isNaN(s.getTime())) startDate = s.toISOString();
    }
    if (!startDate && raw.date) {
      const s = new Date(raw.date);
      if (!isNaN(s.getTime())) startDate = s.toISOString();
    }

    if (raw.end_utc_tz) {
      const e = new Date(raw.end_utc_tz.replace(" ", "T"));
      if (!isNaN(e.getTime())) endDate = e.toISOString();
    }
    if (!endDate && raw.end_date) {
      const e = new Date(raw.end_date);
      if (!isNaN(e.getTime())) endDate = e.toISOString();
    }

    if (!startDate || !endDate) {
      startDate = new Date().toISOString();
      endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    }

    const description = raw.description?.trim() || `${raw.title.trim()} on HackerEarth.`;
    const shortDescription =
      description.length <= 200 ? description : description.slice(0, 200) + "…";

    const tags = ["hackerearth"];
    if (raw.challenge_type) tags.push(raw.challenge_type.toLowerCase());
    if (raw.college) tags.push("college");

    return {
      sourceId,
      source: this.source,
      sourceUrl: raw.url,

      title: raw.title.trim(),
      description,
      shortDescription,

      organizerName: "HackerEarth",
      organizerLogo: undefined,
      organizerUrl: "https://www.hackerearth.com",

      logoUrl: raw.thumbnail || raw.cover_image,
      bannerUrl: raw.cover_image,

      startDate,
      endDate,
      registrationDeadline: endDate,

      mode: "online",
      location: "Online / Global",
      city: undefined,
      country: undefined,

      prizePool: undefined,
      currency: undefined,

      teamSizeMin: 1,
      teamSizeMax: 4,
      participantCount: undefined,

      tracks: [],
      tags,

      featured: false,
    };
  }
}
