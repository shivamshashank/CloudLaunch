import { DeploymentConfig, SUPPORTED_REGIONAL_AMIS } from "./config";

interface TerraformOptions {
  deploymentId: string;
  config: DeploymentConfig;
  userData: string;
}

function tfString(value: string) {
  return JSON.stringify(value);
}

function safeName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "cloudlaunch";
}

export function renderTerraformMain({ deploymentId, config, userData }: TerraformOptions) {
  const name = safeName(config.name);
  const ami = SUPPORTED_REGIONAL_AMIS[config.region] || SUPPORTED_REGIONAL_AMIS["us-east-1"];
  const ingressRules = config.security_groups
    .map(
      (rule) => `  ingress {
    from_port   = ${rule.port}
    to_port     = ${rule.port}
    protocol    = ${tfString(rule.protocol)}
    cidr_blocks = [${tfString(rule.source)}]
    description = ${tfString(`CloudLaunch ingress ${rule.port}`)}
  }`,
    )
    .join("\n\n");

  return `terraform {
  required_version = ">= 1.5.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = ${tfString(config.region)}
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  name          = ${tfString(name)}
  deployment_id = ${tfString(deploymentId)}
}

resource "aws_vpc" "main" {
  cidr_block           = ${tfString(config.vpc_cidr)}
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name         = "\${local.name}-vpc"
    ManagedBy    = "CloudLaunch"
    DeploymentId = local.deployment_id
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name         = "\${local.name}-igw"
    ManagedBy    = "CloudLaunch"
    DeploymentId = local.deployment_id
  }
}

resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = cidrsubnet(aws_vpc.main.cidr_block, 8, 1)
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true

  tags = {
    Name         = "\${local.name}-public-a"
    ManagedBy    = "CloudLaunch"
    DeploymentId = local.deployment_id
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name         = "\${local.name}-public-rt"
    ManagedBy    = "CloudLaunch"
    DeploymentId = local.deployment_id
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}

resource "aws_security_group" "observability" {
  name        = "\${local.name}-observability-sg"
  description = "CloudLaunch observability ingress"
  vpc_id      = aws_vpc.main.id

${ingressRules}

  egress {
    from_port        = 0
    to_port          = 0
    protocol         = "-1"
    cidr_blocks      = ["0.0.0.0/0"]
    ipv6_cidr_blocks = ["::/0"]
  }

  tags = {
    Name         = "\${local.name}-observability-sg"
    ManagedBy    = "CloudLaunch"
    DeploymentId = local.deployment_id
  }
}

resource "aws_instance" "observability" {
  ami                    = ${tfString(ami)}
  instance_type          = ${tfString(config.instance_type)}
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.observability.id]
  user_data_base64       = ${tfString(Buffer.from(userData).toString("base64"))}

  root_block_device {
    volume_size           = ${config.storage_gb}
    volume_type           = ${tfString(config.volume_type)}
    encrypted             = true
    delete_on_termination = true
  }

  tags = {
    Name         = "\${local.name}-observability"
    ManagedBy    = "CloudLaunch"
    DeploymentId = local.deployment_id
  }
}

output "instance_id" {
  value = aws_instance.observability.id
}

output "public_ip" {
  value = aws_instance.observability.public_ip
}

output "public_dns" {
  value = aws_instance.observability.public_dns
}

output "grafana_url" {
  value = "http://\${aws_instance.observability.public_ip}:3000"
}

output "prometheus_url" {
  value = "http://\${aws_instance.observability.public_ip}:9090"
}
`;
}
