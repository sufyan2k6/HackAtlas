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

export class UnstopConnector extends BaseConnector<UnstopRawEvent> {
  readonly name = "Unstop Connector";
  readonly version = "1.0.0";
  readonly source = "unstop";
  readonly description =
    "Fetches live Indian hackathon listings from Unstop's public JSON REST API " +
    "(no authentication required). " +
    "Endpoint: GET /api/public/opportunity/search-result?opportunity=hackathons";

  /**
   * Fetches up to 15 open hackathons from Unstop (page 1).
   *
   * Key discovery: `opportunity=hackathons` (plural) must be used;
   * the singular form returns an empty result set.
   *
   * Per-event try/catch ensures one malformed record never breaks the batch.
   */
  async fetch(): Promise<HackAtlasEvent[]> {
    const url = new URL(UNSTOP_API_BASE);
    url.searchParams.set("opportunity", "hackathons"); // plural — critical
    url.searchParams.set("page", "1");
    url.searchParams.set("per_page", "15");
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
      // 30-second timeout via AbortController
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
        "[UnstopConnector] Failed to parse API response as JSON."
      );
    }

    const rawEvents = body?.data?.data;
    if (!Array.isArray(rawEvents)) {
      throw new Error(
        "[UnstopConnector] Unexpected response shape — data.data is not an array."
      );
    }

    console.log(
      `[UnstopConnector] Fetched ${rawEvents.length} raw events ` +
        `(total available: ${body.data.total ?? "unknown"}, ` +
        `page 1 of ${body.data.last_page ?? "?"})`
    );

    const events: HackAtlasEvent[] = [];

    for (const raw of rawEvents) {
      try {
        const event = this.mapEvent(raw);
        if (event) events.push(event);
      } catch (err) {
        // One bad event must not break the batch
        console.warn(
          `[UnstopConnector] Skipping event id=${raw?.id ?? "unknown"}: ` +
            (err instanceof Error ? err.message : String(err))
        );
      }
    }

    return events;
  }

  // ── Field Mapping ──────────────────────────────────────────────────────────

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
