// =============================================================================
// HackAtlas Connector Framework — BaseConnector Abstract Class
//
// Every connector — regardless of data source — extends this class and
// implements exactly ONE method: fetch().
//
// Adding a new source to HackAtlas means:
//   1. Create a new file, e.g. src/connectors/devpost/DevpostConnector.ts
//   2. extend BaseConnector<YourRawType>
//   3. implement fetch() → HackAtlasEvent[]
//   4. Register it: registry.register(new DevpostConnector())
//   Done.
// =============================================================================

import type {
  HackAtlasEvent,
  ConnectorMetadata,
  ConnectorHealth,
} from "./types";

/**
 * Abstract base class for all HackAtlas data source connectors.
 *
 * @template TRaw — The raw shape of data returned by this connector's source.
 *                  Connectors transform TRaw → HackAtlasEvent[] in fetch().
 *                  Keeping it typed prevents leaking source-specific shapes
 *                  into the rest of the pipeline.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export abstract class BaseConnector<TRaw = unknown> {
  // ── Required metadata — subclasses must provide these ─────────────────────

  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly source: string;
  abstract readonly description: string;

  // ── Runtime state — managed by BaseConnector ───────────────────────────────

  protected _lastRunAt: string | null = null;
  protected _lastRunCount: number | null = null;
  protected _health: ConnectorHealth = "unknown";
  protected _healthMessage: string | undefined = undefined;

  // ── Core contract ──────────────────────────────────────────────────────────

  /**
   * Fetch raw data from the source and return an array of canonical
   * HackAtlasEvent objects.
   *
   * Implementations MUST:
   *   - Never throw for "no results" (return [])
   *   - Throw only for unrecoverable errors (network failure, auth error)
   *   - Set `source` on every event to match this.source
   */
  abstract fetch(): Promise<HackAtlasEvent[]>;

  // ── Optional hooks — override as needed ───────────────────────────────────

  /**
   * Called before fetch() — use for auth token refresh, rate-limit checks, etc.
   * Return false to abort the run (connector will be marked as degraded).
   */
  protected async beforeFetch(): Promise<boolean> {
    return true;
  }

  /**
   * Called after a successful fetch() — use for cleanup, logging, etc.
   */
  protected async afterFetch(
    _events: HackAtlasEvent[] // eslint-disable-line @typescript-eslint/no-unused-vars
  ): Promise<void> {
    // no-op by default
  }

  // ── Orchestrated run — called by the ingestion pipeline ───────────────────

  /**
   * Execute the full connector lifecycle:
   * beforeFetch → fetch → afterFetch → update metadata
   *
   * This is what the ConnectorRegistry calls, NOT fetch() directly.
   * All errors bubble up; the caller (ingestion route) is responsible for
   * isolating failures so one bad connector doesn't kill the pipeline.
   */
  async run(): Promise<HackAtlasEvent[]> {
    const ready = await this.beforeFetch();
    if (!ready) {
      this._health = "degraded";
      this._healthMessage = "beforeFetch() returned false — run aborted";
      throw new Error(this._healthMessage);
    }

    const events = await this.fetch();

    await this.afterFetch(events);

    // Update runtime metadata on success
    this._lastRunAt = new Date().toISOString();
    this._lastRunCount = events.length;
    this._health = "healthy";
    this._healthMessage = undefined;

    return events;
  }

  // ── Metadata snapshot ──────────────────────────────────────────────────────

  /**
   * Returns a ConnectorMetadata snapshot — safe to serialise to JSON.
   * Called by GET /api/ingest for health dashboards.
   */
  getMetadata(): ConnectorMetadata {
    return {
      name: this.name,
      version: this.version,
      source: this.source,
      description: this.description,
      lastRunAt: this._lastRunAt,
      lastRunCount: this._lastRunCount,
      health: this._health,
      healthMessage: this._healthMessage,
    };
  }

  // ── Utility helpers — available to all subclasses ──────────────────────────

  /**
   * Mark this connector as errored and store the reason.
   * Called automatically by the ingestion pipeline; connectors can also
   * call it internally in extreme edge cases.
   */
  markError(message: string): void {
    this._health = "error";
    this._healthMessage = message;
  }
}
