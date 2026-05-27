import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CloudLaunch — Self-Service AWS GitOps & Observability Platform",
  description:
    "Provision AWS infrastructure in one click. Preview Terraform plans, analyze Infracost budgets, stream real-time logs, and integrate GitOps with ArgoCD.",
  keywords: [
    "AWS",
    "Terraform",
    "GitOps",
    "ArgoCD",
    "Kubernetes",
    "Observability",
    "SRE",
    "Prometheus",
    "Grafana",
    "Infracost",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-300">
        {children}
      </body>
    </html>
  );
}
