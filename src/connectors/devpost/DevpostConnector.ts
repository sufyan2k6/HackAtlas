// =============================================================================
// HackAtlas Connector — DevpostConnector
//
// Acquisition method: Public structured JSON REST API (no auth required).
//
// Confirmed endpoint (discovered 2026-08-15):
//   GET https://devpost.com/api/hackathons?status[]=open&status[]=upcoming&page=1
//
// Response shape:
//   {
//     "hackathons": [ DevpostRawEvent, ... ],
//     "meta": { "total_count": 177, "per_page": 9, "fuzzy": false }
//   }
// =============================================================================

import { BaseConnector } from "../base";
import type { HackAtlasEvent } from "../types";

// ---------------------------------------------------------------------------
// Raw types — mirrors the confirmed Devpost JSON response shape
// ---------------------------------------------------------------------------

export interface DevpostDisplayedLocation {
  icon: string;       // "globe" for Online, "location" for in-person
  location: string;   // "Online", "Toronto", "San Francisco, CA", etc.
}

export interface DevpostTheme {
  id: number;
  name: string;       // e.g. "Machine Learning/AI", "Productivity"
}

export interface DevpostPrizesCounts {
  cash: number;
  other: number;
}

export interface DevpostRawEvent {
  id: number;
  title: string;
  displayed_location: DevpostDisplayedLocation;
  open_state: string;               // "open" | "upcoming" | "ended"
  thumbnail_url: string | null;     // CDN image URL e.g. "//d112y698adiu2z.cloudfront.net/..."
  analytics_identifier: string;     // e.g. "Build with Gemini XPRIZE (29541)"
  url: string;                      // e.g. "https://xprize.devpost.com/"
  time_left_to_submission: string | null; // e.g. "2 days left"
  submission_period_dates: string;  // e.g. "May 19 - Aug 17, 2026" or "Aug 04 - 31, 2026"
  themes: DevpostTheme[];
  prize_amount: string | null;      // e.g. "$<span data-currency-value>2,000,000</span>"
  prizes_counts: DevpostPrizesCounts;
  registrations_count: number;
  featured: boolean;
  organization_name: string | null;
  winners_announced: boolean;
  submission_gallery_url: string | null;
  start_a_submission_url: string | null;
  invite_only: boolean;
  eligibility_requirement_invite_only_description: string | null;
  managed_by_devpost_badge: boolean;
}

export interface DevpostApiResponse {
  hackathons: DevpostRawEvent[];
  meta: {
    total_count: number;
    per_page: number;
    fuzzy: boolean;
  };
}

// ---------------------------------------------------------------------------
// Helper: Parse Devpost date ranges
// Devpost formats dates as:
//   "May 19 - Aug 17, 2026" (different months, same year)
//   "Aug 04 - 31, 2026"     (same month and year)
//   "Jul 16, 2026 - Jan 15, 2027" (different years)
// ---------------------------------------------------------------------------

export function parseDevpostDates(dateStr: string): {
  startDate: string | null;
  endDate: string | null;
  registrationDeadline: string | null;
} {
  if (!dateStr || !dateStr.trim()) {
    return { startDate: null, endDate: null, registrationDeadline: null };
  }

  const cleaned = dateStr.trim();
  const parts = cleaned.split(/\s*-\s*/);

  if (parts.length !== 2) {
    const single = new Date(cleaned);
    if (!isNaN(single.getTime())) {
      const iso = single.toISOString();
      return { startDate: iso, endDate: iso, registrationDeadline: iso };
    }
    return { startDate: null, endDate: null, registrationDeadline: null };
  }

  const [left, right] = parts;
  let startStr = left.trim();
  let endStr = right.trim();

  // If right contains a 4-digit year (e.g. "Aug 17, 2026" or "Jan 15, 2027")
  const yearMatch = endStr.match(/\b(20\d\d)\b/);
  const year = yearMatch ? yearMatch[1] : String(new Date().getFullYear());

  // If right is just a day + year, e.g. "31, 2026" while left is "Aug 04"
  if (/^\d+,\s*20\d\d$/.test(endStr)) {
    const leftMonth = startStr.match(/^([A-Za-z]+)/)?.[1];
    if (leftMonth) {
      endStr = `${leftMonth} ${endStr}`;
    }
  }

  // If left doesn't have a year, append the right's year
  if (!/\b20\d\d\b/.test(startStr)) {
    startStr = `${startStr}, ${year}`;
  }

  const startDateObj = new Date(startStr);
  const endDateObj = new Date(endStr);

  const startValid = !isNaN(startDateObj.getTime());
  const endValid = !isNaN(endDateObj.getTime());

  if (!startValid || !endValid) {
    return { startDate: null, endDate: null, registrationDeadline: null };
  }

  const startIso = startDateObj.toISOString();
  const endIso = endDateObj.toISOString();

  // In Devpost, the submission deadline matches the hackathon submission end date
  return {
    startDate: startIso,
    endDate: endIso,
    registrationDeadline: endIso,
  };
}

