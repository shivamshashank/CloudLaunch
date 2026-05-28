# ==============================================================================
# CloudLaunch AWS GitOps & Observability Provisioning Plan
# Environment: Production Kubernetes EKS Cluster
# Region: us-east-1
# Generated: 2026-05-27T20:06:06.766Z
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
  region = "us-east-1"
}

# --- Virtual Private Cloud (VPC) Setup ---
module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.1.0"

  name = "production-kubernetes-eks-cluster-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b"]
  private_subnets = ["10.0.10.0/24", "10.0.11.0/24"]
  public_subnets  = ["10.0.1.0/24", "10.0.2.0/24"]

  enable_dns_hostnames = true
  enable_dns_support   = true

  enable_nat_gateway = true
  single_nat_gateway = true

  tags = {
    Environment = "production"
    ManagedBy   = "CloudLaunch"
    Monitoring  = "true"
  }
}

# --- Cloud Compute Engine ---
resource "aws_instance" "app_nodes" {
  count         = 1
  ami           = "ami-0c7217cdde317cfec" # Amazon Linux 2023 AMI
  instance_type = "t3.medium"
  subnet_id     = module.vpc.public_subnets[0]
  
  iam_instance_profile = aws_iam_instance_profile.app_profile.name

  root_block_device {
    volume_size           = 40
    volume_type           = "gp3"
    encrypted             = true
    delete_on_termination = true
  }

  vpc_security_group_ids = [aws_security_group.app_sg.id]

  tags = {
    Name        = "production-kubernetes-eks-cluster-ec2"
    Environment = "production"
    GitOpsSync  = "true"
  }
}

# --- Security & Isolation Policies ---
resource "aws_security_group" "app_sg" {
  name        = "production-kubernetes-eks-cluster-sg"
  description = "CloudLaunch core security policy group"
  vpc_id      = module.vpc.vpc_id

  
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Exposed ingress port 80"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Exposed ingress port 443"
  }

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
  name = "production-kubernetes-eks-cluster-iam-role"

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
  policy_arn = "arn:aws:iam::aws:policy/PowerUserAccess"
}

resource "aws_iam_instance_profile" "app_profile" {
  name = "production-kubernetes-eks-cluster-iam-profile"
  role = aws_iam_role.app_role.name
}
