// =============================================================================
// HackAtlas Connector — UnstopConnector
//
// Acquisition method: Public structured JSON REST API (no auth required).
//
// Confirmed endpoint (discovered 2026-08-10):
//   GET https://unstop.com/api/public/opportunity/search-result
//       ?opportunity=hackathons   ← MUST be plural; singular returns empty
//       &page=1
//       &per_page=15
//       &oppstatus=open
//       &sortBy=&orderBy=&filter_condition=
//
// First-batch policy: page 1, per_page=15 (bounded, safe for initial test).
// Pagination is supported by the API; increase or loop pages to scale up.
// =============================================================================

import { BaseConnector } from "../base";
import type { HackAtlasEvent } from "../types";

// ---------------------------------------------------------------------------
// Raw types — mirrors the confirmed Unstop JSON response shape
// ---------------------------------------------------------------------------

interface UnstopPrize {
  id: number;
  rank: string;
  cash: number | null;
  currency: string; // "fa-rupee" for INR
  currencyCode: string | null;
}

interface UnstopOrganisation {
  id: number;
  name: string;
  public_url: string;
  logoUrl: string | null;
  logoUrl2: string | null;
}

interface UnstopAddress {
  address: string | null;
  city: string | null;
  state: string | null;
  // country can be a plain string or a nested object; handle both
  country: string | Record<string, unknown> | null;
  country_code: string | null;
  state_code: string | null;
}

interface UnstopRegnRequirements {
  opportunity_id: number;
  start_regn_dt: string | null; // ISO 8601
  end_regn_dt: string | null;   // ISO 8601
  min_team_size: number | null;
  max_team_size: number | null;
  eligibility: string | null;   // JSON string or null
}

interface UnstopWorkFunction {
  id: number;
  name: string;
}

interface UnstopSkill {
  id: number;
  skill: string;
  skill_name: string;
}

interface UnstopFilter {
  id: number;
  name: string;
  type: string;
}

interface UnstopRawEvent {
  id: number;
  public_url: string;
  title: string;
  type: string;
  region: string;      // "online" | "offline" | "hybrid"
  visibility: string;
  details: string;     // HTML content
  logoUrl2: string | null;
  organisation: UnstopOrganisation;
  seo_url: string;
  status: string;
  prizes: UnstopPrize[];
  address_with_country_logo: UnstopAddress;
  workfunction: UnstopWorkFunction[];
  required_skills: UnstopSkill[];
  filters: UnstopFilter[];
  end_date: string | null;      // ISO 8601
  registerCount: number | null;
  regnRequirements: UnstopRegnRequirements;
  updated_at: string;
}

interface UnstopApiResponse {
  data: {
    current_page: number;
    data: UnstopRawEvent[];
    last_page: number;
    total: number;
    next_page_url: string | null;
  };
}

// ---------------------------------------------------------------------------
// HTML stripping — removes HTML tags from Unstop's `details` field.
// Kept minimal: regex-based, no external deps, good enough for descriptions.
// ---------------------------------------------------------------------------

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")        // Replace tags with space
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&ndash;/g, "–")
    .replace(/&mdash;/g, "—")
    .replace(/&rarr;/g, "→")
    .replace(/&nbsp;/g, " ")
    .replace(/\s{2,}/g, " ")         // Collapse multiple spaces
    .trim();
}

// ---------------------------------------------------------------------------
// Mode mapping — Unstop uses "online" | "offline" | others
// ---------------------------------------------------------------------------

function mapMode(region: string): "online" | "in_person" | "hybrid" {
  const r = region?.toLowerCase?.() ?? "";
  if (r === "offline") return "in_person";
  if (r === "hybrid") return "hybrid";
  return "online"; // "online" or unknown → default online
}

// ---------------------------------------------------------------------------
// Prize pool — sum all cash prizes (in INR), return as integer INR paise
// (prizePool is stored in currency's smallest unit; for USD it's cents.
//  For INR we store as integer rupees since there's no paise in hackathon prizes.)
// ---------------------------------------------------------------------------

function sumPrizePool(prizes: UnstopPrize[]): number | undefined {
  if (!prizes || prizes.length === 0) return undefined;
  const total = prizes.reduce((acc, p) => acc + (p.cash ?? 0), 0);
  return total > 0 ? total : undefined;
}

// ---------------------------------------------------------------------------
// UnstopConnector
// ---------------------------------------------------------------------------

const UNSTOP_API_BASE =
  "https://unstop.com/api/public/opportunity/search-result";

/** Maximum pages fetched per run. Safety cap against a broken API returning a
 *  huge last_page value. 20 pages × 15 per_page = 300 events — comfortably
 *  above Unstop's current open hackathon count. */
const MAX_PAGES = 20;

/** Results per page — Unstop supports up to 20; 15 is confirmed stable. */
const PER_PAGE = 15;