// ---------------------------------------------------------------------------
// Helper: Parse prize amounts and currency from HTML-formatted string
// e.g. "$<span data-currency-value>2,000,000</span>" -> { prizePool: 2000000, currency: "USD" }
// ---------------------------------------------------------------------------

export function parseDevpostPrize(prizeStr: string | null | undefined): {
  prizePool?: number;
  currency?: string;
} {
  if (!prizeStr) return {};

  const stripped = prizeStr.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

  let currency = "USD";
  if (stripped.includes("₹") || stripped.includes("INR")) currency = "INR";
  else if (stripped.includes("€") || stripped.includes("EUR")) currency = "EUR";
  else if (stripped.includes("£") || stripped.includes("GBP")) currency = "GBP";
  else if (stripped.includes("CAD") || stripped.includes("C$")) currency = "CAD";

  const numMatch = stripped.replace(/,/g, "").match(/\b(\d+)\b/);
  if (!numMatch) return {};

  const amount = parseInt(numMatch[1], 10);
  if (isNaN(amount) || amount <= 0) return {};

  return { prizePool: amount, currency };
}

// ---------------------------------------------------------------------------
// Helper: Map location string to canonical mode
// ---------------------------------------------------------------------------

export function mapDevpostMode(locationObj: DevpostDisplayedLocation | undefined): {
  mode: "online" | "in_person" | "hybrid";
  location?: string;
  city?: string;
} {
  if (!locationObj) {
    return { mode: "online" };
  }

  const loc = locationObj.location?.trim() || "";
  const lower = loc.toLowerCase();

  if (lower.includes("online") || locationObj.icon === "globe") {
    return { mode: "online" };
  }

  if (lower.includes("hybrid")) {
    return { mode: "hybrid", location: loc };
  }

  return {
    mode: "in_person",
    location: loc || undefined,
    city: loc || undefined,
  };
}

// ---------------------------------------------------------------------------
// DevpostConnector Implementation
// ---------------------------------------------------------------------------

const DEVPOST_API_BASE = "https://devpost.com/api/hackathons";

/** Maximum pages fetched per run (safety cap against unbounded pagination).
 *  25 pages × 9 per_page = 225 events max. */
const MAX_PAGES = 25;

export class DevpostConnector extends BaseConnector<DevpostRawEvent> {
  readonly name = "Devpost Connector";
  readonly version = "1.0.0";
  readonly source = "devpost";
  readonly description =
    "Fetches open and upcoming global hackathon listings from Devpost's public JSON REST API " +
    "(no authentication required). " +
    "Endpoint: GET /api/hackathons?status[]=open&status[]=upcoming";

  // ── Public entry point ────────────────────────────────────────────────────

  async fetch(): Promise<HackAtlasEvent[]> {
    const allEvents: HackAtlasEvent[] = [];

    // ── Page 1: get data + pagination metadata ────────────────────────────
    const firstPage = await this.fetchPage(1);
    const totalPages = Math.ceil(firstPage.total / (firstPage.perPage || 9));
    const lastPage = Math.min(totalPages || 1, MAX_PAGES);

    console.log(
      `[DevpostConnector] Total available: ${firstPage.total} hackathons ` +
        `across ${totalPages} page(s). ` +
        `Will fetch ${lastPage} page(s) (MAX_PAGES=${MAX_PAGES}).`
    );

    allEvents.push(...this.mapPage(firstPage.rawEvents, 1));

    // ── Pages 2…lastPage ─────────────────────────────────────────────────
    for (let page = 2; page <= lastPage; page++) {
      try {
        const result = await this.fetchPage(page);
        if (result.rawEvents.length === 0) break;
        allEvents.push(...this.mapPage(result.rawEvents, page));
      } catch (err) {
        // One failed page must not abort the entire connector run
        console.error(
          `[DevpostConnector] Page ${page}/${lastPage} failed — skipping: ` +
            (err instanceof Error ? err.message : String(err))
        );
      }
    }

    console.log(
      `[DevpostConnector] Pagination complete. ` +
        `${allEvents.length} mappable events collected across ${lastPage} page(s).`
    );

    return allEvents;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Fetch a single page from the Devpost API.
   * Enforces 30s timeout and standard browser User-Agent header.
   */
  private async fetchPage(page: number): Promise<{
    rawEvents: DevpostRawEvent[];
    total: number;
    perPage: number;
  }> {
    const url = new URL(DEVPOST_API_BASE);
    url.searchParams.append("status[]", "open");
    url.searchParams.append("status[]", "upcoming");
    url.searchParams.set("page", String(page));

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(
        `[DevpostConnector] HTTP ${response.status} ${response.statusText} — ` +
          `GET ${url.toString()}`
      );
    }

    let body: DevpostApiResponse;
    try {
      body = (await response.json()) as DevpostApiResponse;
    } catch {
      throw new Error(
        `[DevpostConnector] Failed to parse page ${page} API response as JSON.`
      );
    }

    const rawEvents = body?.hackathons;
    if (!Array.isArray(rawEvents)) {
      throw new Error(
        `[DevpostConnector] Page ${page}: unexpected response shape — hackathons is not an array.`
      );
    }

    return {
      rawEvents,
      total: body.meta?.total_count ?? 0,
      perPage: body.meta?.per_page ?? 9,
    };
  }

