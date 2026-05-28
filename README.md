# 🚀 CloudLaunch — Self-Service AWS GitOps & Observability Platform

[![CI/CD Status](https://img.shields.io/github/actions/workflow/status/shivamshashank/CloudLaunch/ci-cd.yml?branch=main&style=flat-square)](https://github.com/shivamshashank/CloudLaunch/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Terraform](https://img.shields.io/badge/Terraform-844FBA?style=flat-square&logo=terraform&logoColor=white)](https://www.terraform.io/)
[![Kubernetes](https://img.shields.io/badge/Kubernetes-326CE5?style=flat-square&logo=kubernetes&logoColor=white)](https://kubernetes.io/)
[![AWS](https://img.shields.io/badge/AWS-232F3E?style=flat-square&logo=amazonaws&logoColor=white)](https://aws.amazon.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![ArgoCD](https://img.shields.io/badge/ArgoCD-EF7B4D?style=flat-square&logo=argo&logoColor=white)](https://argo-cd.readthedocs.io/)
[![Prometheus](https://img.shields.io/badge/Prometheus-E6522C?style=flat-square&logo=prometheus&logoColor=white)](https://prometheus.io/)
[![Grafana](https://img.shields.io/badge/Grafana-F46800?style=flat-square&logo=grafana&logoColor=white)](https://grafana.com/)

A production-style self-service AWS infrastructure deployment platform with a
web dashboard for one-click deployments, Terraform plan preview, cost
visibility, realtime logs, GitOps delivery, observability, reliability testing,
and automated rollback workflows.

CloudLaunch allows users to configure AWS infrastructure from a website, review
cost and Terraform plan output, deploy resources with one click, monitor
logs/status, and destroy infrastructure safely.

## Current MVP Implementation

This repository now contains the first working control-plane shape for the SaaS:

- Next.js dashboard for AWS onboarding, deployment creation, live logs, and
  destroy actions.
- Supabase tables for deployments, deployment logs, costs, AWS role
  configuration, deployment jobs, and generated artifacts.
- AWS role verification through cross-account `AssumeRole` with ExternalId.
- Deployment API that creates an apply job, renders a Terraform `main.tf`
  artifact, launches an EC2 observability host in the user's AWS account, and
  streams progress into Supabase Realtime.
- EC2 bootstrap script that installs Docker and starts Prometheus, Grafana,
  Loki, Promtail, and node-exporter.
- Secure log ingest endpoint for EC2 bootstrap logs.
- Destroy API that terminates the EC2 instance and cleans up the generated
  security group.

Supabase is used as the control plane and realtime event stream. Long-running
infrastructure work is handled by the deployment engine code under
`web/src/lib/deployment/`.

Required runtime environment variables:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
CLOUDLAUNCH_PUBLIC_URL=
CLOUDLAUNCH_LOG_INGEST_TOKEN=
```

`CLOUDLAUNCH_PUBLIC_URL` must be reachable from the EC2 instance so cloud-init
can stream bootstrap logs back to `/api/log-ingest`.

---

## 📖 Project Overview

CloudLaunch provides a web dashboard where users can select AWS deployment
options such as IAM policy templates, EC2 instance type, AWS region, VPC
configuration, security group rules, storage size, monitoring options, and
deployment settings.

The website uses Supabase for authentication, deployment records, realtime logs,
cost metadata, and job status tracking. Infrastructure is provisioned using
Terraform, application delivery is managed using ArgoCD and Helm, and workloads
are monitored using Prometheus, Grafana, Loki, Alertmanager, and OpenTelemetry.

The project also includes service mesh, load testing, chaos engineering,
security scanning, SLO/SLI dashboards, error-budget alerts, external secrets
management, FinOps checks, and incident response runbooks.

---

## ✨ Key Features

- Self-service web dashboard for AWS infrastructure configuration
- One-click AWS deployment and destroy workflows
- Supabase backend for authentication, deployment records, logs, costs, and job
  status
- Terraform plan preview before deployment
- Real-time deployment logs and deployment status tracking
- Cost estimate dashboard using Infracost
- AWS IAM policy, EC2 instance, VPC, security group, storage, region, and
  monitoring configuration
- AWS infrastructure provisioning using Terraform
- Kubernetes-based microservices deployment
- GitOps workflow using ArgoCD
- Helm-based application packaging
- CI/CD pipeline using GitHub Actions
- Docker image build and push to container registry
- Nginx Ingress for traffic routing
- Istio service mesh for mTLS, traffic splitting, retries, and telemetry
- Canary deployments using Istio traffic splitting
- External Secrets Operator with AWS Secrets Manager / HashiCorp Vault
- SLOs-as-code using Sloth / OpenSLO
- Horizontal Pod Autoscaling
- Prometheus metrics collection
- Grafana dashboards
- Loki-based centralized logging
- Alertmanager incident alerts
- OpenTelemetry distributed tracing
- k6 load testing
- Chaos engineering experiments
- Automated rollback for unhealthy deployments
- Trivy container image scanning
- Kubernetes NetworkPolicies
- Namespace-based environment isolation
- Incident runbooks and architecture documentation

---

## 🛠️ Tech Stack

### 🌐 Website and Backend

- Next.js / React
- Supabase Auth
- Supabase Database
- Supabase Realtime
- Supabase Storage
- Tailwind CSS

### ☁️ Cloud Platform

- AWS

### 🏗️ Infrastructure

- Terraform
- Kubernetes
- Helm
- Nginx Ingress
- Istio / Linkerd
- Kiali

### 🔄 GitOps and CI/CD

- GitHub Actions
- ArgoCD
- Docker
- GHCR / Docker Hub
- Infracost

### 📊 Observability

- Prometheus
- Grafana
- Loki
- Promtail
- Alertmanager
- OpenTelemetry

### 🧪 Reliability and Testing

- k6
- LitmusChaos / Chaos Mesh
- Kubernetes HPA
- Sloth / OpenSLO
- SLO/SLI dashboards
- Error budget alerts
- Canary deployments
- Automated rollback

### 🔒 Security

- Trivy
- Kubernetes NetworkPolicies
- External Secrets Operator
- AWS Secrets Manager / HashiCorp Vault
- Secrets management
- Namespace isolation
- mTLS

---

## 🏛️ Architecture

```text
User
   |
   v
CloudLaunch Web Dashboard
   |
   |-- Select AWS region
   |-- Select EC2 instance type
   |-- Select IAM policy template
   |-- Configure VPC, security groups, storage, and monitoring
   |-- View cost estimate
   |-- Preview Terraform plan
   |-- Click Deploy / Destroy
   |
   v
Supabase Backend
   |
   |-- Authentication
   |-- Deployment records
   |-- Realtime logs
   |-- Job status
   |-- Cost metadata
   |
   v
GitHub Repository
   |
   v
GitHub Actions CI/CD
   |
   |-- Build website and app images
   |-- Run tests
   |-- Run Trivy scan
   |-- Run Infracost estimate
   |-- Execute Terraform plan/apply workflow
   |-- Push image to registry
   |-- Update Helm chart version
   |
   v
ArgoCD
   |
   v
AWS Kubernetes Cluster
   |
   v
Nginx Ingress
   |
   v
Service Mesh Layer
   |
   |-- Istio / Linkerd
   |-- mTLS between services
   |-- Canary traffic splitting
   |-- Retries, timeouts, circuit breaking
   |-- Kiali service graph
   |
   v
Microservices Application
   |
   |-- Frontend
   |-- Backend API
   |-- Metrics endpoint
   |-- Health endpoint
   |-- External secrets mounted securely
   |
   v
Observability Stack
   |
   |-- Prometheus collects metrics
   |-- Grafana visualizes dashboards
   |-- Loki stores application logs
   |-- Alertmanager sends alerts
   |-- OpenTelemetry collects traces
   |
   v
Reliability Layer
   |
   |-- k6 load testing
   |-- Chaos experiments
   |-- SLOs-as-code using Sloth / OpenSLO
   |-- SLO/SLI dashboards
   |-- Error budget burn alerts
   |-- Canary analysis
   |-- Automated rollback
   |
   v
Incident Response and Recovery
   |
   |-- Alert triggered
   |-- Logs and metrics investigated
   |-- Failed release detected
   |-- ArgoCD rollback executed
   |-- System recovery verified
```

---

## 📂 Repository Structure

```text
cloudlaunch-aws-gitops-observability-platform/
├── web/
│   ├── app/
│   ├── components/
│   ├── pages/
│   └── lib/
├── supabase/
│   ├── migrations/
│   ├── functions/
│   └── policies/
├── deployment-engine/
│   ├── terraform-runner/
│   ├── job-worker/
│   └── log-streamer/
├── app/
│   ├── frontend/
│   ├── backend/
│   └── docker-compose.yml
├── terraform/
│   ├── aws/
│   └── modules/
├── kubernetes/
│   ├── namespaces/
│   ├── ingress/
│   ├── hpa/
│   └── network-policies/
├── helm/
│   └── microservices-app/
├── argocd/
│   ├── applications/
│   └── projects/
├── observability/
│   ├── prometheus/
│   ├── grafana/
│   ├── loki/
│   ├── alertmanager/
│   └── opentelemetry/
├── service-mesh/
│   ├── istio/
│   ├── traffic-splitting/
│   └── kiali/
├── secrets/
│   ├── external-secrets-operator/
│   ├── aws-secrets-manager/
│   └── vault/
├── reliability/
│   ├── k6/
│   ├── chaos/
│   └── slo/
├── finops/
│   ├── infracost/
│   └── github-actions/
├── security/
│   └── trivy/
├── runbooks/
├── docs/
│   ├── architecture.md
│   ├── screenshots/
│   └── demo.md
├── .github/
│   └── workflows/
│       └── ci-cd.yml
└── README.md
```

---

## 🗺️ Implementation Roadmap

### 📍 Phase 1: Web Dashboard and Supabase Backend

- Next.js/React web dashboard
- Supabase authentication
- Supabase tables for deployments, logs, costs, and status
- AWS configuration form with 10-12 deployment options
- Terraform plan preview screen
- One-click deploy and destroy buttons
- Realtime deployment log viewer
- Cost estimate dashboard

### 📍 Phase 2: Microservices Application

- Frontend service
- Backend API service
- `/health` endpoint
- `/metrics` endpoint
- Artificial latency/error endpoint for testing

### ☸️ Phase 3: Kubernetes Deployment

- Deployments
- Services
- ConfigMaps
- Secrets
- Ingress
- HPA
- Namespaces

### ☁️ Phase 4: AWS Infrastructure

- VPC
- Subnets
- Security groups
- EC2 / Kubernetes compute nodes
- IAM roles and IAM policy templates
- Storage configuration
- CloudWatch integration

### 🐙 Phase 5: GitOps with ArgoCD

- ArgoCD installation
- ArgoCD Application manifests
- Helm-based deployment
- Auto-sync configuration
- Rollback demo

### 🔭 Phase 6: Observability Stack

- Prometheus metrics scraping
- Grafana dashboards
- Loki logging
- Alertmanager alerts
- OpenTelemetry tracing
- Service health dashboard

### 🛡️ Phase 7: Reliability Engineering

- k6 load testing scripts
- Pod failure chaos test
- Latency injection test
- Node failure simulation
- SLO dashboard
- Error budget alert
- Rollback workflow

### 🔐 Phase 8: Security

- Trivy image scanning
- Kubernetes NetworkPolicies
- Namespace isolation
- Secret management
- Least-privilege IAM

### 🕸️ Phase 9: Service Mesh

- Istio or Linkerd installation
- mTLS between services
- Canary traffic splitting
- Retries, timeouts, and circuit breaking
- Kiali service graph
- Service mesh telemetry in Grafana

### 🔑 Phase 10: External Secrets Management

- External Secrets Operator installation
- AWS Secrets Manager or HashiCorp Vault integration
- ExternalSecret manifests
- Synced Kubernetes Secrets
- Application consuming secrets securely

### 📏 Phase 11: SLOs as Code

- Sloth or OpenSLO YAML definitions
- Availability SLO
- Latency SLO
- Error rate SLO
- Error budget burn-rate alerts
- Alertmanager integration

### 💰 Phase 12: FinOps and Cost Governance

- Infracost integration in GitHub Actions
- Pull request cost comments
- Monthly AWS cost estimate
- Terraform cost delta before apply
- Cost-aware infrastructure review process

---

## ⚙️ CI/CD Workflow

1. Code checkout
2. Unit tests
3. Website build
4. Docker image build
5. Trivy vulnerability scan
6. Infracost Terraform cost estimate
7. Terraform plan/apply workflow
8. Image push to registry
9. Helm chart update
10. ArgoCD sync trigger
11. Optional canary rollout validation

---

## 📈 Website Dashboard Pages

- Login / signup
- AWS configuration form
- IAM policy template selector
- EC2 instance selector
- VPC and security group configuration
- Storage and monitoring options
- Cost estimate page
- Terraform plan preview
- One-click deploy button
- Deployment status page
- Realtime logs page
- Destroy infrastructure button
- Deployment history page

---

## 📸 Screenshots to Include

1. CloudLaunch web dashboard
2. AWS configuration form
3. IAM policy selector
4. EC2 instance selector
5. Cost estimate screen
6. Terraform plan preview
7. One-click deployment trigger
8. Realtime deployment logs
9. Deployment status page
10. Destroy infrastructure workflow
11. GitHub Actions pipeline
12. Infracost PR cost comment
13. Trivy scan result
14. ArgoCD synced application
15. Kubernetes pods/services/ingress
16. HPA scaling
17. Prometheus targets
18. Grafana dashboard
19. Loki log query
20. Alertmanager alert
21. k6 load test result
22. Chaos experiment result
23. Istio/Kiali service graph
24. mTLS enabled between services
25. Canary traffic split
26. External Secrets synced secret
27. SLO YAML definition
28. Error budget burn alert
29. AWS infrastructure

---

## 🎥 Demo Flow

1. Show CloudLaunch website
2. Login using Supabase Auth
3. Select AWS configuration
4. Show cost estimate
5. Show Terraform plan preview
6. Click Deploy
7. Show realtime logs
8. Show deployment status
9. Show GitHub Actions pipeline
10. Show AWS resources created
11. Show ArgoCD sync
12. Show app running on Kubernetes
13. Show Grafana dashboard
14. Trigger load test
15. Trigger chaos experiment
16. Show alert firing
17. Show rollback/recovery
18. Destroy infrastructure

---

## 🎯 Expected Outcomes

- Product-style cloud platform engineering
- AWS infrastructure provisioning
- Terraform automation
- Supabase-backed deployment tracking
- One-click deployment workflows
- Kubernetes operations
- GitOps delivery
- CI/CD automation
- Production observability
- Cost visibility
- Incident detection
- Reliability testing
- Security scanning
- Rollback and recovery workflows

---

## 🔮 Future Improvements

- Add GCP support
- Add Azure support
- Add policy enforcement using OPA/Gatekeeper
- Add multi-region failover
- Add AI-based incident summarization

---

## 📄 License

This project is licensed under the MIT License.

---

## 👨‍💻 Author

**Shivam Shashank**

Cloud Engineer | DevOps | SRE | Kubernetes | Observability

- 💼 **LinkedIn:** Shivam Shashank
- 🌐 **Portfolio:** shivam-shashank.me
