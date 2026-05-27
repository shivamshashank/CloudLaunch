"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "../../components/Navigation";
import { supabase, Deployment } from "../../lib/supabase";
import Link from "next/link";
import { 
  Server, Shield, Cpu, Activity, TrendingUp, DollarSign, 
  ArrowRight, Layers, Plus, Terminal, RefreshCw 
} from "lucide-react";

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deployments, setDeployments] = useState<Deployment[]>([]);

  // Auth Guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/");
      } else {
        setUser(user);
        setLoading(false);
      }
    });
  }, [router]);

  // Load Deployments count and total costs
  useEffect(() => {
    if (user) {
      supabase.from("deployments").select("*").then(({ data }) => {
        if (data) setDeployments(data);
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-350 font-mono text-sm gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
        DECRYPTING CONSOLE AUTHORIZATION...
      </div>
    );
  }

  // Aggregate Stats
  const activeCount = deployments.filter((d) => d.status === "deployed").length;
  const totalMonthlyCost = deployments.reduce((acc, d) => acc + (d.status === "deployed" ? Number(d.cost_estimate_monthly) : 0), 0);
  const totalHourlyCost = totalMonthlyCost / 720;
  const totalConfigured = deployments.length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 tech-grid scanline overflow-hidden">
      {/* Navigation */}
      <Navigation />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-6 py-12 space-y-10 relative z-10">
        
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/20 border border-slate-900 rounded-2xl p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[200px] h-[200px] rounded-full bg-cyan-500/5 blur-[50px] pointer-events-none" />
          <div className="space-y-2">
            <h1 className="text-2xl md:text-3xl font-extrabold text-white leading-tight tracking-wide">
              Welcome back, Commander
            </h1>
            <p className="text-xs md:text-sm text-slate-400 max-w-lg">
              Manage your AWS GitOps environments, spin up active compute clusters, monitor live Prometheus pipelines, and track organizational cloud spending.
            </p>
          </div>
          
          <Link
            href="/dashboard/new"
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center gap-1.5 cursor-pointer flex-shrink-0"
          >
            <Plus className="w-4 h-4 text-white" />
            Configure New Environment
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1 */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-550 font-mono uppercase tracking-widest">Active Clusters</span>
              <div className="text-3xl font-black text-white font-mono">{activeCount}</div>
            </div>
            <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/40 text-cyan-400">
              <Server className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-550 font-mono uppercase tracking-widest">Monthly Cost</span>
              <div className="text-3xl font-black text-emerald-400 font-mono flex items-baseline">
                <DollarSign className="w-5 h-5 text-emerald-400 self-center" />
                {totalMonthlyCost.toFixed(2)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-550 font-mono uppercase tracking-widest">Hourly Cost</span>
              <div className="text-3xl font-black text-slate-200 font-mono flex items-baseline">
                <DollarSign className="w-4 h-4 text-slate-400 self-center" />
                {totalHourlyCost.toFixed(4)}
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-850 text-slate-400">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4 */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-550 font-mono uppercase tracking-widest">Total Configs</span>
              <div className="text-3xl font-black text-white font-mono">{totalConfigured}</div>
            </div>
            <div className="p-3 rounded-xl bg-pink-950/40 border border-pink-800/40 text-pink-400">
              <Layers className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Dynamic Panels Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Quick Actions Shortcuts */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <Shield className="w-5 h-5 text-cyan-400" /> Secure Cloud Launch Center
              </h2>
              <p className="text-xs text-slate-450 leading-relaxed">
                Spin up a new development environment, examine dynamically built Terraform HCL configurations, and track real-time outputs from apply and teardown execution log pipes.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Link
                href="/dashboard/new"
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 hover:border-slate-700 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-200">
                  <Cpu className="w-4 h-4 text-cyan-400" /> Start Cloud Environment Config
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
              </Link>

              <Link
                href="/dashboard/deployments"
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-850 hover:border-slate-700 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 text-xs font-semibold text-slate-200">
                  <Terminal className="w-4 h-4 text-pink-400" /> View History & Live Telemetry Logs
                </div>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-pink-400 group-hover:translate-x-1 transition-all" />
              </Link>
            </div>
          </div>

          {/* DevOps Status Tracker Summary */}
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <Activity className="w-5 h-5 text-emerald-400 animate-pulse" /> SRE Health Console Summary
              </h2>
              <p className="text-xs text-slate-450 leading-relaxed">
                Standardize your enterprise AWS resources: AWS Spot compute, isolated private VPC tunnels, strict IAM least-privilege security roles, and automated ArgoCD GitOps synchronizations out-of-the-box.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/65 border border-slate-850 space-y-3 font-mono text-[10px] text-slate-400 select-none leading-relaxed">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>AWS EKS Compute Nodes: <strong className="text-emerald-400">ACTIVE</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span>VPC Endpoint Security Policies: <strong className="text-slate-200">ENFORCED</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                <span>ArgoCD AutoSync Reconciliation: <strong className="text-cyan-400">SYNCED</strong></span>
              </div>
            </div>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500 font-mono select-none">
        CloudLaunch Self-Service AWS GitOps Platform • Under MIT License.
      </footer>
    </div>
  );
}
