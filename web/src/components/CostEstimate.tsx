"use client";

import React from "react";
import { DollarSign, TrendingUp, AlertTriangle, Info } from "lucide-react";
import { ConfigData } from "./AWSConfigForm";

interface CostEstimateProps {
  config: ConfigData;
}

export default function CostEstimate({ config }: CostEstimateProps) {
  // Pricing Constants
  const getInstancePrice = (type: string): { hourly: number; monthly: number } => {
    switch (type) {
      case "t3.micro":
        return { hourly: 0.0104, monthly: 7.50 };
      case "t3.medium":
        return { hourly: 0.0416, monthly: 30.00 };
      case "m5.large":
        return { hourly: 0.0960, monthly: 69.12 };
      case "c6i.xlarge":
        return { hourly: 0.1700, monthly: 122.40 };
      default:
        return { hourly: 0, monthly: 0 };
    }
  };

  const getStoragePricePerGb = (type: string): number => {
    switch (type) {
      case "gp3": return 0.08;
      case "gp2": return 0.10;
      case "io2": return 0.15;
      default: return 0.08;
    }
  };

  const computePrices = () => {
    const instance = getInstancePrice(config.instance_type);
    
    // Compute storage monthly cost
    const storageMonthly = config.storage_gb * getStoragePricePerGb(config.volume_type);
    const storageHourly = storageMonthly / 720;

    // SRE Monitoring flat rate
    const monitoringMonthly = config.monitoring ? 15.00 : 0.00;
    const monitoringHourly = monitoringMonthly / 720;

    // Network / GitOps overhead estimate
    const syncOverhead = config.gitops_sync ? 2.50 : 0.00;

    const monthlyTotal = instance.monthly + storageMonthly + monitoringMonthly + syncOverhead;
    const hourlyTotal = instance.hourly + storageHourly + monitoringHourly + (syncOverhead / 720);

    return {
      compute: instance.monthly,
      storage: storageMonthly,
      monitoring: monitoringMonthly,
      overhead: syncOverhead,
      monthlyTotal,
      hourlyTotal,
    };
  };

  const costs = computePrices();

  // Compute percentages for the visual bar chart
  const computePct = (val: number) => {
    if (costs.monthlyTotal === 0) return 0;
    return (val / costs.monthlyTotal) * 100;
  };

  const computePercentage = computePct(costs.compute);
  const storagePercentage = computePct(costs.storage);
  const monitoringPercentage = computePct(costs.monitoring);
  const overheadPercentage = computePct(costs.overhead);

  const isBudgetWarning = costs.monthlyTotal > 80;

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <TrendingUp className="w-5 h-5 text-emerald-400" />
        <h2 className="text-lg font-bold text-white tracking-wide">FinOps Budget Estimator</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Monthly Estimate */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Monthly Recurring Cost
          </span>
          <div className="flex items-baseline gap-1">
            <DollarSign className="w-5 h-5 text-emerald-400 self-center" />
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {costs.monthlyTotal.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500 font-medium">/mo</span>
          </div>
        </div>

        {/* Hourly Estimate */}
        <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
            Hourly Consumption Rate
          </span>
          <div className="flex items-baseline gap-0.5">
            <DollarSign className="w-4 h-4 text-emerald-400 self-center" />
            <span className="text-2xl font-bold text-slate-200 font-mono tracking-tight">
              {costs.hourlyTotal.toFixed(4)}
            </span>
            <span className="text-xs text-slate-500 font-medium">/hr</span>
          </div>
        </div>
      </div>

      {/* Visual Cost Allocation Bar */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs font-semibold text-slate-400">
          <span>Cost Allocation Breakdown</span>
          <span className="text-slate-500">100% Infracost Matching</span>
        </div>
        <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden flex">
          {computePercentage > 0 && (
            <div
              style={{ width: `${computePercentage}%` }}
              className="bg-cyan-500 transition-all duration-500"
              title={`Compute: $${costs.compute.toFixed(2)}`}
            />
          )}
          {storagePercentage > 0 && (
            <div
              style={{ width: `${storagePercentage}%` }}
              className="bg-purple-500 transition-all duration-500"
              title={`Storage: $${costs.storage.toFixed(2)}`}
            />
          )}
          {monitoringPercentage > 0 && (
            <div
              style={{ width: `${monitoringPercentage}%` }}
              className="bg-amber-500 transition-all duration-500"
              title={`Monitoring: $${costs.monitoring.toFixed(2)}`}
            />
          )}
          {overheadPercentage > 0 && (
            <div
              style={{ width: `${overheadPercentage}%` }}
              className="bg-pink-500 transition-all duration-500"
              title={`Overhead: $${costs.overhead.toFixed(2)}`}
            />
          )}
        </div>
        
        {/* Legend */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-cyan-500" />
            <span>EC2 Compute (${costs.compute.toFixed(2)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-purple-500" />
            <span>EBS SSD (${costs.storage.toFixed(2)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-amber-500" />
            <span>Telemetry (${costs.monitoring.toFixed(2)})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded bg-pink-500" />
            <span>Overhead (${costs.overhead.toFixed(2)})</span>
          </div>
        </div>
      </div>

      {/* Warnings & Advisories */}
      {isBudgetWarning ? (
        <div className="flex gap-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <div className="space-y-0.5">
            <span className="text-xs font-bold">Standard Budget Warning</span>
            <p className="text-[10px] text-amber-400/80 leading-normal">
              This deployment plan exceeds the standard development sandbox limit ($80.00/mo). Verify billing authorization before launching.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex gap-3 p-3.5 rounded-xl bg-slate-950/50 border border-slate-800/80 text-slate-400">
          <Info className="w-5 h-5 flex-shrink-0 text-cyan-400" />
          <p className="text-[10px] leading-normal">
            Pricing calculated using current <strong className="text-slate-300">us-east-1</strong> AWS spot rates and Infracost metadata. Actual billing may vary by AWS region.
          </p>
        </div>
      )}
    </div>
  );
}
