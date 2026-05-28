import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type LogLevel = "INFO" | "WARN" | "SUCCESS" | "ERROR";

function validLevel(level: unknown): LogLevel {
  return level === "WARN" || level === "SUCCESS" || level === "ERROR" ? level : "INFO";
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.split(" ")[1] || "";
    const expectedToken = process.env.CLOUDLAUNCH_LOG_INGEST_TOKEN || process.env.SUPABASE_SERVICE_ROLE_KEY || "local-dev-log-ingest-token";

    if (token !== expectedToken) {
      return NextResponse.json({ success: false, error: "Unauthorized log ingest request." }, { status: 401 });
    }

    const { deploymentId, level, message } = await request.json();

    if (!deploymentId || !message) {
      return NextResponse.json({ success: false, error: "Missing deploymentId or message." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from("deployment_logs").insert({
      deployment_id: deploymentId,
      level: validLevel(level),
      message: String(message).slice(0, 4000),
      timestamp: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown log ingest error.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