export class UnstopConnector extends BaseConnector<UnstopRawEvent> {
  readonly name = "Unstop Connector";
  readonly version = "2.0.0";
  readonly source = "unstop";
  readonly description =
    "Fetches ALL open Indian hackathon listings from Unstop's public JSON REST API " +
    "(no authentication required). Paginates automatically using last_page from the " +
    "API response (capped at MAX_PAGES=" + MAX_PAGES + " for safety). " +
    "Endpoint: GET /api/public/opportunity/search-result?opportunity=hackathons";

  // ── Public entry point ────────────────────────────────────────────────────

  /**
   * Fetches every page of open hackathons from Unstop and returns a flat
   * array of canonical HackAtlasEvents.
   *
   * Strategy:
   *   1. Fetch page 1 to learn last_page (total pages from the API).
   *   2. Cap at MAX_PAGES to protect against a broken API.
   *   3. Fetch pages 2…N in sequence (Unstop is rate-limit-sensitive).
   *   4. Accumulate and return all successfully mapped events.
   *
   * Failures on individual pages are logged and skipped; they do not abort
   * the run so a transient network hiccup on page 3 doesn't lose pages 4+.
   */
  async fetch(): Promise<HackAtlasEvent[]> {
    const allEvents: HackAtlasEvent[] = [];

    // ── Page 1: get data + pagination metadata ────────────────────────────
    const firstPage = await this.fetchPage(1);
    const lastPage = Math.min(firstPage.lastPage, MAX_PAGES);

    console.log(
      `[UnstopConnector] Total available: ${firstPage.total} hackathons ` +
        `across ${firstPage.lastPage} page(s). ` +
        `Will fetch ${lastPage} page(s) (MAX_PAGES=${MAX_PAGES}, PER_PAGE=${PER_PAGE}).`
    );

    allEvents.push(...this.mapPage(firstPage.rawEvents, 1));

    // ── Pages 2…lastPage ─────────────────────────────────────────────────
    for (let page = 2; page <= lastPage; page++) {
      try {
        const result = await this.fetchPage(page);
        allEvents.push(...this.mapPage(result.rawEvents, page));
      } catch (err) {
        // One failed page must not abort the whole run
        console.error(
          `[UnstopConnector] Page ${page}/${lastPage} failed — skipping: ` +
            (err instanceof Error ? err.message : String(err))
        );
      }
    }

    console.log(
      `[UnstopConnector] Pagination complete. ` +
        `${allEvents.length} mappable events collected across ${lastPage} page(s).`
    );

    return allEvents;
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Fetch a single page from the Unstop API.
   * Preserves the original request config: 30s timeout, same headers, same
   * query params. Throws on HTTP errors or malformed JSON.
   */
  private async fetchPage(page: number): Promise<{
    rawEvents: UnstopRawEvent[];
    lastPage: number;
    total: number;
  }> {
    const url = new URL(UNSTOP_API_BASE);
    url.searchParams.set("opportunity", "hackathons"); // plural — critical
    url.searchParams.set("page", String(page));
    url.searchParams.set("per_page", String(PER_PAGE));
    url.searchParams.set("oppstatus", "open");
    url.searchParams.set("sortBy", "");
    url.searchParams.set("orderBy", "");
    url.searchParams.set("filter_condition", "");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (compatible; HackAtlas/1.0; +https://unstop.com)",
      },
      // 30-second timeout per page request (unchanged from v1)
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(
        `[UnstopConnector] HTTP ${response.status} ${response.statusText} — ` +
          `GET ${url.toString()}`
      );
    }

    let body: UnstopApiResponse;
    try {
      body = (await response.json()) as UnstopApiResponse;
    } catch {
      throw new Error(
        `[UnstopConnector] Failed to parse page ${page} API response as JSON.`
      );
    }

    const rawEvents = body?.data?.data;
    if (!Array.isArray(rawEvents)) {
      throw new Error(
        `[UnstopConnector] Page ${page}: unexpected response shape — data.data is not an array.`
      );
    }

    console.log(
      `[UnstopConnector] Page ${page}/${body.data.last_page ?? "?"}: ` +
        `received ${rawEvents.length} raw event(s).`
    );

    return {
      rawEvents,
      lastPage: body.data.last_page ?? 1,
      total: body.data.total ?? 0,
    };
  }

  /**
   * Map a page's raw events to HackAtlasEvents.
   * Per-event try/catch: one malformed record never breaks the batch.
   */
  private mapPage(rawEvents: UnstopRawEvent[], page: number): HackAtlasEvent[] {
    const events: HackAtlasEvent[] = [];
    for (const raw of rawEvents) {
      try {
        const event = this.mapEvent(raw);
        if (event) events.push(event);
      } catch (err) {
        console.warn(
          `[UnstopConnector] Page ${page} — skipping event id=${raw?.id ?? "unknown"}: ` +
            (err instanceof Error ? err.message : String(err))
        );
      }
    }
    return events;
  }



