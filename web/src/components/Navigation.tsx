"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";
import { Cloud, Menu, X, Shield, LogOut, Terminal, Activity } from "lucide-react";

export default function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Monitor auth status
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Emulate auth state updates by polling or listening if active
    const interval = setInterval(() => {
      supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user);
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.push("/");
  };

  const handleGoogleSignIn = async () => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/dashboard` }
    });
  };

  const isDashboardRoute = pathname?.startsWith("/dashboard");

  return (
    <nav className="sticky top-0 z-50 bg-slate-950/75 backdrop-blur-md border-b border-slate-900 px-6 py-4 flex items-center justify-between">
      {/* Brand Logo */}
      <Link href="/" className="flex items-center gap-2.5 group">
        <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.25)] group-hover:scale-105 transition-all">
          <Cloud className="w-5 h-5 text-white" />
        </div>
        <div>
          <span className="text-base font-bold tracking-wider text-white group-hover:text-cyan-400 transition-colors">
            CloudLaunch
          </span>
          <p className="text-[9px] font-mono text-slate-500">AWS GitOps Platform</p>
        </div>
      </Link>

      {/* Desktop Links */}
      <div className="hidden md:flex items-center gap-1">
        {!isDashboardRoute ? (
          // Public Navigation
          <>
            <Link
              href="/"
              className={`px-4 py-2 text-xs font-semibold tracking-wider rounded-lg transition-all ${
                pathname === "/" ? "text-cyan-400 bg-cyan-950/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Home
            </Link>
            <Link
              href="/about"
              className={`px-4 py-2 text-xs font-semibold tracking-wider rounded-lg transition-all ${
                pathname === "/about" ? "text-cyan-400 bg-cyan-950/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              About IaC
            </Link>
            <Link
              href="/contact"
              className={`px-4 py-2 text-xs font-semibold tracking-wider rounded-lg transition-all ${
                pathname === "/contact" ? "text-cyan-400 bg-cyan-950/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Contact Us
            </Link>
          </>
        ) : (
          // Private Dashboard Navigation
          <>
            <Link
              href="/dashboard"
              className={`px-4 py-2 text-xs font-semibold tracking-wider rounded-lg transition-all ${
                pathname === "/dashboard" ? "text-cyan-400 bg-cyan-950/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Overview Hub
            </Link>
            <Link
              href="/dashboard/new"
              className={`px-4 py-2 text-xs font-semibold tracking-wider rounded-lg transition-all ${
                pathname === "/dashboard/new" ? "text-cyan-400 bg-cyan-950/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Configure Cluster
            </Link>
            <Link
              href="/dashboard/deployments"
              className={`px-4 py-2 text-xs font-semibold tracking-wider rounded-lg transition-all ${
                pathname === "/dashboard/deployments" ? "text-cyan-400 bg-cyan-950/20" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Deployments & Logs
            </Link>
          </>
        )}
      </div>

      {/* Desktop Auth CTA */}
      <div className="hidden md:flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono hidden lg:inline-flex items-center gap-1.5 bg-slate-900/60 px-3 py-1.5 border border-slate-800 rounded-lg select-none">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              {user.email}
            </span>
            {!isDashboardRoute && (
              <Link
                href="/dashboard"
                className="bg-cyan-950/50 hover:bg-cyan-950 border border-cyan-800/80 hover:border-cyan-500 text-cyan-400 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.1)]"
              >
                Open Console
              </Link>
            )}
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 bg-slate-900 hover:bg-slate-850 px-3.5 py-2 rounded-xl border border-slate-800 hover:border-rose-950/10 transition-all font-semibold cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </div>
        ) : (
          <button
            onClick={handleGoogleSignIn}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer"
          >
            Access EKS Console
          </button>
        )}
      </div>

      {/* Mobile Burger Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden p-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all text-slate-350 cursor-pointer"
      >
        {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Mobile Menu Panel */}
      {mobileMenuOpen && (
        <div className="absolute top-[68px] left-0 right-0 bg-slate-950/95 border-b border-slate-900 flex flex-col p-6 space-y-4 md:hidden shadow-2xl z-40">
          {!isDashboardRoute ? (
            <>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 text-sm font-semibold border-b border-slate-900 ${
                  pathname === "/" ? "text-cyan-400" : "text-slate-400"
                }`}
              >
                Home
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 text-sm font-semibold border-b border-slate-900 ${
                  pathname === "/about" ? "text-cyan-400" : "text-slate-400"
                }`}
              >
                About IaC
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 text-sm font-semibold border-b border-slate-900 ${
                  pathname === "/contact" ? "text-cyan-400" : "text-slate-400"
                }`}
              >
                Contact Us
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 text-sm font-semibold border-b border-slate-900 ${
                  pathname === "/dashboard" ? "text-cyan-400" : "text-slate-400"
                }`}
              >
                Overview Hub
              </Link>
              <Link
                href="/dashboard/new"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 text-sm font-semibold border-b border-slate-900 ${
                  pathname === "/dashboard/new" ? "text-cyan-400" : "text-slate-400"
                }`}
              >
                Configure Cluster
              </Link>
              <Link
                href="/dashboard/deployments"
                onClick={() => setMobileMenuOpen(false)}
                className={`py-2 text-sm font-semibold border-b border-slate-900 ${
                  pathname === "/dashboard/deployments" ? "text-cyan-400" : "text-slate-400"
                }`}
              >
                Deployments & Logs
              </Link>
            </>
          )}

          {user ? (
            <div className="flex flex-col gap-3 pt-2">
              <span className="text-xs text-slate-500 font-mono select-none">{user.email}</span>
              {isDashboardRoute ? (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleSignOut();
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-rose-400 border border-slate-850 font-bold py-2 rounded-xl text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              ) : (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 text-cyan-400 font-bold py-2 rounded-xl text-xs transition-all text-center"
                >
                  Open Dashboard Console
                </Link>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                handleGoogleSignIn();
              }}
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-2 rounded-xl text-xs text-center block shadow-[0_0_15px_rgba(6,182,212,0.15)] cursor-pointer"
            >
              Access EKS Console
            </button>
          )}
        </div>
      )}
    </nav>
  );
}