  /**
   * Map a page's raw events to HackAtlasEvents.
   * Per-event try/catch ensures malformed events are isolated without dropping the batch.
   */
  private mapPage(rawEvents: DevpostRawEvent[], page: number): HackAtlasEvent[] {
    const events: HackAtlasEvent[] = [];
    for (const raw of rawEvents) {
      try {
        const event = this.mapEvent(raw);
        if (event) events.push(event);
      } catch (err) {
        console.warn(
          `[DevpostConnector] Page ${page} — skipping event id=${raw?.id ?? "unknown"}: ` +
            (err instanceof Error ? err.message : String(err))
        );
      }
    }
    return events;
  }

  // ── Field Mapping ──────────────────────────────────────────────────────────

  private mapEvent(raw: DevpostRawEvent): HackAtlasEvent | null {
    // Guard: id and title are mandatory
    if (!raw.id || !raw.title?.trim()) {
      console.warn("[DevpostConnector] Skipping event with missing id or title:", raw);
      return null;
    }

    // ── Dates ────────────────────────────────────────────────────────────────
    const { startDate, endDate, registrationDeadline } = parseDevpostDates(
      raw.submission_period_dates
    );

    if (!startDate || !endDate) {
      console.warn(
        `[DevpostConnector] Skipping event id=${raw.id} — unparseable dates: "${raw.submission_period_dates}"`
      );
      return null;
    }

    // ── Description ─────────────────────────────────────────────────────────
    const organizer = raw.organization_name?.trim() || "Devpost Community";
    const themesList = (raw.themes ?? []).map((t) => t.name?.trim()).filter(Boolean);
    const description = `${raw.title.trim()} — Organized by ${organizer}.${
      themesList.length > 0 ? ` Themes: ${themesList.join(", ")}.` : ""
    }`;
    const shortDescription =
      description.length <= 200
        ? description
        : description.slice(0, 200).replace(/\s\S+$/, "") + "…";

    // ── Mode & Location ─────────────────────────────────────────────────────
    const { mode, location, city } = mapDevpostMode(raw.displayed_location);

    // ── Prize pool ───────────────────────────────────────────────────────────
    const { prizePool, currency } = parseDevpostPrize(raw.prize_amount);

    // ── Logo / Thumbnail ─────────────────────────────────────────────────────
    let logoUrl: string | undefined = undefined;
    if (raw.thumbnail_url?.trim()) {
      const thumb = raw.thumbnail_url.trim();
      logoUrl = thumb.startsWith("//") ? `https:${thumb}` : thumb;
    }

    // ── Tags & Tracks ────────────────────────────────────────────────────────
    const tracks = themesList;
    const tags = [
      ...themesList,
      raw.open_state?.toLowerCase(),
      raw.managed_by_devpost_badge ? "managed-by-devpost" : undefined,
    ].filter((t): t is string => Boolean(t && t.trim()));

    return {
      sourceId: String(raw.id),
      source: this.source,
      sourceUrl: raw.url?.trim() || `https://devpost.com/software/${raw.id}`,

      title: raw.title.trim(),
      description,
      shortDescription,

      organizerName: organizer,
      organizerLogo: undefined,
      organizerUrl: undefined,

      logoUrl,
      bannerUrl: undefined,

      startDate,
      endDate,
      registrationDeadline: registrationDeadline ?? undefined,

      mode,
      location,
      city,
      country: undefined,

      prizePool,
      currency: prizePool ? (currency || "USD") : undefined,

      teamSizeMin: undefined,
      teamSizeMax: undefined,
      participantCount: raw.registrations_count ?? undefined,

      tracks,
      tags: [...new Set(tags)],

      featured: Boolean(raw.featured),
    };
  }
}
