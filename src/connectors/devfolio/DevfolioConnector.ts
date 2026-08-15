// =============================================================================
// HackAtlas Connector — DevfolioConnector
//
// Acquisition method: Public structured JSON REST API (no auth required).
//
// Confirmed endpoints (discovered 2026-08-15):
//   GET https://api.devfolio.co/api/hackathons?filter=application_open&page=1&limit=30
//   GET https://api.devfolio.co/api/hackathons?filter=upcoming&page=1&limit=30
//   GET https://api.devfolio.co/api/hackathons?filter=live&page=1&limit=30
//   GET https://api.devfolio.co/api/hackathons?page=1&limit=30
//
// Response shape:
//   {
//     "result": [ DevfolioRawEvent, ... ],
//     "count": 26,
//     "pages": 1
//   }
// =============================================================================

import { BaseConnector } from "../base";
import type { HackAtlasEvent } from "../types";

// ---------------------------------------------------------------------------
// Raw types — mirrors the confirmed Devfolio JSON response shape
// ---------------------------------------------------------------------------

export interface DevfolioHackathonSetting {
  logo?: string | null;
  subdomain?: string | null;
  reg_starts_at?: string | null;
  reg_ends_at?: string | null;
  site?: string | null;
  is_hybrid?: boolean | null;
  quadratic_voting_prize_pool_amount?: number | null;
  quadratic_voting_currency?: string | null;
}

export interface DevfolioPrize {
  uuid?: string;
  name?: string;
  desc?: string;
  quantity?: number;
  currency?: string | null;
  amount?: string | number | null;
  is_partner_prize?: boolean;
  hidden?: boolean;
}

export interface DevfolioTheme {
  uuid?: string;
  name?: string;
}

export interface DevfolioRawEvent {
  uuid: string;
  name: string;
  slug: string;
  tagline?: string | null;
  desc?: string | null;
  cover_img?: string | null;
  favicon?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  is_online?: boolean | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  location?: string | null;
  team_min?: number | null;
  team_size?: number | null;
  approx_participant?: string | null;
  participants_count?: number | null;
  featured?: boolean | null;
  status?: string | null;
  hosted_by?: string | null;
  hackathon_setting?: DevfolioHackathonSetting | null;
  prizes?: DevfolioPrize[] | null;
  prizes_total?: number | string | null;
  prize_currency?: string | null;
  themes?: DevfolioTheme[] | null;
}

export interface DevfolioApiResponse {
  result: DevfolioRawEvent[];
  count: number;
  pages: number;
}

// ---------------------------------------------------------------------------
// Helper: Parse prize amounts and currency
// ---------------------------------------------------------------------------

export function parseDevfolioPrize(raw: DevfolioRawEvent): {
  prizePool?: number;
  currency?: string;
} {
  let total = 0;
  let currency = "INR";

  // 1. Sum up explicit prize breakdown items
  if (Array.isArray(raw.prizes) && raw.prizes.length > 0) {
    for (const p of raw.prizes) {
      if (p.hidden) continue;
      const amt = parseFloat(String(p.amount ?? "0"));
      if (!isNaN(amt) && amt > 0) {
        const qty = p.quantity && p.quantity > 0 ? p.quantity : 1;
        total += amt * qty;
        if (p.currency && p.currency.trim()) {
          currency = p.currency.trim().toUpperCase();
        }
      }
    }
  }

  // 2. Check prizes_total if itemized prizes weren't present
  if (total === 0 && raw.prizes_total) {
    const amt = parseFloat(String(raw.prizes_total));
    if (!isNaN(amt) && amt > 0) {
      total = amt;
      if (raw.prize_currency) currency = raw.prize_currency.toUpperCase();
    }
  }

  // 3. Fallback: Parse prize from description text if present
  if (total === 0 && raw.desc) {
    const prizeMatch = raw.desc.match(
      /(?:prize\s*pool|total\s*prizes?|prizes?)\s*[:\-–]?\s*(?:₹|INR|\$|USD)?\s*([0-9,]+(?:\s*[kKmM])?)/i
    );
    if (prizeMatch) {
      let valStr = prizeMatch[1].replace(/,/g, "").trim();
      let multiplier = 1;
      if (/k$/i.test(valStr)) {
        multiplier = 1000;
        valStr = valStr.slice(0, -1);
      } else if (/m$/i.test(valStr)) {
        multiplier = 1000000;
        valStr = valStr.slice(0, -1);
      }
      const parsed = parseFloat(valStr);
      if (!isNaN(parsed) && parsed > 0) {
        total = parsed * multiplier;
        if (raw.desc.includes("$") || raw.desc.includes("USD")) currency = "USD";
      }
    }
  }

  if (total > 0) {
    return { prizePool: Math.round(total), currency };
  }
  return {};
}

