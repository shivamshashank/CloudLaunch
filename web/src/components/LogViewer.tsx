"use client";

import React, { useState, useEffect, useRef } from "react";
import { Terminal, Download, Trash2, Copy, Check } from "lucide-react";
import { DeploymentLog } from "../lib/supabase";

interface LogViewerProps {
  logs: DeploymentLog[];
  onClear: () => void;
  title?: string;
  onDeleteDbLogs?: () => Promise<void>;
}

export default function LogViewer({ logs, onClear, title = "CloudLaunch Engine Logs", onDeleteDbLogs }: LogViewerProps) {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const handleCopy = () => {
    const rawText = logs
      .map((log) => `[${new Date(log.timestamp).toLocaleTimeString()}] [${log.level}] ${log.message}`)
      .join("\n");
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const rawText = logs
      .map((log) => `[${log.timestamp}] [${log.level}] ${log.message}`)
      .join("\n");
    const blob = new Blob([rawText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `cloudlaunch-logs-${new Date().toISOString().slice(0, 10)}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: DeploymentLog["level"]) => {
    switch (level) {
      case "SUCCESS":
        return "text-emerald-400 font-bold";
      case "WARN":
        return "text-amber-400 font-bold";
      case "ERROR":
        return "text-rose-500 font-bold";
      case "INFO":
      default:
        return "text-cyan-400";
    }
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[400px]">
      {/* Terminal Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 border-b border-slate-800 select-none">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
          </div>
          <span className="text-xs font-semibold text-slate-400 font-mono flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-slate-500" />
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Copy Logs */}
          <button
            disabled={logs.length === 0}
            onClick={handleCopy}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-1"
            title="Copy Logs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Download Logs */}
          <button
            disabled={logs.length === 0}
            onClick={handleDownload}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Download Logs"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          {/* Clear Logs */}
          <button
            disabled={logs.length === 0}
            onClick={async () => {
              if (onDeleteDbLogs) {
                if (confirm("Are you sure you want to permanently delete all logs for this deployment from the remote database?")) {
                  await onDeleteDbLogs();
                }
              } else {
                onClear();
              }
            }}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-400 hover:text-rose-400 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            title="Delete Logs from Database"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Terminal Screen */}
      <div ref={containerRef} className="flex-1 p-5 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-2 bg-black/90 scrollbar-thin scrollbar-thumb-slate-900 select-text">
        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-1 select-none">
            <span className="font-semibold text-xs">No active processes running.</span>
            <span>Logs will stream here upon plan, apply, or destroy operations.</span>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="flex flex-col sm:flex-row items-start gap-1 sm:gap-3 border-b border-slate-950 pb-1 hover:bg-slate-900/10">
              {/* Timestamp */}
              <span className="text-slate-600 select-none text-[10px] font-light">
                {new Date(log.timestamp).toLocaleTimeString()}
              </span>

              {/* Log Level */}
              <span className={`min-w-[55px] uppercase select-none text-[10px] font-semibold ${getLevelColor(log.level)}`}>
                [{log.level}]
              </span>

              {/* Message */}
              <span className="text-slate-300 break-all">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
