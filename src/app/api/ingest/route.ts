// =============================================================================
// HackAtlas Connector Framework — Ingestion API Route
//
// POST /api/ingest  — trigger the full ingestion pipeline
// GET  /api/ingest  — health check / connector registry status
//
// Auth: Bearer token matching process.env.INGEST_SECRET
// =============================================================================

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ConnectorRegistry } from "@/connectors/registry";
import { normalizeBatch } from "@/connectors/normalizer";
import { UnstopConnector } from "@/connectors/unstop/UnstopConnector";
import type {
  ConnectorRunResult,
  IngestionSummary,
} from "@/connectors/types";

// =============================================================================
// Registry — add new connectors here as the platform grows
// =============================================================================

function buildRegistry(): ConnectorRegistry {
  return new ConnectorRegistry().registerAll([
    new UnstopConnector(), // Real Connector #1 — Unstop (India)
    // new MockConnector(),   // uncomment to re-enable for framework testing
    // new DevpostConnector(),
    // new MLHConnector(),
  ]);
}

// =============================================================================
// Auth Guard
// =============================================================================

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.INGEST_SECRET;

  // If no secret is set in env, block all requests in production and warn in dev
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        "[Ingest] INGEST_SECRET is not set — blocking request in production."
      );
      return false;
    }
    // Development convenience: allow if secret is explicitly unset
    console.warn(
      "[Ingest] INGEST_SECRET not set — allowing request in development mode."
    );
    return true;
  }

  const authHeader = req.headers.get("authorization") ?? "";
  const [scheme, token] = authHeader.split(" ");
  return scheme === "Bearer" && token === secret;
}

// =============================================================================
// Database Upsert (findFirst + create/update — no schema migration needed)
// =============================================================================

interface UpsertResult {
  action: "inserted" | "updated" | "duplicate";
}

async function upsertEvent(event: ReturnType<typeof normalizeBatch>["normalized"][number]): Promise<UpsertResult> {
  // Look up existing record by (source, sourceId)
  const existing = await db.hackathon.findFirst({
    where: {
      source: event.source,
      sourceId: event.sourceId,
    },
    select: {
      id: true,
      updatedAt: true,
      slug: true,
    },
  });

  if (!existing) {
    // New event — insert
    await db.hackathon.create({
      data: {
        title: event.title,
        slug: event.slug,
        source: event.source,
        sourceId: event.sourceId,
        sourceUrl: event.sourceUrl,
        description: event.description,
        shortDescription: event.shortDescription,
        organizerName: event.organizerName,
        organizerLogo: event.organizerLogo,
        organizerUrl: event.organizerUrl,
        logoUrl: event.logoUrl,
        bannerUrl: event.bannerUrl,
        startDate: event.startDate,
        endDate: event.endDate,
        registrationDeadline: event.registrationDeadline,
        mode: event.mode,
        location: event.location,
        city: event.city,
        country: event.country,
        prizePool: event.prizePool,
        currency: event.currency,
        teamSizeMin: event.teamSizeMin,
        teamSizeMax: event.teamSizeMax,
        participantCount: event.participantCount,
        tracks: event.tracks,
        tags: event.tags,
        status: event.status,
        featured: event.featured,
        submissionStatus: event.submissionStatus,
      },
    });
    return { action: "inserted" };
  }

  // Existing — always refresh status (it may have changed since last ingest)
  // and update mutable fields. Slug is preserved to avoid broken URLs.
  await db.hackathon.update({
    where: { id: existing.id },
    data: {
      title: event.title,
      sourceUrl: event.sourceUrl,
      description: event.description,
      shortDescription: event.shortDescription,
      organizerName: event.organizerName,
      organizerLogo: event.organizerLogo,
      organizerUrl: event.organizerUrl,
      logoUrl: event.logoUrl,
      bannerUrl: event.bannerUrl,
      startDate: event.startDate,
      endDate: event.endDate,
      registrationDeadline: event.registrationDeadline,
      mode: event.mode,
      location: event.location,
      city: event.city,
      country: event.country,
      prizePool: event.prizePool,
      currency: event.currency,
      teamSizeMin: event.teamSizeMin,
      teamSizeMax: event.teamSizeMax,
      participantCount: event.participantCount,
      tracks: event.tracks,
      tags: event.tags,
      status: event.status,   // ← re-inferred by Normalizer every run
      featured: event.featured,
    },
  });

  return { action: "updated" };
}