// ---------------------------------------------------------------------------
// Helper: Map Devfolio mode to canonical mode
// ---------------------------------------------------------------------------

export function mapDevfolioMode(raw: DevfolioRawEvent): "online" | "in_person" | "hybrid" {
  if (raw.hackathon_setting?.is_hybrid) {
    return "hybrid";
  }
  if (raw.is_online) {
    return "online";
  }
  return "in_person";
}

// ---------------------------------------------------------------------------
// DevfolioConnector Implementation
// ---------------------------------------------------------------------------

const DEVFOLIO_API_BASE = "https://api.devfolio.co/api/hackathons";
const MAX_PAGES_PER_FILTER = 5;
const PER_PAGE_LIMIT = 30;

export class DevfolioConnector extends BaseConnector<DevfolioRawEvent> {
  readonly name = "Devfolio Connector";
  readonly version = "1.0.0";
  readonly source = "devfolio";
  readonly description =
    "Fetches active, upcoming, and featured hackathons from Devfolio's public JSON REST API. " +
    "Endpoints: GET /api/hackathons?filter=application_open | upcoming | live & general list";

  // ── Public entry point ────────────────────────────────────────────────────

  async fetch(): Promise<HackAtlasEvent[]> {
    const rawEventsMap = new Map<string, DevfolioRawEvent>();

    // 1. Fetch targeted status streams: application_open, upcoming, live
    const filters = ["application_open", "upcoming", "live"];
    for (const filter of filters) {
      await this.fetchFilteredStream(filter, rawEventsMap);
    }

    // 2. Fetch general hackathons list up to MAX_PAGES_PER_FILTER for broader coverage
    await this.fetchGeneralPages(rawEventsMap);

    console.log(
      `[DevfolioConnector] Discovered ${rawEventsMap.size} unique raw Devfolio hackathons.`
    );

    // 3. Map raw events to canonical HackAtlasEvent model
    const events: HackAtlasEvent[] = [];
    for (const raw of rawEventsMap.values()) {
      try {
        const mapped = this.mapEvent(raw);
        if (mapped) events.push(mapped);
      } catch (err) {
        console.warn(
          `[DevfolioConnector] Skipping malformed event [${raw?.uuid || raw?.slug || "unknown"}]: ` +
            (err instanceof Error ? err.message : String(err))
        );
      }
    }

    console.log(
      `[DevfolioConnector] Ingestion ready: ${events.length} canonical hackathons mapped.`
    );

    return events;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async fetchFilteredStream(
    filter: string,
    rawEventsMap: Map<string, DevfolioRawEvent>
  ): Promise<void> {
    try {
      let page = 1;
      let totalPages = 1;

      while (page <= totalPages && page <= MAX_PAGES_PER_FILTER) {
        const url = `${DEVFOLIO_API_BASE}?filter=${filter}&page=${page}&limit=${PER_PAGE_LIMIT}`;
        const data = await this.request(url);
        if (!data || !Array.isArray(data.result)) break;

        totalPages = data.pages || 1;
        for (const item of data.result) {
          const key = item.uuid || item.slug;
          if (key) rawEventsMap.set(key, item);
        }
        page++;
      }
    } catch (err) {
      console.error(
        `[DevfolioConnector] Filter stream '${filter}' error: ` +
          (err instanceof Error ? err.message : String(err))
      );
    }
  }

  private async fetchGeneralPages(
    rawEventsMap: Map<string, DevfolioRawEvent>
  ): Promise<void> {
    try {
      for (let page = 1; page <= MAX_PAGES_PER_FILTER; page++) {
        const url = `${DEVFOLIO_API_BASE}?page=${page}&limit=${PER_PAGE_LIMIT}`;
        const data = await this.request(url);
        if (!data || !Array.isArray(data.result) || data.result.length === 0) break;

        for (const item of data.result) {
          const key = item.uuid || item.slug;
          if (key && !rawEventsMap.has(key)) {
            rawEventsMap.set(key, item);
          }
        }
      }
    } catch (err) {
      console.error(
        `[DevfolioConnector] General list error: ` +
          (err instanceof Error ? err.message : String(err))
      );
    }
  }

  private async request(url: string): Promise<DevfolioApiResponse | null> {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} — GET ${url}`);
    }

    return (await response.json()) as DevfolioApiResponse;
  }

  // ── Field Mapping ──────────────────────────────────────────────────────────

  private mapEvent(raw: DevfolioRawEvent): HackAtlasEvent | null {
    // Guard: identifier and title must be present
    const sourceId = raw.uuid || raw.slug;
    if (!sourceId || !raw.name?.trim()) {
      return null;
    }

    // ── Dates ──
    const startDate = raw.starts_at ? new Date(raw.starts_at).toISOString() : null;
    const endDate = raw.ends_at ? new Date(raw.ends_at).toISOString() : null;

    if (!startDate || !endDate) {
      console.warn(`[DevfolioConnector] Skipping [${sourceId}] — missing start/end date.`);
      return null;
    }

    const regDeadline = raw.hackathon_setting?.reg_ends_at
      ? new Date(raw.hackathon_setting.reg_ends_at).toISOString()
      : endDate;

    // ── Description ──
    const organizer = raw.hosted_by?.trim() || `${raw.name.trim()} Organizers`;
    const cleanDesc = raw.desc
      ? raw.desc.replace(/<[^>]*>/g, " ").replace(/#+/g, "").replace(/\s+/g, " ").trim()
      : "";
    const description = cleanDesc || `${raw.name.trim()} on Devfolio. Organized by ${organizer}.`;
    const shortDescription =
      raw.tagline?.trim() ||
      (description.length <= 200
        ? description
        : description.slice(0, 200).replace(/\s\S+$/, "") + "…");

    // ── Mode & Location ──
    const mode = mapDevfolioMode(raw);
    const location =
      raw.location?.trim() ||
      [raw.city, raw.state, raw.country].filter(Boolean).join(", ") ||
      (mode === "online" ? "Online" : undefined);

    // ── Prize ──
    const { prizePool, currency } = parseDevfolioPrize(raw);

    // ── Images ──
    const logoUrl =
      raw.hackathon_setting?.logo?.trim() ||
      raw.favicon?.trim() ||
      raw.cover_img?.trim() ||
      undefined;

    const bannerUrl = raw.cover_img?.trim() || undefined;

    // ── Tracks & Tags ──
    const themesList = (raw.themes ?? [])
      .map((t) => t.name?.trim())
      .filter((t): t is string => Boolean(t && t !== "No Restrictions"));

    const tags = [
      ...themesList,
      raw.city,
      raw.country,
      mode === "online" ? "online" : undefined,
    ].filter((t): t is string => Boolean(t && t.trim()));

    // Canonical sourceUrl
    const sourceUrl = `https://${raw.slug}.devfolio.co/`;

    return {
      sourceId: String(sourceId),
      source: this.source,
      sourceUrl,

      title: raw.name.trim(),
      description,
      shortDescription,

      organizerName: organizer,
      organizerLogo: undefined,
      organizerUrl: undefined,

      logoUrl,
      bannerUrl,

      startDate,
      endDate,
      registrationDeadline: regDeadline,

      mode,
      location,
      city: raw.city?.trim() || undefined,
      country: raw.country?.trim() || undefined,

      prizePool,
      currency: prizePool ? (currency || "INR") : undefined,

      teamSizeMin: raw.team_min && raw.team_min > 0 ? raw.team_min : undefined,
      teamSizeMax: raw.team_size && raw.team_size > 0 ? raw.team_size : undefined,
      participantCount:
        raw.participants_count && raw.participants_count > 0
          ? raw.participants_count
          : raw.approx_participant
          ? parseInt(raw.approx_participant, 10) || undefined
          : undefined,

      tracks: themesList,
      tags: [...new Set(tags)],

      featured: Boolean(raw.featured),
    };
  }
}
