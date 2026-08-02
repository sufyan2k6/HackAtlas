// =============================================================================
// HackAtlas Connector Framework — ConnectorRegistry
//
// The single source of truth for all registered connectors.
// Adding a new connector = one .register() call.
// =============================================================================

import type { BaseConnector } from "./base";
import type { ConnectorMetadata, HackAtlasEvent } from "./types";

export interface RegistryRunResult {
  source: string;
  events: HackAtlasEvent[];
  error?: string;
  durationMs: number;
}

export class ConnectorRegistry {
  private readonly connectors = new Map<string, BaseConnector>();

  // ── Registration ──────────────────────────────────────────────────────────

  /**
   * Register a connector. Keyed by connector.source.
   * Registering a duplicate source overwrites the previous connector.
   */
  register(connector: BaseConnector): this {
    this.connectors.set(connector.source, connector);
    return this;
  }

  /** Convenience method for chaining multiple registrations. */
  registerAll(connectors: BaseConnector[]): this {
    for (const c of connectors) this.register(c);
    return this;
  }

  // ── Introspection ─────────────────────────────────────────────────────────

  /** Returns metadata for all registered connectors. */
  getMetadata(): ConnectorMetadata[] {
    return [...this.connectors.values()].map((c) => c.getMetadata());
  }

  /** Returns a single connector's metadata by source slug. */
  getConnectorMetadata(source: string): ConnectorMetadata | null {
    return this.connectors.get(source)?.getMetadata() ?? null;
  }

  get size(): number {
    return this.connectors.size;
  }

  // ── Execution ─────────────────────────────────────────────────────────────

  /**
   * Run all registered connectors in parallel.
   *
   * Key design: failures are ISOLATED. One connector erroring never prevents
   * the others from running. Errors are captured into RegistryRunResult so
   * the caller (ingestion route) can build a detailed summary report.
   */
  async runAll(): Promise<RegistryRunResult[]> {
    const runs = [...this.connectors.values()].map(
      async (connector): Promise<RegistryRunResult> => {
        const start = Date.now();
        try {
          const events = await connector.run();
          return {
            source: connector.source,
            events,
            durationMs: Date.now() - start,
          };
        } catch (err) {
          connector.markError(
            err instanceof Error ? err.message : String(err)
          );
          return {
            source: connector.source,
            events: [],
            error: err instanceof Error ? err.message : String(err),
            durationMs: Date.now() - start,
          };
        }
      }
    );

    return Promise.all(runs);
  }

  /**
   * Run a single connector by source slug.
   * Returns null if the source is not registered.
   */
  async runOne(source: string): Promise<RegistryRunResult | null> {
    const connector = this.connectors.get(source);
    if (!connector) return null;

    const start = Date.now();
    try {
      const events = await connector.run();
      return { source, events, durationMs: Date.now() - start };
    } catch (err) {
      connector.markError(err instanceof Error ? err.message : String(err));
      return {
        source,
        events: [],
        error: err instanceof Error ? err.message : String(err),
        durationMs: Date.now() - start,
      };
    }
  }
}
