"use client";

import React from "react";
import { Server, Shield, Globe, HardDrive, Cpu, Settings, Eye } from "lucide-react";

export interface ConfigData {
  name: string;
  region: string;
  instance_type: string;
  iam_policy: string;
  vpc_cidr: string;
  public_subnets: number;
  private_subnets: number;
  storage_gb: number;
  volume_type: string;
  monitoring: boolean;
  gitops_sync: boolean;
  network_isolation: boolean;
  security_groups: Array<{
    port: number;
    protocol: string;
    source: string;
  }>;
}

interface AWSConfigFormProps {
  config: ConfigData;
  onChange: (newConfig: ConfigData) => void;
  onDeploy: () => void;
  onPlan: () => void;
  isProcessing: boolean;
}

export default function AWSConfigForm({
  config,
  onChange,
  onDeploy,
  onPlan,
  isProcessing,
}: AWSConfigFormProps) {
  const updateField = (field: keyof ConfigData, value: any) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-cyan-400 animate-pulse" />
          <h2 className="text-xl font-bold text-white tracking-wide">AWS Environment Details</h2>
        </div>
        <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
          v1.0.0-HCL
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name & Region */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Deployment Name
            </label>
            <div className="relative">
              <input
                type="text"
                value={config.name}
                onChange={(e) => updateField("name", e.target.value)}
                placeholder="e.g. Production Web EKS"
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              AWS Target Region
            </label>
            <div className="relative">
              <Globe className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <select
                value={config.region}
                onChange={(e) => updateField("region", e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-sm appearance-none cursor-pointer"
              >
                <option value="us-east-1">us-east-1 (N. Virginia)</option>
                <option value="us-west-2">us-west-2 (Oregon)</option>
                <option value="eu-west-1">eu-west-1 (Ireland)</option>
                <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Compute & Security */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              EC2 Instance Type
            </label>
            <div className="relative">
              <Cpu className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <select
                value={config.instance_type}
                onChange={(e) => updateField("instance_type", e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-sm appearance-none cursor-pointer"
              >
                <option value="t3.micro">t3.micro (1 vCPU, 1 GiB RAM) - Sandbox</option>
                <option value="t3.medium">t3.medium (2 vCPU, 4 GiB RAM) - General</option>
                <option value="m5.large">m5.large (2 vCPU, 8 GiB RAM) - Standard</option>
                <option value="c6i.xlarge">c6i.xlarge (4 vCPU, 8 GiB RAM) - Compute</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              IAM Privilege Policy
            </label>
            <div className="relative">
              <Shield className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
              <select
                value={config.iam_policy}
                onChange={(e) => updateField("iam_policy", e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all text-sm appearance-none cursor-pointer"
              >
                <option value="ReadOnlyAccess">ReadOnlyAccess (Auditing)</option>
                <option value="PowerUserAccess">PowerUserAccess (Deployments)</option>
                <option value="AdministratorAccess">AdministratorAccess (Full Admin)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <hr className="border-slate-800/80" />

      {/* Networking & Storage */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-1.5">
            <Globe className="w-4 h-4" /> Networking (VPC Setup)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-slate-400 mb-1.5">VPC CIDR Address</label>
              <input
                type="text"
                value={config.vpc_cidr}
                onChange={(e) => updateField("vpc_cidr", e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Public Subnets</label>
              <input
                type="number"
                min="1"
                max="4"
                value={config.public_subnets}
                onChange={(e) => updateField("public_subnets", parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Private Subnets</label>
              <input
                type="number"
                min="1"
                max="4"
                value={config.private_subnets}
                onChange={(e) => updateField("private_subnets", parseInt(e.target.value) || 1)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-300 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 transition-all text-sm font-mono"
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-1.5">
            <HardDrive className="w-4 h-4" /> Storage (EBS Volume)
          </h3>
          <div>
            <div className="flex justify-between text-xs text-slate-400 mb-2">
              <span>Capacity (GB): <strong className="text-white font-mono">{config.storage_gb} GB</strong></span>
              <span>gp3 SSD</span>
            </div>
            <input
              type="range"
              min="10"
              max="1000"
              step="10"
              value={config.storage_gb}
              onChange={(e) => updateField("storage_gb", parseInt(e.target.value))}
              className="w-full h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Volume Type</label>
            <div className="grid grid-cols-3 gap-2">
              {["gp3", "gp2", "io2"].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => updateField("volume_type", type)}
                  className={`py-2 rounded-xl text-xs font-mono border transition-all ${
                    config.volume_type === type
                      ? "bg-cyan-950/50 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.15)]"
                      : "bg-slate-950/80 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                  }`}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <hr className="border-slate-800/80" />

      {/* Advanced Toggles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Monitoring Toggle */}
        <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/50 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all select-none">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-300">Prometheus Agent</span>
            <p className="text-[10px] text-slate-500 leading-tight">Enable full SRE telemetry.</p>
          </div>
          <input
            type="checkbox"
            checked={config.monitoring}
            onChange={(e) => updateField("monitoring", e.target.checked)}
            className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500/50 bg-slate-900 border-slate-800 accent-cyan-400 cursor-pointer"
          />
        </label>

        {/* GitOps Sync */}
        <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/50 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all select-none">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-300">ArgoCD Auto-Sync</span>
            <p className="text-[10px] text-slate-500 leading-tight">Activate automated GitOps sync.</p>
          </div>
          <input
            type="checkbox"
            checked={config.gitops_sync}
            onChange={(e) => updateField("gitops_sync", e.target.checked)}
            className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500/50 bg-slate-900 border-slate-800 accent-cyan-400 cursor-pointer"
          />
        </label>

        {/* Network isolation */}
        <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-950/50 border border-slate-800 cursor-pointer hover:border-slate-700 transition-all select-none">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-300">Network Isolation</span>
            <p className="text-[10px] text-slate-500 leading-tight">Apply strict NetworkPolicies.</p>
          </div>
          <input
            type="checkbox"
            checked={config.network_isolation}
            onChange={(e) => updateField("network_isolation", e.target.checked)}
            className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500/50 bg-slate-900 border-slate-800 accent-cyan-400 cursor-pointer"
          />
        </label>
      </div>

      {/* Buttons */}
      <div className="flex gap-4 pt-2">
        <button
          type="button"
          disabled={isProcessing}
          onClick={onPlan}
          className="flex-1 bg-slate-950 hover:bg-slate-900 text-slate-300 font-semibold py-3.5 px-6 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex items-center justify-center gap-2 cursor-pointer text-sm shadow-inner disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Eye className="w-4 h-4 text-cyan-400" />
          Preview Terraform Plan
        </button>
        <button
          type="button"
          disabled={isProcessing}
          onClick={onDeploy}
          className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)] flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Server className="w-4 h-4 text-white" />
          {isProcessing ? "Deploying Infrastructure..." : "Deploy AWS Cluster"}
        </button>
      </div>
    </div>
  );
}