  private mapEvent(raw: UnstopRawEvent): HackAtlasEvent | null {
    // Guard: id and title are mandatory
    if (!raw.id || !raw.title?.trim()) {
      console.warn(
        "[UnstopConnector] Skipping event with missing id or title:",
        raw
      );
      return null;
    }

    // ── Description ─────────────────────────────────────────────────────────
    const descriptionFull = raw.details ? stripHtml(raw.details) : raw.title;
    // shortDescription = first ≤200 chars, ending at word boundary
    const shortDescription =
      descriptionFull.length <= 200
        ? descriptionFull
        : descriptionFull.slice(0, 200).replace(/\s\S+$/, "") + "…";

    // ── Dates ────────────────────────────────────────────────────────────────
    //
    // Unstop's date fields:
    //   regnRequirements.start_regn_dt  — when registration opened
    //   regnRequirements.end_regn_dt    — when registration closes
    //   end_date                        — when the hackathon itself ends
    //
    // HackAtlasEvent mapping:
    //   startDate            = regnRequirements.start_regn_dt (event begins for participants)
    //   endDate              = end_date (hackathon end; fallback = end_regn_dt)
    //   registrationDeadline = regnRequirements.end_regn_dt

    const startDateRaw = raw.regnRequirements?.start_regn_dt ?? null;
    const endDateRaw =
      raw.end_date ?? raw.regnRequirements?.end_regn_dt ?? null;
    const regDeadlineRaw = raw.regnRequirements?.end_regn_dt ?? null;

    // startDate is required by the Normalizer — skip event if missing
    if (!startDateRaw) {
      console.warn(
        `[UnstopConnector] Skipping event id=${raw.id} — missing start date.`
      );
      return null;
    }

    // endDate is required — use regDeadline as fallback
    if (!endDateRaw) {
      console.warn(
        `[UnstopConnector] Skipping event id=${raw.id} — missing end date.`
      );
      return null;
    }

    // ── Prize pool ───────────────────────────────────────────────────────────
    // Stored as INR amount (integer). Currency tag is "INR".
    const prizePool = sumPrizePool(raw.prizes);

    // ── Organizer URL ────────────────────────────────────────────────────────
    const organizerUrl = raw.organisation?.public_url
      ? `https://unstop.com/${raw.organisation.public_url}`
      : undefined;

    // ── Tracks (from workfunction) & Tags (from skills + eligibility) ────────
    const tracks = (raw.workfunction ?? [])
      .map((w) => w.name?.trim())
      .filter(Boolean);

    const skillTags = (raw.required_skills ?? [])
      .map((s) => s.skill_name?.trim() ?? s.skill?.trim())
      .filter(Boolean);

    const eligibilityTags = (raw.filters ?? [])
      .filter((f) => f.type === "eligible")
      .map((f) => f.name?.trim())
      .filter((n) => n && n !== "All");

    const tags = [...new Set([...skillTags, ...eligibilityTags])];

    const addr = raw.address_with_country_logo;
    const city = typeof addr?.city === "string" ? addr.city.trim() || null : null;
    // country can be a string or nested object — extract safely
    const countryRaw = addr?.country;
    const country =
      typeof countryRaw === "string"
        ? countryRaw.trim() || null
        : typeof addr?.country_code === "string"
        ? addr.country_code.trim() || null
        : null;
    const stateRaw = addr?.state;
    const state = typeof stateRaw === "string" ? stateRaw.trim() || null : null;
    const addressRaw = addr?.address;
    const address = typeof addressRaw === "string" ? addressRaw.trim() || null : null;
    const location =
      [address, city, state, country].filter(Boolean).join(", ") || null;

    return {
      sourceId: String(raw.id),
      source: this.source,
      sourceUrl: raw.seo_url ?? `https://unstop.com/${raw.public_url}`,

      title: raw.title.trim(),
      description: descriptionFull,
      shortDescription,

      organizerName: raw.organisation?.name?.trim() ?? "Unknown Organizer",
      organizerLogo:
        raw.organisation?.logoUrl2 ?? raw.organisation?.logoUrl ?? undefined,
      organizerUrl,

      logoUrl: raw.logoUrl2 ?? undefined,
      bannerUrl: undefined, // Unstop doesn't expose a separate banner URL

      startDate: startDateRaw,
      endDate: endDateRaw,
      registrationDeadline: regDeadlineRaw ?? undefined,

      mode: mapMode(raw.region),
      location: location ?? undefined,
      city: city ?? undefined,
      country: country ?? undefined,

      prizePool,
      currency: prizePool ? "INR" : undefined,

      teamSizeMin: raw.regnRequirements?.min_team_size ?? undefined,
      teamSizeMax: raw.regnRequirements?.max_team_size ?? undefined,
      participantCount: raw.registerCount ?? undefined,

      tracks: tracks as string[],
      tags: tags as string[],

      featured: false,
    };
  }
}
