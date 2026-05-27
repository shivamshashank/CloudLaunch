"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Navigation from "../components/Navigation";
import { supabase } from "../lib/supabase";
import { Terminal, Shield, Activity, Server, ArrowRight, CheckCircle2, ChevronRight, Cpu } from "lucide-react";

export default function Home() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  const handleGoogleSignIn = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/dashboard` }
    });
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 tech-grid scanline overflow-hidden">
      {/* Background neon glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-cyan-500/10 blur-[120px] pointer-events-none animate-pulse-glow pointer-events-none animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[350px] h-[350px] rounded-full bg-pink-500/10 blur-[120px] pointer-events-none animate-pulse-glow pointer-events-none animate-pulse" />

      {/* Global Navigation */}
      <Navigation />

      {/* Hero section */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-16 md:py-24 space-y-20 relative z-10">
        
        {/* Main Hero Header */}
        <div className="flex flex-col items-center text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 text-xs font-mono">
            <Cpu className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '4s' }} /> Modern Devops & IaC Automation
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            AWS Environments <br />
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-pink-500 bg-clip-text text-transparent">
              Engineered In Seconds
            </span>
          </h1>

          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-lg">
            Provision infrastructure, match costs using Infracost modules, stream terminal-like deployment logs, and secure containers with least-privilege policies.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto pt-4">
            {user ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2"
              >
                Go to Control Dashboard
                <ArrowRight className="w-4 h-4 text-white" />
              </Link>
            ) : (
              <>
                <button
                  onClick={handleGoogleSignIn}
                  className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2 cursor-pointer"
                >
                  Configure AWS Cluster
                  <ArrowRight className="w-4 h-4 text-white" />
                </button>
                <Link
                  href="/about"
                  className="w-full sm:w-auto bg-slate-900 hover:bg-slate-850 text-slate-350 hover:text-white font-semibold py-3.5 px-8 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-1.5"
                >
                  Learn IaC Process
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all space-y-4">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-850 text-cyan-400 w-fit">
              <Terminal className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide">Automated IaC</h3>
            <p className="text-xs text-slate-450 leading-relaxed">
              Dynamically generates syntactically valid Terraform configurations based on customizable form inputs. Zero manual typing required.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all space-y-4">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-850 text-pink-400 w-fit">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide">Least-Privilege Security</h3>
            <p className="text-xs text-slate-450 leading-relaxed">
              Secures all created resources automatically. Mounts least-privilege IAM profiles and isolates subnets via NetworkPolicies.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 hover:border-slate-800 transition-all space-y-4">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-850 text-emerald-400 w-fit">
              <Activity className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white tracking-wide">Observability Pipelines</h3>
            <p className="text-xs text-slate-450 leading-relaxed">
              Standardizes SRE observabilities. Injects Prometheus telemetry agents, maps Loki logs, and generates Grafana metrics.
            </p>
          </div>
        </div>

        {/* Dynamic Platform Summary Stats */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <span className="text-3xl font-extrabold text-white font-mono">0.0ms</span>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">State Delay</p>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-extrabold text-cyan-400 font-mono">100%</span>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">GitOps Sync</p>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-extrabold text-pink-400 font-mono">12+</span>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Cloud Options</p>
          </div>
          <div className="space-y-1">
            <span className="text-3xl font-extrabold text-emerald-400 font-mono">Realtime</span>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono">Logs Streaming</p>
          </div>
        </div>

      </main>

      {/* Global Footer */}
      <footer className="py-8 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500 font-mono select-none">
        CloudLaunch Self-Service AWS GitOps Platform • Under MIT License.
      </footer>
    </div>
  );
}
