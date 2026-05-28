"use client";

import React from "react";
import Navigation from "../../components/Navigation";
import { Cpu, Server, GitBranch, Heart, BookOpen, Layers, Shield } from "lucide-react";

export default function About() {
  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 tech-grid scanline overflow-hidden">
      {/* Background neon glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <Navigation />

      {/* Main Container */}
      <main className="flex-1 w-full max-w-[900px] mx-auto px-6 py-16 space-y-12 relative z-10">
        
        {/* Header Title */}
        <div className="space-y-4 text-center">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-cyan-400 text-xs font-mono">
            <BookOpen className="w-3.5 h-3.5" /> Platform Architecture
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            About CloudLaunch
          </h1>
          <p className="text-slate-400 text-sm md:text-base leading-relaxed max-w-xl mx-auto">
            Democratizing secure cloud deployment engineering through self-service developer automation and strict SRE standards.
          </p>
        </div>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          
          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <Cpu className="w-5 h-5 text-cyan-400" />
              <h2 className="text-base font-bold text-white tracking-wide">Self-Service Platform</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Typically, cloud provisioning requires dedicated DevOps pipelines, PR approvals, and manual review loops. CloudLaunch gives product developers the power to self-service standard sandboxes under safe security profiles, reducing setup time from days to minutes.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <GitBranch className="w-5 h-5 text-pink-400" />
              <h2 className="text-base font-bold text-white tracking-wide">GitOps Delivery</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              All configurations deployed are mapped to Git repositories. When clusters spin up, ArgoCD controllers automatically reconcile public configurations, applying the latest Kubernetes manifests safely without exposing direct EKS cluster endpoints to outer networks.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <Layers className="w-5 h-5 text-amber-400" />
              <h2 className="text-base font-bold text-white tracking-wide">Dynamic IaC Generators</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every parameter chosen (regions, volume sizes, subnet counts) maps directly into live Terraform HCL modules. The dashboard renders main.tf in real-time, helping developers inspect precisely what will be created in the cloud before clicking Deploy.
            </p>
          </div>

          <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <Server className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white tracking-wide">SRE Observability</h2>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Observability is never an afterthought. Every cluster includes built-in Prometheus scraping, Loki logs, OpenTelemetry trace channels, and Alertmanager setups. Developers get instantly available health summaries to track running workloads.
            </p>
          </div>

        </div>

        {/* Mission Statement */}
        <div className="p-8 rounded-2xl bg-slate-900/20 border border-slate-900 flex flex-col md:flex-row items-center gap-6">
          <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-cyan-400">
            <Heart className="w-8 h-8 animate-pulse" />
          </div>
          <div className="space-y-1.5 text-center md:text-left">
            <h3 className="text-sm font-bold text-white tracking-wide">Platform Engineering Mission</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Developed by **Shivam Shashank** as a showcase of cloud-native orchestration. Dedicated to bridging the gap between infrastructure automation, developer experience (DevEx), and site reliability engineering (SRE).
            </p>
          </div>
        </div>

        {/* Minimum AWS IAM Credentials Section */}
        <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <Shield className="w-5 h-5 text-cyan-400 animate-pulse" />
            <h2 className="text-base font-bold text-white tracking-wide">AWS IAM Minimum Policy Requirements</h2>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            To configure AWS and allow CloudLaunch to safely spin up VPC networking, EBS storage volumes, EC2 computes, and IAM profiles locally on your host machine, you must configure a least-privilege IAM policy. Copy and attach the following JSON statement to your AWS IAM user or role:
          </p>
          <div className="bg-black/90 p-4 rounded-xl border border-slate-850 font-mono text-[10px] leading-relaxed max-h-[300px] overflow-y-auto text-cyan-300 whitespace-pre scrollbar-thin scrollbar-thumb-slate-850">
{`{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudLaunchLeastPrivilegePermissions",
      "Effect": "Allow",
      "Action": [
        "ec2:CreateVpc",
        "ec2:DeleteVpc",
        "ec2:DescribeVpcs",
        "ec2:ModifyVpcAttribute",
        "ec2:CreateSubnet",
        "ec2:DeleteSubnet",
        "ec2:DescribeSubnets",
        "ec2:ModifySubnetAttribute",
        "ec2:CreateInternetGateway",
        "ec2:DeleteInternetGateway",
        "ec2:DescribeInternetGateways",
        "ec2:AttachInternetGateway",
        "ec2:DetachInternetGateway",
        "ec2:CreateRouteTable",
        "ec2:DeleteRouteTable",
        "ec2:DescribeRouteTables",
        "ec2:AssociateRouteTable",
        "ec2:DisassociateRouteTable",
        "ec2:CreateRoute",
        "ec2:DeleteRoute",
        "ec2:CreateSecurityGroup",
        "ec2:DeleteSecurityGroup",
        "ec2:DescribeSecurityGroups",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:AuthorizeSecurityGroupEgress",
        "ec2:RevokeSecurityGroupIngress",
        "ec2:RevokeSecurityGroupEgress",
        "ec2:CreateNatGateway",
        "ec2:DeleteNatGateway",
        "ec2:DescribeNatGateways",
        "ec2:AllocateAddress",
        "ec2:ReleaseAddress",
        "ec2:DescribeAddresses",
        "ec2:RunInstances",
        "ec2:TerminateInstances",
        "ec2:DescribeInstances",
        "ec2:DescribeInstanceStatus",
        "iam:CreateRole",
        "iam:DeleteRole",
        "iam:GetRole",
        "iam:PassRole",
        "iam:CreateInstanceProfile",
        "iam:DeleteInstanceProfile",
        "iam:GetInstanceProfile",
        "iam:AddRoleToInstanceProfile",
        "iam:RemoveRoleFromInstanceProfile",
        "iam:AttachRolePolicy",
        "iam:DetachRolePolicy",
        "iam:ListAttachedRolePolicies"
      ],
      "Resource": "*"
    }
  ]
}`}
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
