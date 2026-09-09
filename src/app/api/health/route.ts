import { NextResponse } from "next/server";
import { getDbPool } from "@/src/lib/db";

export async function GET() {
  try {
    const pool = getDbPool();
    // Simple fast ping query to verify database connection
    await pool.query("SELECT 1");

    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        service: "operis",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Database connectivity check failed",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
