"use client";

import React, { useState } from "react";
import { Terminal, Copy, Check, FileCode } from "lucide-react";
import { ConfigData } from "./AWSConfigForm";

interface TerraformPreviewProps {
  config: ConfigData;
}

export default function TerraformPreview({ config }: TerraformPreviewProps) {
  const [copied, setCopied] = useState(false);

  const generateHcl = () => {
    const safeName = config.name.toLowerCase().replace(/[^a-z0-9-_]/g, "-") || "cloudlaunch-env";
    
    return `# ==============================================================================
# CloudLaunch AWS GitOps & Observability Provisioning Plan
# Environment: ${config.name}
# Region: ${config.region}
# Generated: ${new Date().toISOString().split("T")[0]}
# ==============================================================================

terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "${config.region}"
}

# --- Virtual Private Cloud (VPC) Setup ---
module "vpc" {
  source = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"

  name = "${safeName}-vpc"
  cidr = "${config.vpc_cidr}"

  azs             = ["${config.region}a", "${config.region}b"]
  private_subnets = [${Array.from({ length: config.private_subnets })
    .map((_, i) => `"10.0.${10 + i}.0/24"`)
    .join(", ")}]
  public_subnets  = [${Array.from({ length: config.public_subnets })
    .map((_, i) => `"10.0.${i + 1}.0/24"`)
    .join(", ")}]

  enable_dns_hostnames = true
  enable_dns_support   = true

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = {
    Environment = "production"
    ManagedBy   = "CloudLaunch"
    Monitoring  = "${config.monitoring ? "true" : "false"}"
  }
}

# --- Cloud Compute Engine ---
resource "aws_instance" "app_nodes" {
  count         = 1
  ami           = "ami-0c7217cdde317cfec" # Amazon Linux 2023 AMI
  instance_type = "${config.instance_type}"
  subnet_id     = module.vpc.public_subnets[0]
  
  iam_instance_profile = aws_iam_instance_profile.app_profile.name

  root_block_device {
    volume_size           = ${config.storage_gb}
    volume_type           = "${config.volume_type}"
    encrypted             = true
    delete_on_termination = true
  }

  vpc_security_group_ids = [aws_security_group.app_sg.id]

  tags = {
    Name        = "${safeName}-ec2"
    Environment = "production"
    GitOpsSync  = "${config.gitops_sync ? "true" : "false"}"
  }
}

# --- Security & Isolation Policies ---
resource "aws_security_group" "app_sg" {
  name        = "${safeName}-sg"
  description = "CloudLaunch core security policy group"
  vpc_id      = module.vpc.vpc_id

  # Configured Security Group Ingress Rules
  ${config.security_groups.map((rule) => `
  ingress {
    from_port   = ${rule.port}
    to_port     = ${rule.port}
    protocol    = "${rule.protocol}"
    cidr_blocks = ["${rule.source}"]
    description = "Exposed ingress port ${rule.port}"
  }`).join("\n")}

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }
}

# --- Identity and Privilege Policies ---
resource "aws_iam_role" "app_role" {
  name = "${safeName}-iam-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "app_policy_attach" {
  role       = aws_iam_role.app_role.name
  policy_arn = "arn:aws:iam::aws:policy/${config.iam_policy}"
}

resource "aws_iam_instance_profile" "app_profile" {
  name = "${safeName}-iam-profile"
  role = aws_iam_role.app_role.name
}
`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateHcl());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightHcl = (text: string) => {
    return text.split("\n").map((line, idx) => {
      // Comments
      if (line.trim().startsWith("#")) {
        return <span key={idx} className="text-slate-500">{line}{"\n"}</span>;
      }
      // Blocks
      const highlighted = line
        .replace(/(module|resource|provider|terraform|variable|output|locals)\b/g, '<span class="text-pink-500 font-semibold">$1</span>')
        .replace(/(source|version|name|cidr|azs|private_subnets|public_subnets|enable_dns_hostnames|enable_dns_support|enable_nat_gateway|single_nat_gateway|tags|count|ami|instance_type|subnet_id|iam_instance_profile|root_block_device|volume_size|volume_type|encrypted|delete_on_termination|vpc_security_group_ids|description|vpc_id|ingress|egress|from_port|to_port|protocol|cidr_blocks|ipv6_cidr_blocks|assume_role_policy|role|policy_arn)\s*=/g, '<span class="text-cyan-400">$1</span> =')
        .replace(/(aws_[a-z0-9_]+)\b/g, '<span class="text-amber-400 font-medium">$1</span>')
        .replace(/("[^"]*")/g, '<span class="text-emerald-400">$1</span>');

      return <span key={idx} dangerouslySetInnerHTML={{ __html: highlighted + "\n" }} />;
    });
  };

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 bg-slate-900/60 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Terminal className="w-5 h-5 text-pink-500" />
          <span className="text-sm font-semibold text-slate-300 font-mono">main.tf</span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700/50 transition-all font-medium cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 font-mono">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="font-mono">Copy Code</span>
            </>
          )}
        </button>
      </div>

      <div className="p-5 font-mono text-xs overflow-y-auto max-h-[500px] flex-1 leading-relaxed text-slate-300 whitespace-pre scrollbar-thin scrollbar-thumb-slate-800 select-text">
        {highlightHcl(generateHcl())}
      </div>
    </div>
  );
}
