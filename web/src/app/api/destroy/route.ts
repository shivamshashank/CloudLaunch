import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runDestroyJob } from "@/lib/deployment/engine";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getSupabaseClient(token: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (serviceRoleKey) {
    return createClient(supabaseUrl, serviceRoleKey);
  }

  return createClient(supabaseUrl, anonKey, {
    global: { headers: token ? { Authorization: `Bearer ${token}` } : {} },
  });
}

export async function POST(request: Request) {
  try {
    const { deploymentId } = await request.json();

    if (!deploymentId) {
      return NextResponse.json({ success: false, error: "Missing deploymentId." }, { status: 400 });
    }

    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.split(" ")[1] || "";
    if (!token) {
      return NextResponse.json({ success: false, error: "Missing Supabase auth token." }, { status: 401 });
    }

    const supabase = getSupabaseClient(token);

    const { data: job, error: jobError } = await supabase.from("deployment_jobs").insert({
      deployment_id: deploymentId,
      job_type: "destroy",
      status: "queued",
      payload: {},
    }).select("id").maybeSingle();

    if (jobError) {
      await supabase.from("deployment_logs").insert({
        deployment_id: deploymentId,
        level: "WARN",
        message: `Deployment job table is not ready yet: ${jobError.message}. Continuing with inline destroy worker.`,
      });
    }

    runDestroyJob({ deploymentId, jobId: job?.id, supabase }).catch((error) => {
      console.error(`[CloudLaunch] Destroy job crashed: ${error instanceof Error ? error.message : String(error)}`);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown destroy API error.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
