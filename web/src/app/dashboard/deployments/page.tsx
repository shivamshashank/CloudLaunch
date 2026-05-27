"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "../../../components/Navigation";
import { supabase, Deployment, DeploymentLog } from "../../../lib/supabase";
import LogViewer from "../../../components/LogViewer";
import { 
  Terminal, Server, Globe, Cpu, DollarSign, 
  Trash2, Activity, Play, ArrowLeft, RefreshCw, CheckCircle 
} from "lucide-react";
import Link from "next/link";

export default function DeploymentsList() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Deployments state
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<DeploymentLog[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Auth check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/");
      } else {
        setUser(user);
        setLoadingAuth(false);
      }
    });
  }, [router]);

  // Load Deployments List
  const loadDeployments = async () => {
    const { data } = await supabase.from("deployments").select("*").order("created_at", { ascending: false });
    if (data) {
      setDeployments(data);
      if (data.length > 0 && !selectedId) {
        setSelectedId(data[0].id);
        loadLogs(data[0].id);
      }
    }
  };

  useEffect(() => {
    if (user) {
      loadDeployments();
    }
  }, [user]);

  // Load Logs
  const loadLogs = async (id: string) => {
    const { data } = await supabase
      .from("deployment_logs")
      .select("*")
      .eq("deployment_id", id)
      .order("timestamp", { ascending: true });
    
    if (data) {
      setLogs(data as DeploymentLog[]);
    } else {
      setLogs([]);
    }
  };

  // Switch Active Selected Deployment
  const handleSelect = (id: string) => {
    setSelectedId(id);
    loadLogs(id);
  };

  // Real-time Database Subscription Setup
  useEffect(() => {
    if (!selectedId) return;

    // Listen to realtime logs inserts
    const channel = supabase
      .channel(`deployments-logs-${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deployment_logs" },
        (payload) => {
          if (payload.new.deployment_id === selectedId) {
            setLogs((prev) => [...prev, payload.new as DeploymentLog]);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deployments" },
        (payload) => {
          if (payload.new.id === selectedId) {
            setDeployments((prev) => 
              prev.map((d) => (d.id === payload.new.id ? { ...d, ...payload.new } : d))
            );
          }
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [selectedId]);

  // write log helper
  const writeLog = async (depId: string, level: "INFO" | "WARN" | "SUCCESS" | "ERROR", message: string) => {
    await supabase.from("deployment_logs").insert({
      deployment_id: depId,
      level,
      message,
    });
  };

  // Teardown simulation
  const handleDestroy = async (depId: string) => {
    if (!confirm("Are you absolutely sure you want to tear down and destroy all AWS resources for this EKS cluster?")) return;

    setIsProcessing(true);
    setLogs([]);

    await supabase.from("deployments").update({ status: "destroying" }).eq("id", depId);

    const steps = [
      { delay: 1000, level: "WARN" as const, msg: "WARNING: Destruction pipeline triggered for active environment!" },
      { delay: 1500, level: "INFO" as const, msg: "Connecting AWS EKS cluster endpoints to withdraw active GitOps pipelines..." },
      { delay: 2000, level: "INFO" as const, msg: "Suspending GitOps auto-synchronization controllers on ArgoCD server..." },
      { delay: 1500, level: "SUCCESS" as const, msg: "ArgoCD auto-sync status: INACTIVE." },
      { delay: 2500, level: "INFO" as const, msg: "Destroying EC2 nodes, security policy groups, and VPC subnets..." },
      { delay: 2000, level: "INFO" as const, msg: "aws_instance.app_nodes: Destroying compute instance..." },
      { delay: 2500, level: "SUCCESS" as const, msg: "aws_instance.app_nodes: Destruction complete after 12s." },
      { delay: 2000, level: "INFO" as const, msg: "aws_security_group.app_sg: Tearing down egress policies..." },
      { delay: 1500, level: "SUCCESS" as const, msg: "aws_security_group.app_sg: Destruction complete." },
      { delay: 2500, level: "INFO" as const, msg: "module.vpc.aws_vpc.this: Tearing down public/private subnet routes..." },
      { delay: 2000, level: "SUCCESS" as const, msg: "module.vpc.aws_vpc.this: VPC networks destroyed successfully." },
      { delay: 1000, statusUpdate: "destroyed", level: "SUCCESS" as const, msg: "Destruction complete! Resources: 0 added, 0 changed, 9 destroyed." }
    ];

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, step.delay));
      await writeLog(depId, step.level, step.msg);
      
      if (step.statusUpdate) {
        await supabase.from("deployments").update({ status: step.statusUpdate }).eq("id", depId);
      }
    }

    setIsProcessing(false);
    loadDeployments();
  };

  const getStatusBadge = (status: Deployment["status"]) => {
    switch (status) {
      case "deployed":
        return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "planning":
      case "planned":
      case "applying":
        return "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 animate-pulse";
      case "destroying":
        return "bg-rose-500/10 border-rose-500/30 text-rose-400 animate-pulse";
      case "destroyed":
        return "bg-slate-800 border-slate-700 text-slate-400";
      case "failed":
        return "bg-rose-500/20 border-rose-500/40 text-rose-400";
      case "pending":
      default:
        return "bg-amber-500/10 border-amber-500/30 text-amber-400";
    }
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-350 font-mono text-sm gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
        DECRYPTING CONSOLE AUTHORIZATION...
      </div>
    );
  }

  const selectedDeployment = deployments.find((d) => d.id === selectedId);

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 tech-grid scanline overflow-hidden">
      {/* Navigation */}
      <Navigation />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 space-y-6 relative z-10">
        
        {/* Breadcrumb Header */}
        <div className="flex items-center justify-between border-b border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-slate-400 hover:text-white"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">WORKSPACE CONSOLE</span>
              <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                <Activity className="w-5 h-5 text-cyan-400" /> Deployments Logs Telemetry
              </h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Deployments list Table (col-span-7) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Environment Listing</span>
                <span className="text-xs font-mono text-slate-500">{deployments.length} Configured</span>
              </div>

              {deployments.length === 0 ? (
                <div className="text-center py-16 text-xs font-mono text-slate-500 space-y-4">
                  <p>No AWS EKS deployments found in remote database.</p>
                  <Link
                    href="/dashboard/new"
                    className="inline-flex bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 font-bold px-4 py-2 rounded-xl text-xs transition-all"
                  >
                    Start New Configuration
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-slate-300 text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-500 font-mono text-[9px] uppercase tracking-wider">
                        <th className="pb-3.5 pl-2 font-medium">Name</th>
                        <th className="pb-3.5 font-medium">Region</th>
                        <th className="pb-3.5 font-medium">Instance</th>
                        <th className="pb-3.5 font-medium">Cost / Mo</th>
                        <th className="pb-3.5 font-medium">Status</th>
                        <th className="pb-3.5 text-right pr-2 font-medium">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deployments.map((d) => (
                        <tr
                          key={d.id}
                          onClick={() => handleSelect(d.id)}
                          className={`border-b border-slate-900/50 hover:bg-slate-900/30 transition-all cursor-pointer ${
                            selectedId === d.id ? "bg-slate-900/30 border-l-2 border-l-cyan-500" : ""
                          }`}
                        >
                          <td className="py-4 pl-2 font-semibold text-slate-200">{d.name}</td>
                          <td className="py-4 font-mono text-slate-400">{d.region}</td>
                          <td className="py-4 font-mono text-slate-400">{d.instance_type}</td>
                          <td className="py-4 font-mono text-slate-400">
                            {d.status === "deployed" ? `$${Number(d.cost_estimate_monthly).toFixed(2)}` : "$0.00"}
                          </td>
                          <td className="py-4">
                            <span className={`px-2 py-0.5 rounded border text-[9px] font-bold uppercase ${getStatusBadge(d.status)}`}>
                              {d.status}
                            </span>
                          </td>
                          <td className="py-4 text-right pr-2">
                            {d.status === "deployed" ? (
                              <button
                                disabled={isProcessing}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDestroy(d.id);
                                }}
                                className="p-2 rounded bg-rose-950/20 hover:bg-rose-950 border border-rose-900/40 hover:border-rose-500 text-rose-400 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Teardown Stack"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-slate-600 font-mono text-[9px] select-none uppercase">None</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>

          {/* Right Column: Full Screen LogViewer (col-span-5) */}
          <div className="lg:col-span-5">
            {selectedId ? (
              <LogViewer 
                logs={logs} 
                onClear={() => setLogs([])} 
                title={`Terminal Console: ${selectedDeployment?.name || "Logs"}`}
              />
            ) : (
              <div className="bg-slate-950 border border-slate-850 rounded-2xl h-[400px] flex items-center justify-center text-xs font-mono text-slate-600 select-none">
                Select an environment deployment to stream logs.
              </div>
            )}
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
