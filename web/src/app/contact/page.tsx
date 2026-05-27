"use client";

import React, { useState } from "react";
import Navigation from "../../components/Navigation";
import { Mail, Send, CheckCircle2, MessageSquare, Building2, User } from "lucide-react";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate query submission
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
      setName("");
      setEmail("");
      setOrg("");
      setMessage("");
    }, 1500);
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 tech-grid scanline overflow-hidden">
      {/* Background neon glow */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <Navigation />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[650px] mx-auto px-6 py-16 space-y-12 relative z-10">
        
        {/* Title */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 text-xs font-mono">
            <Mail className="w-3.5 h-3.5" /> Support Channel
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Contact Us
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-sm mx-auto">
            Need help configuring custom AWS profiles or syncing EKS nodes? Reach out to our SRE team.
          </p>
        </div>

        {/* Contact Form Container */}
        <div className="bg-slate-900/60 backdrop-blur-2xl border border-slate-800/80 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          
          {submitted ? (
            <div className="flex flex-col items-center justify-center text-center py-12 space-y-4">
              <div className="p-4 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h2 className="text-xl font-bold text-white tracking-wide">Inquiry Logged!</h2>
              <p className="text-xs text-slate-450 max-w-xs leading-relaxed">
                Your request has been filed to our internal support channel. An SRE representative will reach out to your organizational email shortly.
              </p>
              <button
                onClick={() => setSubmitted(false)}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors pt-2 cursor-pointer"
              >
                Submit another message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Shivam Shashank"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium text-sm"
                    />
                  </div>
                </div>

                {/* Organization */}
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Organization
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={org}
                      onChange={(e) => setOrg(e.target.value)}
                      placeholder="e.g. CloudLaunch Devs"
                      className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  E-Mail Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. shivam@cloudlaunch.dev"
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium text-sm font-mono"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Inquiry Message
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-500" />
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your enterprise requirements or SRE policy guidelines..."
                    className="w-full bg-slate-950/80 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all font-medium text-sm leading-relaxed"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-center gap-2 cursor-pointer text-sm disabled:opacity-50"
              >
                {loading ? "Logging Inquiry..." : "Transmit Inquiry"}
                <Send className="w-4 h-4 text-white" />
              </button>

            </form>
          )}

        </div>

      </main>

      {/* Footer */}
      <footer className="py-8 border-t border-slate-900 bg-slate-950 text-center text-xs text-slate-500 font-mono select-none">
        CloudLaunch Self-Service AWS GitOps Platform • Under MIT License.
      </footer>
    </div>
  );
}