// =============================================================================
// POST /api/ingest — Run the full pipeline
// =============================================================================

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized — valid Bearer token required." },
      { status: 401 }
    );
  }

  const pipelineStart = Date.now();
  const startedAt = new Date().toISOString();
  const registry = buildRegistry();

  // ── Step 1: Run all connectors in parallel (failures isolated per connector)
  const registryResults = await registry.runAll();

  // ── Step 2: Process each connector's events through the pipeline
  const connectorResults: ConnectorRunResult[] = [];

  for (const run of registryResults) {
    const connectorStart = Date.now();

    // Connector itself failed — record and continue
    if (run.error) {
      connectorResults.push({
        source: run.source,
        connectorName: run.source,
        success: false,
        eventsFound: 0,
        inserted: 0,
        updated: 0,
        duplicates: 0,
        skipped: 0,
        error: run.error,
        durationMs: run.durationMs,
      });
      continue;
    }

    // ── Step 2a: Normalise
    const { normalized, errors: normErrors } = normalizeBatch(run.events);

    // ── Step 2b: Upsert each normalised event
    let inserted = 0;
    let updated = 0;
    let duplicates = 0;
    const dbErrors: string[] = [];

    for (const event of normalized) {
      try {
        const { action } = await upsertEvent(event);
        if (action === "inserted") inserted++;
        else if (action === "updated") updated++;
        else duplicates++;
      } catch (err) {
        dbErrors.push(
          `[${event.sourceId}] ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    // Log any DB errors but don't crash the connector result
    if (dbErrors.length > 0) {
      console.error(
        `[Ingest][${run.source}] DB errors:`,
        dbErrors.join("\n")
      );
    }

    connectorResults.push({
      source: run.source,
      connectorName: run.source,
      success: true,
      eventsFound: run.events.length,
      inserted,
      updated,
      duplicates,
      skipped: normErrors.length + dbErrors.length,
      durationMs: Date.now() - connectorStart,
      ...(normErrors.length > 0 || dbErrors.length > 0
        ? {
            error: [
              ...normErrors.map((e) => `[NormError] ${e.error.message}`),
              ...dbErrors,
            ].join("; "),
          }
        : {}),
    });
  }

  // ── Step 3: Build summary
  const summary: IngestionSummary = {
    startedAt,
    totalDurationMs: Date.now() - pipelineStart,
    connectorsRun: connectorResults.length,
    connectorsSucceeded: connectorResults.filter((r) => r.success).length,
    connectorsFailed: connectorResults.filter((r) => !r.success).length,
    results: connectorResults,
  };

  console.log(
    `[Ingest] Run complete in ${summary.totalDurationMs}ms — ` +
      `${summary.connectorsSucceeded}/${summary.connectorsRun} connectors succeeded, ` +
      `${connectorResults.reduce((a, r) => a + r.inserted, 0)} inserted, ` +
      `${connectorResults.reduce((a, r) => a + r.updated, 0)} updated`
  );

  return NextResponse.json(summary, { status: 200 });
}

// =============================================================================
// GET /api/ingest — Connector registry health / metadata
// =============================================================================

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!isAuthorized(req)) {
    return NextResponse.json(
      { error: "Unauthorized — valid Bearer token required." },
      { status: 401 }
    );
  }

  const registry = buildRegistry();

  return NextResponse.json(
    {
      registeredConnectors: registry.size,
      connectors: registry.getMetadata(),
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
