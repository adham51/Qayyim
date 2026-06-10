# قَيِّمْ (Qayyim) - AI-Powered Exam Greading (Production-Grade AWS Infra)

> AI-powered automated exam grading system, migrated from a single Docker Compose EC2 to a production-grade AWS architecture with VPC isolation, ALB/ASG auto-healing, managed data layer, and edge delivery via CloudFront.

**Live:** [qayyim.tech](https://qayyim.tech) · **App Repo:** [github.com/adham51/Qayyim](https://github.com/adham51/Qayyim)

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Tech Stack](#tech-stack)
3. [Phase-by-Phase Build Order](#phase-by-phase-build-order)
4. [Application Services](#application-services)
5. [Environment Variables](#environment-variables)
6. [Deployment Runbook](#deployment-runbook)
7. [Production Incidents & Lessons Learned](#production-incidents--lessons-learned)

---

## Architecture Overview

```
                        ┌─────────────────────────────────┐
                        │   Route 53 (qayyim.tech DNS)    │
                        └────────────────┬────────────────┘
                                         │
                        ┌────────────────▼────────────────┐
                        │   CloudFront + WAF               │
                        │   CDN, DDoS, edge caching        │
                        └────────────────┬────────────────┘
                                         │
┌────────────────────────────────────────▼──────────────────────────────────┐
│  qayyim-prod-vpc  (10.0.0.0/16)                                           │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  Public Subnets                                                      │ │
│  │   ALB (HTTPS 443, HTTP→HTTPS redirect)   NAT Gateway                │ │
│  └─────────────────────────┬────────────────────────────────────────────┘ │
│                             │                                             │
│  ┌──────────────────────────▼───────────────────────────────────────────┐ │
│  │  Private Subnets — App Tier                                          │ │
│  │   Auto Scaling Group (min 1 / desired 1 / max 2)                    │ │
│  │   EC2 t3.micro — Docker Compose                                     │ │
│  │   ├── nextjs_app        :3000                                       │ │
│  │   ├── ai_grading        :5000                                       │ │
│  │   ├── ai_upload         :5003                                       │ │
│  │   └── pdf_worker        (BullMQ queue consumer)                     │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
│                                                                           │
│  ┌──────────────────────────────────────────────────────────────────────┐ │
│  │  Private Subnets — Data Tier                                         │ │
│  │   RDS MySQL 8.0 (db.t3.micro)    ElastiCache Redis 7 (Serverless)   │ │
│  └──────────────────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────────────────┘

External:  ECR · S3 · Secrets Manager · ACM · Route 53
```

---

## Tech Stack

| Layer | Service | Notes |
|---|---|---|
| DNS | Route 53 | Migrated from Hostinger; ALIAS records for apex domain |
| CDN / Edge | CloudFront + WAF | Static asset caching, managed rule sets, rate limiting |
| SSL | ACM | Two certs: eu-central-1 (ALB) + us-east-1 (CloudFront) |
| Load Balancer | ALB | HTTP→HTTPS redirect, health checks on `/api/health` |
| Compute | EC2 t3.micro + ASG | Amazon Linux 2023, Docker Compose, IMDSv2 enforced |
| Container Registry | ECR | 4 repos: app, ai-grading, ai-upload, worker |
| Database | RDS MySQL 8.0 | Prisma ORM, automated backups, private subnet |
| Cache / Queue | ElastiCache Redis 7 Serverless | BullMQ job queues, TLS enforced |
| Object Storage | S3 | PDF uploads, pre-signed URLs |
| Secrets | Secrets Manager | All credentials injected to `.env` at EC2 boot |
| Access | SSM Session Manager | No open port 22 required |
| IaC | Terraform | Multi-env replication (prod/dev) |
| EKS | Migration in progress|

### Frontend

- **Next.js 15.3.3** - React framework with App Router
- **TypeScript 5** - Type-safe development
- **Tailwind CSS** - Modern styling
- **Shadcn/ui** - Beautiful UI components

### Backend

- **Next.js API Routes** - Serverless API endpoints
- **MySQL** - Relational database
- **Prisma ORM** - Type-safe database access
- **Zod 3.24.2** - Schema validation
- **JWT + bcrypt** - Authentication & authorization

---

## Phase-by-Phase Build Order

### Phase 1 — Networking

Create in this order: VPC → Internet Gateway → 4 subnets (2 public, 2 private across 2 AZs) → NAT Gateway (in public subnet) → 2 route tables (public → IGW, private → NAT).

Key things:
- Enable DNS hostnames + DNS resolution on the VPC — required for RDS and ECR endpoint resolution
- NAT Gateway must go in a **public** subnet with an Elastic IP
- Private subnets route `0.0.0.0/0` to the NAT, not the IGW

---

### Phase 2 — Security Groups & IAM

Create 5 SGs in this order (they reference each other, so order matters):

| SG | Key inbound rule |
|---|---|
| `qayyim-sg-alb` | 80, 443 from internet |
| `qayyim-sg-bastion` | 22 from your IP only |
| `qayyim-sg-app` | 3000 from ALB SG · 22 from bastion SG |
| `qayyim-sg-rds` | 3306 from app SG only |
| `qayyim-sg-redis` | 6379 from app SG only |

IAM Role `qayyim-ec2-role` — attach: `AmazonSSMManagedInstanceCore`, `AmazonEC2ContainerRegistryReadOnly`, `SecretsManagerReadWrite`, `AmazonS3FullAccess`.

---

### Phase 3 — Data Layer

**RDS MySQL** — place in a DB subnet group using both private subnets. Disable public access. Let RDS manage the password in Secrets Manager via the checkbox during creation.

**ElastiCache Redis Serverless** — easy to accidentally create in the wrong VPC since the VPC selector is buried. Explicitly set the VPC and security group in the Connectivity section. VPC cannot be changed after creation.

**S3** — bucket for PDF uploads. Public read via bucket policy for file downloads. CORS configured for pre-signed URL uploads from the frontend.

---

### Phase 4 — Secrets & Certificates

**Secrets Manager** — store all sensitive env vars as a single secret (`qayyim/prod/app`). Store `DATABASE_URL` as a complete pre-built connection string, not assembled from parts — RDS auto-rotated passwords contain special characters that break URL construction at runtime.

**ACM** — two certificates required for the same domain:
- `eu-central-1` → attached to ALB
- `us-east-1` → attached to CloudFront (hard AWS requirement, no exceptions)

With Route 53, validation is one click ("Create record in Route 53" button).

---

### Phase 5 — Compute: EC2 + ASG + ALB

**Launch Template** — AMI: Amazon Linux 2023 (SSM agent + AWS CLI pre-installed). Set IMDSv2 hop limit to `2` — required for Docker containers to reach instance metadata for IAM role credentials.

User data script runs on every fresh instance boot:

```bash
#!/bin/bash
exec > /var/log/user-data.log 2>&1
echo "=== Starting setup ===" && date

yum update -y
yum install -y docker jq aws-cli
systemctl enable docker && systemctl start docker
usermod -a -G docker ec2-user

curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64" \
  -o /usr/local/bin/docker-compose && chmod +x /usr/local/bin/docker-compose

mkdir -p /home/ec2-user/app && cd /home/ec2-user/app

aws secretsmanager get-secret-value \
  --secret-id qayyim/prod/app --region eu-central-1 \
  --query SecretString --output text \
  | jq -r 'to_entries|map("\(.key)=\(.value)")|.[]' \
  > /home/ec2-user/app/.env

cat >> /home/ec2-user/app/.env <<'EOF'
NODE_ENV=production
AWS_REGION=eu-central-1
AWS_S3_BUCKET_NAME=ai-exam-grader-pdfs
OCR_SERVICE_URL=http://localhost:5003
AI_GRADING_SERVICE_URL=http://localhost:5000
EOF

aws s3 cp s3://ai-exam-grader-pdfs/config/docker-compose.prod.yml \
  /home/ec2-user/app/docker-compose.yml

aws ecr get-login-password --region eu-central-1 | \
  docker login --username AWS --password-stdin \
  491991045754.dkr.ecr.eu-central-1.amazonaws.com

docker-compose pull && docker-compose up -d
echo "=== Setup complete ===" && date
```

**Target Group** — type: Instances, port 3000, health check path `/api/health`, grace period 300s.

**ALB** — internet-facing, both public subnets, HTTP:80 redirects to HTTPS:443.

**ASG** — both private subnets, attach to target group, health check type: ELB, grace period 300s, desired 1 / max 2.

---

### Phase 6 — Edge: CloudFront + WAF

**CloudFront** — origin is the ALB DNS name. Cache `/static/*` and `/_next/static/*`. Pass through `/api/*` uncached. Attach the us-east-1 ACM cert and custom domain.

**WAF** — AWS Managed Rules (Common Rule Set + Known Bad Inputs) + rate limiting rule. Associate with the CloudFront distribution.

**Route 53** — after CloudFront is created, point both `qayyim.tech` and `www.qayyim.tech` as ALIAS records to the CloudFront distribution domain.

---

### Phase 7 — CI/CD & IaC

**GitHub Actions** — build → Trivy scan → push to ECR with SHA tag → SSM Run Command to pull and restart containers on EC2.

**Terraform (in progress)** — modular structure (`modules/vpc`, `modules/rds`, etc.) with separate `envs/prod` and `envs/dev` var files. S3 + DynamoDB backend for state locking.

---

## Application Services

| Container | Port | Role |
|---|---|---|
| `nextjs_app_qayim` | 3000 | Next.js frontend + API routes + Prisma ORM |
| `ai_grading_container` | 5000 | Flask — RAG grading (ChromaDB + LangChain + Qwen 2.5-7B) |
| `ai_upload_container` | 5003 | Flask — OCR extraction, vector store ingestion |
| `pdf_worker_qayim` | — | Node.js BullMQ worker, consumes `{pdf-processing}` queue |

All four containers share a Docker bridge network on the EC2. Next.js calls Flask services via `localhost` — not Docker service names — since they bind to all interfaces.

---

## Environment Variables

**Secrets Manager (`qayyim/prod/app`):**
```
DATABASE_URL, REDIS_URL, JWT_SECRET,
OPENROUTER_API_KEY, GOOGLE_API_KEY, GEMINI_API_KEY, HF_TOKEN, RESEND_API
```

**Appended by user data (non-sensitive):**
```
NODE_ENV, AWS_REGION, AWS_S3_BUCKET_NAME, OCR_SERVICE_URL, AI_GRADING_SERVICE_URL
```

**Not in `.env` at all:** `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` — the EC2 IAM role handles S3, ECR, and Secrets Manager authentication automatically via instance metadata. Never use hardcoded keys on EC2.

---

## Deployment Runbook

**Deploy a new image:**
```bash
docker build -t qayyim-app . && \
docker tag qayyim-app:latest 491991045754.dkr.ecr.eu-central-1.amazonaws.com/qayyim-app:latest && \
docker push 491991045754.dkr.ecr.eu-central-1.amazonaws.com/qayyim-app:latest

# On EC2 via SSM:
cd /home/ec2-user/app && docker-compose pull && docker-compose up -d
```

**Import SQL dump to RDS:**
```bash
# Copy dump to bastion, then from bastion:
sudo yum install -y mysql
mysql -h <rds-endpoint> -u admin -p'PASSWORD' qayyim < dump.sql
```

**Check container logs:**
```bash
docker logs nextjs_app_qayim --tail 100 -f
sudo cat /var/log/user-data.log   # debug boot script
```

---

## Production Incidents & Lessons Learned

### 1. ASG Infinite Launch-Terminate Loop

**Problem:** ASG kept launching instances, failing health checks, and terminating in a loop. Burned through free tier hours rapidly.

**Root cause:** NAT Gateway didn't exist yet. Private subnet EC2s had no outbound internet — couldn't reach ECR to pull images or Secrets Manager to fetch credentials. App never started, port 3000 never opened, ALB marked unhealthy, ASG terminated and retried.

**Solution:** Set ASG desired=0 to stop the loop immediately. Created NAT Gateway, updated private route table, then set desired=1.

**Lesson:** NAT Gateway is a hard dependency for everything in private subnets — ECR, Secrets Manager, SSM Agent, package installs. Validate outbound connectivity before launching anything else.

---

### 2. The 3000-Second Split-Brain

**Problem:** During an instance refresh, the ALB routed traffic to both the old broken instance and the new fixed one simultaneously. Every browser refresh was a coin flip.

**Root cause:** ASG Health Check Grace Period was set to 3000 seconds. The ALB marked the new instance healthy immediately, but the ASG was forced to keep the old instance alive for 50 minutes before terminating it. Both registered in the target group, both serving traffic.

**Solution:** Reduced grace period to 300 seconds. Manually terminated the old instance to force a clean cutover.

**Lesson:** Grace period is not "how long before marking unhealthy" — it's "how long the ASG ignores health checks entirely." Understand the difference before setting it.

---

### 3. ElastiCache Created in Wrong VPC

**Problem:** Redis ended up in the default VPC. App servers couldn't reach it — connection timeouts on every Redis operation.

**Root cause:** ElastiCache Serverless buries the VPC selector. AWS silently defaulted to the default VPC.

**Solution:** Deleted and recreated, explicitly selecting the correct VPC in the Connectivity section. VPC cannot be changed after creation.

**Lesson:** Always verify VPC, subnet, and security group on every resource before clicking Create.

---

### 4. BullMQ CROSSSLOT Error on ElastiCache Serverless

**Problem:** Every PDF upload failed with `ERR Script attempted to access keys that do not hash to the same slot`. No jobs were processed.

**Root cause:** ElastiCache Serverless runs cluster mode internally. BullMQ's Lua scripts atomically operate on multiple keys. In cluster mode, keys must hash to the same slot — without hash tags, `bull:pdf-processing:wait` and `bull:pdf-processing:active` land on different slots.

**Solution:** Added Redis hash tags to the queue name everywhere: `'{pdf-processing}'` instead of `'pdf-processing'`. All `bull:{pdf-processing}:*` keys now hash to the same slot. Code change only, no infra change.

**Lesson:** ElastiCache Serverless is not a plain Redis instance. Any library using multi-key Lua scripts requires hash tags or will fail in cluster mode.

---

### 5. S3 `Resolved credential object is not valid` — 3-Part Fix

**Problem:** App running, UI loading, but every PDF upload threw a credential error from the AWS SDK S3 client.

**Root cause (Part 1 — IMDSv2 hop limit):** Docker containers are one network hop from the EC2 host. IMDSv2 default hop limit is 1 — the metadata token request died before reaching the EC2. SDK couldn't retrieve IAM role credentials.

**Solution:** Updated Launch Template metadata hop limit from 1 to 2.

**Root cause (Part 2 — hardcoded credentials block):** `src/lib/s3.ts` had an explicit `credentials: { accessKeyId, secretAccessKey }` block in the S3Client constructor. This overrides the SDK's automatic credential chain. With no keys in `.env`, the SDK received `undefined` and threw "not valid" instead of falling through to the IAM role.

**Solution:** Removed the credentials block entirely. SDK now auto-detects: env vars → `~/.aws` → EC2 instance metadata.

**Root cause (Part 3 — validation function):** A startup validation function required `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` to be present, throwing before the S3Client was even created.

**Solution:** Removed those two keys from the required array — they're not needed when using IAM roles.

**Lesson:** On EC2, never hardcode AWS credentials. The SDK credential chain handles everything automatically if you get out of its way.

---

### 6. Auto-Rotated RDS Password Breaking DATABASE_URL

**Problem:** After Secrets Manager auto-rotated the RDS password, newly launched EC2 instances from the ASG couldn't connect to the database. Existing instances were fine; only fresh boots broke.

**Root cause:** The user data script assembled `DATABASE_URL` from individual parts at boot time. The auto-rotated password contained special characters (`[`, `]`, `:`, `@`) that break URL parsing when unescaped. `jq` doesn't URL-encode values during extraction.

**Solution:** Stored `DATABASE_URL` as a single complete pre-built connection string in Secrets Manager with the password already URL-encoded. The script writes it directly — no assembly at runtime.

**Lesson:** Never assemble connection strings at boot from parts. Store the full URL as one secret. Also: test a full ASG instance launch after each password rotation cycle — existing connections won't reveal the issue.

---

### 7. RDS Proxy Created by Accident

**Problem:** RDS Proxy began provisioning during DB creation — ~$11/month with no benefit at this scale.

**Root cause:** Accidentally checked the RDS Proxy checkbox in Additional Configuration.

**Solution:** Deleted it immediately from RDS → Proxies before it finished provisioning.

**Lesson:** Read every section of the creation form before submitting. AWS has many opt-in paid features scattered throughout.

---

### 8. SSM Session Manager Offline Despite Correct IAM Role

**Problem:** SSM Agent showed offline on all private subnet EC2s despite `AmazonSSMManagedInstanceCore` being correctly attached.

**Root cause:** SSM Agent needs outbound HTTPS to reach AWS SSM endpoints. Private subnet instances route outbound through NAT — which didn't exist yet.

**Solution:** Creating the NAT Gateway resolved it automatically within minutes.

**Lesson:** SSM, ECR, Secrets Manager — all require the same outbound path through NAT. It's not optional for private subnets.