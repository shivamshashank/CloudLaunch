"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "../../../components/Navigation";
import { supabase, Deployment, DeploymentLog } from "../../../lib/supabase";
import AWSConfigForm, { ConfigData } from "../../../components/AWSConfigForm";
import TerraformPreview from "../../../components/TerraformPreview";
import CostEstimate from "../../../components/CostEstimate";
import LogViewer from "../../../components/LogViewer";
import { Settings, Code, Terminal, PlusCircle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function NewDeployment() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Form Config State
  const [config, setConfig] = useState<ConfigData>({
    name: "Production Kubernetes EKS Cluster",
    region: "us-east-1",
    instance_type: "t3.medium",
    iam_policy: "PowerUserAccess",
    vpc_cidr: "10.0.0.0/16",
    public_subnets: 2,
    private_subnets: 2,
    storage_gb: 40,
    volume_type: "gp3",
    monitoring: true,
    gitops_sync: true,
    network_isolation: false,
    security_groups: [
      { port: 80, protocol: "tcp", source: "0.0.0.0/0" },
      { port: 443, protocol: "tcp", source: "0.0.0.0/0" }
    ]
  });

  // Dynamic Workspace States
  const [activeTab, setActiveTab] = useState<"code" | "cost" | "logs">("code");
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<DeploymentLog[]>([]);

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

  const writeLog = async (depId: string, level: "INFO" | "WARN" | "SUCCESS" | "ERROR", message: string) => {
    await supabase.from("deployment_logs").insert({
      deployment_id: depId,
      level,
      message,
    });
  };

  const handleDeploy = async () => {
    setIsProcessing(true);
    setActiveTab("logs");
    setLogs([]);

    // 1. Insert Deployment
    const { data, error } = await supabase.from("deployments").insert({
      user_id: user?.id,
      name: config.name,
      region: config.region,
      instance_type: config.instance_type,
      iam_policy: config.iam_policy,
      vpc_config: { cidr: config.vpc_cidr, public_subnets: config.public_subnets, private_subnets: config.private_subnets },
      security_groups: config.security_groups,
      storage_gb: config.storage_gb,
      monitoring: config.monitoring,
      status: "planning",
      cost_estimate_monthly: 0.00,
    }).select().single();

    if (error || !data) {
      alert("Failed to initialize remote deployment record: " + (error?.message || "empty data"));
      setIsProcessing(false);
      return;
    }

    const depId = data.id;

    // Emulate Realtime listener for logs on screen
    const channel = supabase
      .channel(`new-logs-${depId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deployment_logs" },
        (payload) => {
          if (payload.new.deployment_id === depId) {
            setLogs((prev) => [...prev, payload.new as DeploymentLog]);
          }
        }
      )
      .subscribe();

    // 2. Simulated Apply Pipeline
    const steps = [
      { delay: 800, level: "INFO" as const, msg: "Initializing CloudLaunch Automation Engine v1.0.0..." },
      { delay: 1200, level: "INFO" as const, msg: `Decrypting access keyrings for region ${config.region}...` },
      { delay: 1500, level: "INFO" as const, msg: "Retrieving S3 state buckets and matching locking locktables..." },
      { delay: 1800, level: "INFO" as const, msg: "Terraform validation checking..." },
      { delay: 1000, level: "SUCCESS" as const, msg: "Success! Code syntax, dependency structure, and parameters are fully valid." },
      { delay: 1500, level: "INFO" as const, msg: `Matching Infracost pricing matrix for AWS compute type: ${config.instance_type}...` },
      { delay: 800, level: "SUCCESS" as const, msg: "Pricing matching completed successfully! 4 billable components found." },
      { delay: 2000, level: "INFO" as const, msg: "Generating execution plan. Resources to create: VPC, Subnets, Gateway, SG, IAM, EC2 Instance..." },
      { delay: 800, statusUpdate: "planned", level: "SUCCESS" as const, msg: "Plan preview compiled successfully. Resources: 9 to add, 0 to change, 0 to destroy." },
      { delay: 2500, statusUpdate: "applying", level: "INFO" as const, msg: "Applying Terraform Configuration. Spinning up AWS resources..." },
      { delay: 2000, level: "INFO" as const, msg: "module.vpc.aws_vpc.this: Creating..." },
      { delay: 1500, level: "SUCCESS" as const, msg: "module.vpc.aws_vpc.this: Creation complete after 6s [ID: vpc-0a88ef11b22]" },
      { delay: 1500, level: "INFO" as const, msg: "aws_security_group.app_sg: Creating..." },
      { delay: 1200, level: "SUCCESS" as const, msg: "aws_security_group.app_sg: Creation complete after 3s [ID: sg-0118befd]" },
      { delay: 2500, level: "INFO" as const, msg: `aws_instance.app_nodes: Creating AWS Compute Instance (${config.instance_type})...` },
      { delay: 1800, level: "SUCCESS" as const, msg: "aws_instance.app_nodes: Creation complete after 14s [ID: i-08fa76bb3d2a]" },
      { delay: 1500, level: "INFO" as const, msg: "Syncing SRE metrics channels to Prometheus..." },
      { delay: 1200, level: "SUCCESS" as const, msg: config.monitoring ? "Prometheus exporter scraping is ACTIVE." : "Scraping skipped (monitoring disabled)." },
      { delay: 1500, level: "INFO" as const, msg: "Checking network endpoint health status..." },
      { delay: 1200, level: "SUCCESS" as const, msg: "Endpoint reachable! HTTP Status Code: 200 OK. Latency: 42ms" },
      { delay: 1800, level: "INFO" as const, msg: "Reconciling Helm manifests with ArgoCD repository..." },
      { delay: 1800, level: "SUCCESS" as const, msg: config.gitops_sync ? "ArgoCD auto-synchronization triggered! EKS nodes reconciled." : "GitOps auto-sync skipped." },
      { delay: 1000, statusUpdate: "deployed", level: "SUCCESS" as const, msg: `Deployment complete! Active CloudLaunch Environment: ${config.name} is fully online.` }
    ];

    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, step.delay));
      await writeLog(depId, step.level, step.msg);
      
      if (step.statusUpdate) {
        // Calculate dynamic cost total
        const computeCost = config.instance_type === "t3.micro" ? 7.50 : config.instance_type === "t3.medium" ? 30.00 : config.instance_type === "m5.large" ? 69.12 : 122.40;
        const storageCost = config.storage_gb * 0.08;
        const telemetryCost = config.monitoring ? 15.00 : 0.00;
        const costTotal = computeCost + storageCost + telemetryCost;

        await supabase.from("deployments").update({ 
          status: step.statusUpdate,
          cost_estimate_monthly: step.statusUpdate === "deployed" ? costTotal : 0.00
        }).eq("id", depId);
      }
    }

    channel.unsubscribe();
    setIsProcessing(false);
    
    // Redirect to deployments history tab
    setTimeout(() => router.push("/dashboard/deployments"), 1000);
  };

  if (loadingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-350 font-mono text-sm gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
        DECRYPTING CONSOLE AUTHORIZATION...
      </div>
    );
  }

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
                <PlusCircle className="w-5 h-5 text-cyan-400" /> Configure Cloud Sandbox
              </h1>
            </div>
          </div>
        </div>

        {/* Form and Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Side: Parameters Inputs Form (col-span-7) */}
          <div className="lg:col-span-7">
            <AWSConfigForm
              config={config}
              onChange={setConfig}
              onDeploy={handleDeploy}
              onPlan={() => setActiveTab("code")}
              isProcessing={isProcessing}
            />
          </div>

          {/* Right Side: Tabbed Code / Cost / Live Logs Panels (col-span-5) */}
          <div className="lg:col-span-5 space-y-4">
            
            {/* Tabs Headers */}
            <div className="flex border-b border-slate-900 bg-slate-900/40 rounded-xl p-1 overflow-hidden">
              {[
                { id: "code", label: "Terraform HCL", icon: Code },
                { id: "cost", label: "FinOps pricing", icon: CostEstimate },
                { id: "logs", label: "Engine Logs", icon: Terminal }
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[10px] font-bold tracking-wider transition-all uppercase cursor-pointer ${
                      activeTab === tab.id
                        ? "bg-slate-950 border border-slate-800 text-cyan-400"
                        : "text-slate-450 hover:text-slate-350"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Body */}
            <div>
              {activeTab === "code" && (
                <TerraformPreview config={config} />
              )}

              {activeTab === "cost" && (
                <CostEstimate config={config} />
              )}

              {activeTab === "logs" && (
                <LogViewer logs={logs} onClear={() => setLogs([])} title="Active Deployment Stream" />
              )}
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
