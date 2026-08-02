// =============================================================================
// HackAtlas Connector Framework — Normalizer
//
// Transforms HackAtlasEvent[] → validated Prisma-ready objects.
//
// Responsibilities:
//   1. Validate required fields (throws NormalizationError on hard failures)
//   2. Infer event status (upcoming / live / ended) from dates — NOT from connectors
//   3. Slugify titles with collision-resistant suffix
//   4. Coerce ISO strings → Date objects
//   5. Sanitise and trim all string fields
//
// The Normalizer is intentionally source-agnostic: it receives canonical
// HackAtlasEvents and produces Prisma-compatible shapes.
// =============================================================================

import { NormalizationError } from "./types";
import type { HackAtlasEvent } from "./types";

// =============================================================================
// Prisma-compatible output type
// (We avoid importing the full Prisma namespace here to keep this module
//  lightweight and testable in isolation.)
// =============================================================================

export interface NormalizedEvent {
  // Identity
  title: string;
  slug: string;
  source: string;
  sourceId: string;
  sourceUrl: string;

  // Content
  description: string;
  shortDescription: string;

  // Organizer
  organizerName: string;
  organizerLogo: string | null;
  organizerUrl: string | null;

  // Branding
  logoUrl: string | null;
  bannerUrl: string | null;

  // Schedule
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date | null;

  // Format
  mode: "online" | "in_person" | "hybrid";
  location: string | null;
  city: string | null;
  country: string | null;

  // Prizes
  prizePool: number | null;
  currency: string;

  // Participation
  teamSizeMin: number | null;
  teamSizeMax: number | null;
  participantCount: number | null;

  // Taxonomy
  tracks: string[];
  tags: string[];

  // Computed
  status: "upcoming" | "live" | "ended";
  featured: boolean;

  // Moderation
  submissionStatus: "approved";
}

// =============================================================================
// Status Inference — owner: Normalizer, not connectors
// =============================================================================

/**
 * Derives the hackathon's current status from its date window.
 *
 * Rules (evaluated against UTC now):
 *   - now < startDate               → "upcoming"
 *   - startDate ≤ now ≤ endDate     → "live"
 *   - now > endDate                 → "ended"
 */
function inferStatus(
  startDate: Date,
  endDate: Date
): "upcoming" | "live" | "ended" {
  const now = Date.now();
  const start = startDate.getTime();
  const end = endDate.getTime();

  if (now < start) return "upcoming";
  if (now >= start && now <= end) return "live";
  return "ended";
}

// =============================================================================
// Slug Generation
// =============================================================================

const SLUG_REGISTRY = new Set<string>();

/**
 * Generates a URL-safe slug from a title.
 * Appends the connector source as a suffix to prevent collisions across sources.
 *
 * e.g. "Global Hack 2025" + "devpost" → "global-hack-2025-devpost"
 */
function generateSlug(title: string, source: string, sourceId: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  // Primary candidate: title-source
  let slug = `${base}-${source}`;

  // Collision guard: append sourceId fragment if needed
  if (SLUG_REGISTRY.has(slug)) {
    const idFragment = sourceId.slice(0, 6).toLowerCase().replace(/\W/g, "");
    slug = `${base}-${source}-${idFragment}`;
  }

  SLUG_REGISTRY.add(slug);
  return slug;
}

// =============================================================================
// Field Validators
// =============================================================================

function requireString(
  value: unknown,
  field: string,
  event: Partial<HackAtlasEvent>
): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new NormalizationError(
      `Required string field is missing or empty`,
      field,
      event
    );
  }
  return value.trim();
}

function parseDate(
  value: string | undefined,
  field: string,
  event: Partial<HackAtlasEvent>,
  required: true
): Date;
function parseDate(
  value: string | undefined,
  field: string,
  event: Partial<HackAtlasEvent>,
  required: false
): Date | null;
function parseDate(
  value: string | undefined,
  field: string,
  event: Partial<HackAtlasEvent>,
  required: boolean
): Date | null {
  if (!value) {
    if (required) {
      throw new NormalizationError(
        `Required date field is missing`,
        field,
        event
      );
    }
    return null;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    throw new NormalizationError(
      `Invalid date string "${value}"`,
      field,
      event
    );
  }
  return d;
}

// =============================================================================
// NormalizationResult — wraps success or failure for a single event
// =============================================================================

export type NormalizationResult =
  | { ok: true; event: NormalizedEvent }
  | { ok: false; error: NormalizationError; raw: HackAtlasEvent };

