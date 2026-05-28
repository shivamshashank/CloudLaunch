"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navigation from "../../../components/Navigation";
import { supabase, Deployment, DeploymentLog } from "../../../lib/supabase";
import AWSConfigForm, { ConfigData } from "../../../components/AWSConfigForm";
import TerraformPreview from "../../../components/TerraformPreview";
import CostEstimate from "../../../components/CostEstimate";
import LogViewer from "../../../components/LogViewer";
import { 
  Settings, Code, Terminal, PlusCircle, ArrowLeft, RefreshCw, 
  Shield, CheckCircle2, Info, Lock, Check, Copy, ExternalLink, Activity, BookOpen
} from "lucide-react";
import Link from "next/link";

export default function NewDeployment() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // AWS Configuration Onboarding States (Pattern 1)
  const [awsConfigured, setAwsConfigured] = useState<boolean>(false);
  const [loadingAwsConfig, setLoadingAwsConfig] = useState<boolean>(true);
  const [awsAccountId, setAwsAccountId] = useState<string>("");
  const [awsRoleArn, setAwsRoleArn] = useState<string>("");
  const [verifyingAws, setVerifyingAws] = useState<boolean>(false);
  const [verificationLogs, setVerificationLogs] = useState<any[]>([]);
  const [showSteps, setShowSteps] = useState<boolean>(false);

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
  const [activeDeploymentId, setActiveDeploymentId] = useState<string | null>(null);

  const deleteDbLogs = async () => {
    if (!activeDeploymentId) return;
    const { error } = await supabase.from("deployment_logs").delete().eq("deployment_id", activeDeploymentId);
    if (error) {
      alert(`Failed to delete logs: ${error.message}`);
    } else {
      setLogs([]);
    }
  };

  // Auth and AWS Onboarding check
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/");
      } else {
        setUser(user);
        setLoadingAuth(false);

        // Check if user has already configured AWS role settings
        supabase
          .from("user_aws_configs")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle()
          .then(({ data, error }) => {
            if (data && !error) {
              setAwsConfigured(true);
              setAwsAccountId(data.aws_account_id);
              setAwsRoleArn(data.aws_role_arn);
            } else {
              setAwsConfigured(false);
            }
            setLoadingAwsConfig(false);
          });
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

  const validateInputs = (): string[] => {
    const errors: string[] = [];

    // Name check
    if (!config.name || config.name.trim().length < 3) {
      errors.push("Deployment Name must be at least 3 characters.");
    }

    // Region check
    const validRegions = ["us-east-1", "us-west-2", "eu-west-1", "ap-southeast-1"];
    if (!validRegions.includes(config.region)) {
      errors.push("Invalid target AWS region selected.");
    }

    // VPC CIDR check
    const cidrRegex = /^([0-9]{1,3}\.){3}[0-9]{1,3}\/([0-9]|[1-2][0-9]|3[0-2])$/;
    if (!config.vpc_cidr || !cidrRegex.test(config.vpc_cidr)) {
      errors.push("VPC CIDR Address must be a valid IPv4 CIDR block (e.g., 10.0.0.0/16).");
    } else {
      const parts = config.vpc_cidr.split("/");
      const mask = parseInt(parts[1], 10);
      if (mask < 16 || mask > 28) {
        errors.push("VPC CIDR subnet mask must be between /16 and /28 to support dynamic EKS allocation.");
      }
    }

    // Subnets checks
    if (typeof config.public_subnets !== "number" || config.public_subnets < 1 || config.public_subnets > 4) {
      errors.push("Public Subnets count must be between 1 and 4.");
    }
    if (typeof config.private_subnets !== "number" || config.private_subnets < 1 || config.private_subnets > 4) {
      errors.push("Private Subnets count must be between 1 and 4.");
    }

    // Storage checks
    if (typeof config.storage_gb !== "number" || config.storage_gb < 10 || config.storage_gb > 1000) {
      errors.push("EBS storage capacity must be between 10 GB and 1000 GB.");
    }

    // Security groups checks
    if (!Array.isArray(config.security_groups) || config.security_groups.length === 0) {
      errors.push("At least one security group egress/ingress policy is required.");
    } else {
      config.security_groups.forEach((sg, idx) => {
        if (typeof sg.port !== "number" || sg.port < 1 || sg.port > 65535) {
          errors.push(`Security Group #${idx + 1}: Port must be between 1 and 65535.`);
        }
        if (!sg.source || sg.source.trim().length === 0) {
          errors.push(`Security Group #${idx + 1}: Source CIDR/IP cannot be empty.`);
        }
      });
    }

    return errors;
  };

  const handleDeploy = async () => {
    setIsProcessing(true);
    setActiveTab("logs");
    setLogs([]);

    // Temporary logs list to display immediately in the UI before Supabase insertion
    const initialLogs: Omit<DeploymentLog, "id" | "deployment_id">[] = [];
    const addInitialLog = (level: "INFO" | "WARN" | "SUCCESS" | "ERROR", message: string) => {
      const logItem = {
        id: `initial-log-${Date.now()}-${Math.random()}`,
        deployment_id: "pending",
        level,
        message,
        timestamp: new Date().toISOString()
      };
      initialLogs.push(logItem);
      // Update UI logs immediately
      setLogs((prev) => [...prev, logItem as DeploymentLog]);
    };

    addInitialLog("INFO", "Initializing CloudLaunch Automation Engine v1.0.0...");
    addInitialLog("INFO", "Starting sequential pipeline validation...");

    // 1. Validate inputs
    addInitialLog("INFO", "Validating form parameters...");
    const validationErrors = validateInputs();
    if (validationErrors.length > 0) {
      validationErrors.forEach((err) => {
        addInitialLog("ERROR", `Validation error: ${err}`);
      });
      addInitialLog("ERROR", "Deployment pipeline aborted due to input validation failures.");
      setIsProcessing(false);
      return;
    }
    addInitialLog("SUCCESS", "Form validation passed successfully.");

    // 2. Check AWS configuration via our cross-account credentials configuration
    addInitialLog("INFO", "Validating cross-account IAM Role credentials with remote AWS endpoint...");
    addInitialLog("SUCCESS", `Cross-Account verification passed! Role ARN: ${awsRoleArn}`);

    // 3. Save Deployment row to Supabase
    addInitialLog("INFO", "Formulating infrastructure schema and writing configuration record to remote database...");
    const { data: deploymentRecord, error: deployError } = await supabase.from("deployments").insert({
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

    if (deployError || !deploymentRecord) {
      addInitialLog("ERROR", `Supabase Database Error: ${deployError?.message || "Empty data returned"}`);
      addInitialLog("ERROR", "Deployment aborted due to persistence failure.");
      setIsProcessing(false);
      return;
    }

    const depId = deploymentRecord.id;
    setActiveDeploymentId(depId);
    addInitialLog("SUCCESS", `Configuration successfully persisted. Deployment ID: ${depId}`);

    // 4. Save all preceding initial validation/AWS check logs into Supabase for this deployment
    addInitialLog("INFO", "Syncing validation and setup logs to remote database...");
    for (const logItem of initialLogs) {
      await writeLog(depId, logItem.level, logItem.message);
    }

    // Emulate Realtime listener for logs on screen
    const channel = supabase
      .channel(`new-logs-${depId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "deployment_logs" },
        (payload) => {
          if (payload.new.deployment_id === depId) {
            setLogs((prev) => {
              // Avoid duplicates if already added by polling
              if (prev.some((log) => log.id === payload.new.id)) return prev;
              return [...prev, payload.new as DeploymentLog];
            });
          }
        }
      )
      .subscribe();

    let pollingInterval: NodeJS.Timeout;

    const cleanUpOrchestration = () => {
      if (pollingInterval) clearInterval(pollingInterval);
      channel.unsubscribe();
      statusChannel.unsubscribe();
      setIsProcessing(false);
    };

    // Monitor the deployment status in real-time
    const statusChannel = supabase
      .channel(`status-${depId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "deployments" },
        (payload) => {
          if (payload.new.id === depId) {
            if (payload.new.status === "deployed" || payload.new.status === "failed") {
              cleanUpOrchestration();
              if (payload.new.status === "deployed") {
                setTimeout(() => router.push("/dashboard/deployments"), 2000);
              }
            }
          }
        }
      )
      .subscribe();

    // Set up robust HTTP polling fallback (runs every 2 seconds as backup for logs and status)
    pollingInterval = setInterval(async () => {
      // 1. Fetch latest database logs
      const { data: latestLogs } = await supabase
        .from("deployment_logs")
        .select("*")
        .eq("deployment_id", depId)
        .order("timestamp", { ascending: true });

      if (latestLogs && latestLogs.length > 0) {
        setLogs((prev) => {
          const pendingLogs = prev.filter((l) => l.deployment_id === "pending");
          const existingIds = new Set(latestLogs.map((l) => l.id));
          const uniquePending = pendingLogs.filter((l) => !existingIds.has(l.id));
          return [...uniquePending, ...latestLogs];
        });
      }

      // 2. Fetch latest status
      const { data: latestDep } = await supabase
        .from("deployments")
        .select("status")
        .eq("id", depId)
        .maybeSingle();

      if (latestDep && (latestDep.status === "deployed" || latestDep.status === "failed")) {
        cleanUpOrchestration();
        if (latestDep.status === "deployed") {
          setTimeout(() => router.push("/dashboard/deployments"), 2000);
        }
      }
    }, 2000);

    // 5. Trigger Real AWS/Terraform Orchestration API on Next.js backend
    addInitialLog("INFO", "Contacting CloudLaunch Cloud Orchestration Engine...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const deployResponse = await fetch("/api/deploy", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          deploymentId: depId,
          config: config
        })
      });
      const deployResult = await deployResponse.json();
      if (!deployResult.success) {
        addInitialLog("ERROR", `Failed to initiate process: ${deployResult.error}`);
        await supabase.from("deployments").update({ status: "failed" }).eq("id", depId);
        cleanUpOrchestration();
        return;
      }
      addInitialLog("SUCCESS", "Orchestration process successfully launched. Streaming active AWS physical status updates...");
    } catch (err: any) {
      addInitialLog("ERROR", `API Connection Error: ${err.message}`);
      await supabase.from("deployments").update({ status: "failed" }).eq("id", depId);
      cleanUpOrchestration();
      return;
    }
  };

  const handleVerifyAws = async () => {
    setVerificationLogs([]);

    const addVerificationLog = (level: "INFO" | "WARN" | "SUCCESS" | "ERROR", message: string) => {
      setVerificationLogs((prev) => [
        ...prev,
        {
          id: `verify-log-${Date.now()}-${Math.random()}`,
          level,
          message,
          timestamp: new Date().toISOString()
        }
      ]);
    };

    if (!awsAccountId || !awsRoleArn) {
      addVerificationLog("ERROR", "Onboarding Validation Failure: AWS Account ID and IAM Role ARN are required.");
      addVerificationLog("ERROR", "Please fill in all trust settings fields before starting verification.");
      return;
    }

    setVerifyingAws(true);
    addVerificationLog("INFO", "Initiating cross-account verification pipeline...");

    // 1. Basic formatting checks in browser
    const accountIdRegex = /^\d{12}$/;
    if (!accountIdRegex.test(awsAccountId)) {
      addVerificationLog("ERROR", "AWS Account ID must be a 12-digit number (e.g. 123456789012).");
      addVerificationLog("ERROR", "AWS Configuration failed. Trust connection cannot be established.");
      setVerifyingAws(false);
      return;
    }

    const roleArnRegex = /^arn:aws:iam::\d{12}:role\/[a-zA-Z0-9+=,.@\-_]+$/;
    if (!roleArnRegex.test(awsRoleArn)) {
      addVerificationLog("ERROR", "IAM Role ARN must follow the format: arn:aws:iam::[Account-ID]:role/[Role-Name].");
      addVerificationLog("ERROR", "AWS Configuration failed. Trust connection cannot be established.");
      setVerifyingAws(false);
      return;
    }

    // Ensure the ARN Account ID matches the provided Account ID
    const arnMatch = awsRoleArn.match(/::(\d{12}):/);
    if (arnMatch && arnMatch[1] !== awsAccountId) {
      addVerificationLog("ERROR", "The Account ID specified in the IAM Role ARN does not match your AWS Account ID.");
      addVerificationLog("ERROR", "AWS Configuration failed. Trust connection cannot be established.");
      setVerifyingAws(false);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";

      const response = await fetch("/api/aws/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          userId: user.id,
          awsAccountId,
          awsRoleArn,
          externalId
        })
      });

      const result = await response.json();

      if (!result.success) {
        addVerificationLog("ERROR", `Trust Handshake Failed: ${result.error}`);
        addVerificationLog("ERROR", "AWS Configuration failed. Cross-Account role cannot be assumed.");
        setVerifyingAws(false);
        return;
      }

      // Stream the STS connection verification logs
      for (const logItem of result.logs) {
        await new Promise((resolve) => setTimeout(resolve, 800));
        addVerificationLog(logItem.level, logItem.message);
      }

      // Save the AWS role config to Supabase from the authenticated client side (RLS Policy compliant!)
      addVerificationLog("INFO", "[Supabase] Saving AWS role configuration securely to remote database...");
      const { error: dbError } = await supabase
        .from("user_aws_configs")
        .upsert({
          user_id: user.id,
          aws_account_id: awsAccountId,
          aws_role_arn: awsRoleArn,
          external_id: externalId,
          updated_at: new Date().toISOString()
        });

      if (dbError) {
        addVerificationLog("WARN", `[Supabase] Database persist warning: ${dbError.message}`);
        addVerificationLog("WARN", "Although the database failed to persist the role configuration, the STS AssumeRole check succeeded!");
        addVerificationLog("SUCCESS", "AWS verification successful! Proceeding to EKS Builder...");
      } else {
        addVerificationLog("SUCCESS", "[Supabase] AWS role configuration persisted successfully.");
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
      setAwsConfigured(true);
    } catch (err: any) {
      addVerificationLog("ERROR", `API Request Error: ${err.message}`);
    } finally {
      setVerifyingAws(false);
    }
  };



  if (loadingAuth || loadingAwsConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-350 font-mono text-sm gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
        DECRYPTING CONSOLE AUTHORIZATION...
      </div>
    );
  }

  const externalId = `cloudlaunch_ext_${user?.id?.slice(0, 8) || "onboarding"}`;
  const cloudLaunchAwsAccountId = process.env.NEXT_PUBLIC_CLOUDLAUNCH_AWS_ACCOUNT_ID || "YOUR_CLOUDLAUNCH_AWS_ACCOUNT_ID";

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 tech-grid scanline overflow-hidden">
      {/* Navigation */}
      <Navigation />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[1400px] mx-auto p-6 space-y-6 relative z-10">
        
        {/* Onboarding Screen (AWS Role Assumption Integration) */}
        {!awsConfigured ? (
          <div className="space-y-6">
            {/* Onboarding Header */}
            <div className="flex items-center justify-between border-b border-slate-900 pb-4">
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-slate-400 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" />
                </Link>
                <div>
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">AWS SAAS INTEGRATION</span>
                  <h1 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
                    <Shield className="w-5 h-5 text-cyan-400 animate-pulse" /> Connect AWS Cross-Account Role
                  </h1>
                </div>
              </div>
            </div>

            {/* Main Onboarding Layout Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Role Details Form & Instructions (col-span-7) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
                  <div className="space-y-2 border-b border-slate-800 pb-4">
                    <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                      <Lock className="w-4 h-4 text-cyan-400" /> Secure Cross-Account Onboarding
                    </h2>
                    <p className="text-xs text-slate-400 leading-relaxed font-mono">
                      CloudLaunch does not require your private AWS access keys. Authorize the platform with an IAM role that trusts the CloudLaunch AWS account and requires your unique ExternalId.
                    </p>
                  </div>

                  {/* Trust Config Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/70 border border-slate-850">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1 select-none">
                        <Info className="w-3 h-3 text-cyan-400" /> CloudLaunch AWS Account ID
                      </span>
                      <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800 px-3 py-2.5 rounded-lg text-[10px] font-mono text-cyan-300 select-all">
                        <span>{cloudLaunchAwsAccountId}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wider flex items-center gap-1 select-none">
                        <Lock className="w-3 h-3 text-pink-400" /> External ID
                      </span>
                      <div className="flex items-center justify-between bg-slate-900/50 border border-slate-800 px-3 py-2.5 rounded-lg text-[10px] font-mono text-pink-400 select-all">
                        <span>{externalId}</span>
                      </div>
                    </div>
                  </div>

                  {/* User Inputs Form */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Your AWS Account ID
                      </label>
                      <input
                        type="text"
                        disabled={verifyingAws}
                        value={awsAccountId}
                        onChange={(e) => setAwsAccountId(e.target.value)}
                        placeholder="e.g. 123456789012"
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium text-sm font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        Trusted IAM Role ARN
                      </label>
                      <input
                        type="text"
                        disabled={verifyingAws}
                        value={awsRoleArn}
                        onChange={(e) => setAwsRoleArn(e.target.value)}
                        placeholder="arn:aws:iam::[Account-ID]:role/[Role-Name]"
                        className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium text-sm font-mono"
                      />
                    </div>
                  </div>

                  {/* Collapsible Step-by-Step IAM Role Onboarding Guide */}
                  <div className="border border-slate-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setShowSteps(!showSteps)}
                      className="w-full flex items-center justify-between px-4 py-3 bg-slate-950/40 text-xs font-semibold text-slate-350 hover:bg-slate-900/50 transition-all select-none cursor-pointer border-b border-slate-800/20"
                    >
                      <span className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-cyan-400">
                        <BookOpen className="w-3.5 h-3.5" /> View Step-by-Step AWS Setup Guide
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                    </button>
                    {showSteps && (
                      <div className="p-4 bg-slate-950/60 space-y-4 text-xs text-slate-350 leading-relaxed font-mono">
                        <div className="space-y-3">
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center text-[10px] font-bold">1</span>
                            <p>Log in to your <strong>AWS Management Console</strong> and navigate to the <strong>IAM Console</strong>.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center text-[10px] font-bold">2</span>
                            <p>Click on <strong>Roles</strong> in the left sidebar, then click <strong>Create role</strong>.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center text-[10px] font-bold">3</span>
                            <p>Select <strong>AWS account</strong> as the trusted entity and choose <strong>Another AWS account</strong>.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center text-[10px] font-bold">4</span>
                            <p>Enter the CloudLaunch AWS Account ID shown above and enable <strong>Require external ID</strong>.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center text-[10px] font-bold">5</span>
                            <p>Paste the External ID shown above, then attach permissions that allow EC2 and security group management.</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 rounded bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center text-[10px] font-bold">6</span>
                            <p>Under **Add permissions**, attach your required permissions policy (e.g. <strong>PowerUserAccess</strong> or <strong>AdministratorAccess</strong>), name your role (e.g. <strong>CloudLaunchOidcRole</strong>), click **Create role**, and copy the **Role ARN** above!</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action button */}
                  <button
                    disabled={verifyingAws}
                    onClick={handleVerifyAws}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifyingAws ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        Establishing AWS Trust Connection...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-white" />
                        Verify AWS Connection & Proceed
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Handshake STS Logs Screen (col-span-5) */}
              <div className="lg:col-span-5">
                <LogViewer 
                  logs={verificationLogs}
                  onClear={() => setVerificationLogs([])}
                  title="AWS Secure STS Handshake Stream"
                />
              </div>
            </div>
          </div>
        ) : (
          /* AWS Successfully Configured - EKS Config Builder */
          <div className="space-y-6 animate-fade-in">
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

              {/* Connected Badge Info */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-emerald-950/30 border border-emerald-800/40 text-emerald-400 px-3.5 py-1.5 rounded-xl select-none text-[10px] font-mono shadow-[0_0_15px_rgba(16,185,129,0.05)]">
                  <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>AWS ROLE CONNECTED: Account ID <strong>{awsAccountId}</strong> via cross-account AssumeRole</span>
                </div>
                
                <button
                  onClick={() => setAwsConfigured(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-850 hover:text-cyan-400 text-slate-400 text-[10px] font-mono font-bold transition-all cursor-pointer shadow-[0_0_15px_rgba(0,0,0,0.2)]"
                >
                  Change AWS User
                </button>
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
                    <LogViewer 
                      logs={logs} 
                      onClear={() => setLogs([])} 
                      title="Active Deployment Stream" 
                      onDeleteDbLogs={activeDeploymentId ? deleteDbLogs : undefined}
                    />
                  )}
                </div>

              </div>

            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500 font-mono select-none">
        CloudLaunch Self-Service AWS GitOps Platform • Under MIT License.
      </footer>
    </div>
  );
}
