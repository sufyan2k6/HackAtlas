import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Health check endpoint — useful for monitoring, uptime checks, and CI.
 */
export async function GET() {
  return NextResponse.json(
    {
      status: "ok",
      service: "hackradar-api",
      version: process.env.npm_package_version ?? "0.1.0",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
    },
    { status: 200 }
  );
}