// =============================================================================
// Public API
// =============================================================================

/**
 * Normalises a single raw HackAtlasEvent into a Prisma-ready NormalizedEvent.
 * Returns a discriminated union so callers can handle errors per-event
 * without halting the entire batch.
 */
export function normalizeEvent(raw: HackAtlasEvent): NormalizationResult {
  try {
    // ── Required string fields ────────────────────────────────────────────────
    const title = requireString(raw.title, "title", raw);
    const source = requireString(raw.source, "source", raw);
    const sourceId = requireString(raw.sourceId, "sourceId", raw);
    const sourceUrl = requireString(raw.sourceUrl, "sourceUrl", raw);
    const description = requireString(raw.description, "description", raw);
    const shortDesc = requireString(
      raw.shortDescription,
      "shortDescription",
      raw
    );
    const organizerName = requireString(
      raw.organizerName,
      "organizerName",
      raw
    );

    // ── Dates ─────────────────────────────────────────────────────────────────
    const startDate = parseDate(raw.startDate, "startDate", raw, true);
    const endDate = parseDate(raw.endDate, "endDate", raw, true);
    const registrationDeadline = parseDate(
      raw.registrationDeadline,
      "registrationDeadline",
      raw,
      false
    );

    // Sanity: start must be before end
    if (startDate >= endDate) {
      throw new NormalizationError(
        "startDate must be before endDate",
        "startDate",
        raw
      );
    }

    // ── Status (inferred here — connectors do NOT set this) ───────────────────
    const status = inferStatus(startDate, endDate);

    // ── Slug ──────────────────────────────────────────────────────────────────
    const slug = generateSlug(title, source, sourceId);

    // ── Mode — default to online if missing ───────────────────────────────────
    const mode: "online" | "in_person" | "hybrid" =
      raw.mode === "in_person" || raw.mode === "hybrid" ? raw.mode : "online";

    // ── Scalar optionals ──────────────────────────────────────────────────────
    const prizePool =
      typeof raw.prizePool === "number" && raw.prizePool > 0
        ? raw.prizePool
        : null;

    const normalised: NormalizedEvent = {
      title,
      slug,
      source,
      sourceId,
      sourceUrl,
      description,
      shortDescription: shortDesc,
      organizerName,
      organizerLogo: raw.organizerLogo?.trim() ?? null,
      organizerUrl: raw.organizerUrl?.trim() ?? null,
      logoUrl: raw.logoUrl?.trim() ?? null,
      bannerUrl: raw.bannerUrl?.trim() ?? null,
      startDate,
      endDate,
      registrationDeadline,
      mode,
      location: raw.location?.trim() ?? null,
      city: raw.city?.trim() ?? null,
      country: raw.country?.trim() ?? null,
      prizePool,
      currency: raw.currency?.trim() ?? "USD",
      teamSizeMin: raw.teamSizeMin ?? null,
      teamSizeMax: raw.teamSizeMax ?? null,
      participantCount: raw.participantCount ?? null,
      tracks: raw.tracks?.map((t) => t.trim()).filter(Boolean) ?? [],
      tags: raw.tags?.map((t) => t.trim()).filter(Boolean) ?? [],
      status,
      featured: raw.featured ?? false,
      submissionStatus: "approved",
    };

    return { ok: true, event: normalised };
  } catch (err) {
    if (err instanceof NormalizationError) {
      return { ok: false, error: err, raw };
    }
    // Re-wrap unexpected errors
    return {
      ok: false,
      error: new NormalizationError(
        err instanceof Error ? err.message : String(err),
        "unknown",
        raw
      ),
      raw,
    };
  }
}

/**
 * Normalise a batch of HackAtlasEvents.
 * Returns separate arrays for successes and failures — all events are
 * processed even when some fail.
 */
export function normalizeBatch(raws: HackAtlasEvent[]): {
  normalized: NormalizedEvent[];
  errors: Array<{ error: NormalizationError; raw: HackAtlasEvent }>;
} {
  const normalized: NormalizedEvent[] = [];
  const errors: Array<{ error: NormalizationError; raw: HackAtlasEvent }> = [];

  for (const raw of raws) {
    const result = normalizeEvent(raw);
    if (result.ok) {
      normalized.push(result.event);
    } else {
      errors.push({ error: result.error, raw: result.raw });
    }
  }

  return { normalized, errors };
}
