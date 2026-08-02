// =============================================================================
// HackAtlas Connector Framework — Canonical Types
//
// HackAtlasEvent is the ONE canonical shape every connector must output.
// Nothing downstream should depend on a connector's internal/raw format.
// =============================================================================

/**
 * The single canonical event type produced by every HackAtlas connector.
 * All fields map 1-to-1 with the Hackathon Prisma model; connectors are
 * responsible for filling as many fields as their source provides.
 */
export interface HackAtlasEvent {
  /** Unique identifier on the source platform (used for deduplication). */
  sourceId: string;

  /**
   * Slug-friendly identifier for the source platform.
   * Examples: "devpost" | "devfolio" | "mlh" | "unstop" | "mock"
   */
  source: string;

  /** Canonical URL for this hackathon on its source platform. */
  sourceUrl: string;

  // ── Content ────────────────────────────────────────────────────────────────

  title: string;
  description: string;
  shortDescription: string;

  // ── Organizer ──────────────────────────────────────────────────────────────

  organizerName: string;
  organizerLogo?: string;
  organizerUrl?: string;

  // ── Branding ───────────────────────────────────────────────────────────────

  logoUrl?: string;
  bannerUrl?: string;

  // ── Schedule (ISO 8601 strings — Normalizer converts to Date) ──────────────

  startDate: string;
  endDate: string;
  registrationDeadline?: string;

  // ── Format ─────────────────────────────────────────────────────────────────

  /**
   * Use Prisma enum values directly: "online" | "in_person" | "hybrid".
   * Connectors must map their source's terminology to these three values.
   */
  mode: "online" | "in_person" | "hybrid";

  /** Full location string, e.g. "San Francisco Convention Center". */
  location?: string;
  city?: string;
  country?: string;

  // ── Prizes ─────────────────────────────────────────────────────────────────

  /** Total prize pool in USD cents (avoids floating-point issues). */
  prizePool?: number;
  currency?: string;

  // ── Participation ──────────────────────────────────────────────────────────

  teamSizeMin?: number;
  teamSizeMax?: number;
  participantCount?: number;

  // ── Taxonomy ───────────────────────────────────────────────────────────────

  /** High-level tracks, e.g. ["AI/ML", "Web3", "Climate Tech"]. */
  tracks?: string[];

  /** Free-form tags, e.g. ["beginner-friendly", "no-experience-needed"]. */
  tags?: string[];

  // ── Curation ───────────────────────────────────────────────────────────────

  /** If true, this event is pinned to the top of the Discover feed. */
  featured?: boolean;
}

// =============================================================================
// Connector Metadata — for registry, health checks, and monitoring
// =============================================================================

/** Possible health states for a connector. */
export type ConnectorHealth = "healthy" | "degraded" | "error" | "unknown";

/**
 * Metadata every connector must expose.
 * Enables the ConnectorRegistry to provide a live status dashboard.
 */
export interface ConnectorMetadata {
  /** Human-readable name, e.g. "Mock Connector". */
  name: string;

  /** SemVer string, e.g. "1.0.0". */
  version: string;

  /**
   * Source slug this connector targets, e.g. "mock".
   * Must match the `source` field on every HackAtlasEvent it produces.
   */
  source: string;

  /** Description of what this connector does and how it fetches data. */
  description: string;

  /** ISO timestamp of the last successful run. Null if never run. */
  lastRunAt: string | null;

  /** How many events were returned in the last successful run. */
  lastRunCount: number | null;

  /** Current health state. */
  health: ConnectorHealth;

  /** Human-readable reason for degraded/error state. */
  healthMessage?: string;
}

// =============================================================================
// Ingestion Pipeline Types
// =============================================================================

/** Result from running a single connector through the pipeline. */
export interface ConnectorRunResult {
  source: string;
  connectorName: string;
  success: boolean;
  /** Number of raw events fetched by the connector. */
  eventsFound: number;
  /** Events newly inserted into the database. */
  inserted: number;
  /** Events updated (already existed, data was refreshed). */
  updated: number;
  /** Events that were identical duplicates — no DB write needed. */
  duplicates: number;
  /** Events that failed normalisation and were skipped. */
  skipped: number;
  /** Error message if the connector itself failed. */
  error?: string;
  /** Duration of this connector's run in milliseconds. */
  durationMs: number;
}

/** Top-level summary returned by POST /api/ingest. */
export interface IngestionSummary {
  /** ISO timestamp when the ingest run started. */
  startedAt: string;
  /** Total wall-clock duration of the full ingest run in ms. */
  totalDurationMs: number;
  /** Total connectors that were executed. */
  connectorsRun: number;
  /** Connectors that completed without throwing. */
  connectorsSucceeded: number;
  /** Connectors that threw an error (pipeline continued for others). */
  connectorsFailed: number;
  /** Per-connector breakdown. */
  results: ConnectorRunResult[];
}

/** Thrown by the Normalizer for a single malformed event. */
export class NormalizationError extends Error {
  constructor(
    message: string,
    public readonly field: string,
    public readonly event: Partial<HackAtlasEvent>
  ) {
    super(`[Normalizer] ${message} (field: "${field}")`);
    this.name = "NormalizationError";
  }
}
