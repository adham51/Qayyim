# AWS Migration Analysis: Qayyim Exam Management System
**Comprehensive Infrastructure Extraction & Deployment Configuration**  
**Generated:** May 29, 2026  
**Application:** Qayyim (AI-Powered Exam Management System)  

---

## Table of Contents
1. [Port Mappings](#1-port-mappings)
2. [Environment Variables & Secrets](#2-environment-variables--secrets)
3. [Inter-Service Communication](#3-inter-service-communication)
4. [Database Configuration](#4-database-configuration)
5. [Storage & File Paths](#5-storage--file-paths)
6. [Health Check Endpoints](#6-health-check-endpoints)
7. [Background Jobs & Workers](#7-background-jobs--workers)
8. [External Dependencies](#8-external-dependencies)
9. [Docker & Build Configuration](#9-docker--build-configuration)
10. [Startup Order & Dependencies](#10-startup-order--dependencies)
11. [Services Summary Table](#11-services-summary-table)
12. [AWS Deployment Mapping](#12-aws-deployment-mapping)

---

## 1. Port Mappings

### Service Port Exposure

| Service | Container Port | Host/External Port | Protocol | Direction | Notes |
|---------|----------------|-------------------|----------|-----------|-------|
| **MySQL** | 3306 | 3307 | TCP | 🔒 Internal only | Database server, no internet exposure |
| **Redis** | 6379 | 6379 | TCP | 🔒 Internal only | In-memory data store, local network only |
| **PHPMyAdmin** | 80 | 9000 | HTTP | 🌐 Public (dev only) | **CRITICAL: Remove from prod, use AWS RDS console** |
| **AI Grading** | 5000 | 5000 | HTTP | 🔒 Internal | Flask API, accessed by app only |
| **AI Upload** | 5003 | 5003 | HTTP | 🔒 Internal | Flask API, accessed by app only |
| **Next.js App** | 3000 | 3000 | HTTP | 🌐 Public | Main frontend/backend, ALB target |
| **PDF Worker** | N/A | N/A | N/A | 🔒 Background | No ports, async processing |
| **Next.js Dev** | 9002 | 9002 | HTTP | 🌐 Public (dev) | Development server only |

### Inter-Service Port Communication

```
┌─────────────────────────────────────────────────────────┐
│ Next.js App (3000)                                      │
│  ├─→ MySQL (3306) - Prisma ORM queries                 │
│  ├─→ Redis (6379) - BullMQ job queue, caching          │
│  ├─→ AI Grading (5000) - POST /grade requests          │
│  ├─→ AI Upload (5003) - POST /upload_reference         │
│  └─→ AWS S3 - Direct HTTPS file uploads                │
├─────────────────────────────────────────────────────────┤
│ AI Grading (5000)                                       │
│  ├─→ MySQL (3306) - Query vector DB metadata           │
│  └─→ Local ChromaDB - Vector embeddings                │
├─────────────────────────────────────────────────────────┤
│ AI Upload (5003)                                        │
│  ├─→ MySQL (3306) - Metadata storage                   │
│  ├─→ Redis (6379) - Job queueing (optional)            │
│  └─→ ChromaDB (./vector_store) - Vector storage        │
├─────────────────────────────────────────────────────────┤
│ PDF Worker (Node.js)                                    │
│  ├─→ MySQL (3306) - Store processing results           │
│  └─→ Redis (6379) - BullMQ job consumption             │
└─────────────────────────────────────────────────────────┘
```

### 🚨 AWS Breaking Changes for Port Communication

| Current | Issue | AWS Solution |
|---------|-------|--------------|
| `mysql` hostname | Docker DNS resolution fails on RDS | Use RDS endpoint: `qayyim-db.c5fx7u9k1234.us-east-1.rds.amazonaws.com` |
| `redis` hostname | ElastiCache endpoint different | Use ElastiCache endpoint: `qayyim-redis.5abcde.ng.0001.use1.cache.amazonaws.com` |
| `localhost:3306` | Not accessible from ECS tasks | Update to RDS endpoint |
| `localhost:6379` | ElastiCache in VPC only | Same VPC/security group as ECS tasks |

---

## 2. Environment Variables & Secrets

### 2.1 Complete Environment Variable List

#### **DATABASE & PERSISTENCE**
| Variable | Value | Type | AWS Storage | Required | Notes |
|----------|-------|------|-------------|----------|-------|
| `DATABASE_URL` | `mysql://root:PASSWORD@mysql:3306/qayyim_db` | String | **Secrets Manager** | ✅ Yes | RDS endpoint for production |
| `REDIS_URL` | `redis://redis:6379` | String | **Secrets Manager** | ✅ Yes | ElastiCache endpoint for production |
| `MYSQL_ROOT_PASSWORD` | `[REDACTED]` | Secret | **Secrets Manager** | ✅ Yes | RDS master password |
| `MYSQL_DATABASE` | `qayyim_db` | String | SSM Parameter Store | ✅ Yes | Database name (non-secret) |
| `NODE_ENV` | `production` | String | ECS Task Def | ✅ Yes | Production environment flag |

#### **JWT & AUTHENTICATION**
| Variable | Value | Type | AWS Storage | Required | Notes |
|----------|-------|------|-------------|----------|-------|
| `JWT_SECRET` | `[REDACTED]` | Secret | **Secrets Manager** | ✅ Yes | CRITICAL: 32+ char, rotate every 90 days |
| `JWT_EXPIRES_IN` | `7d` | String | SSM Parameter Store | ✅ Yes | Token expiry duration |

#### **EMAIL SERVICE (RESEND)**
| Variable | Value | Type | AWS Storage | Required | Notes |
|----------|-------|------|-------------|----------|-------|
| `RESEND_API_KEY` | `re_[REDACTED]` | Secret | **Secrets Manager** | ✅ Yes | Email service provider API key |

#### **AWS S3 & FILE STORAGE**
| Variable | Value | Type | AWS Storage | Required | Notes |
|----------|-------|------|-------------|----------|-------|
| `AWS_ACCESS_KEY_ID` | `AKIA[REDACTED]` | Secret | **Secrets Manager** | ✅ Yes | IAM user for S3 access |
| `AWS_SECRET_ACCESS_KEY` | `[REDACTED]` | Secret | **Secrets Manager** | ✅ Yes | IAM user secret key |
| `AWS_REGION` | `us-east-1` | String | ECS Task Def | ✅ Yes | AWS region (e.g., eu-central-1) |
| `AWS_S3_BUCKET_NAME` | `qayyim-file-storage` | String | SSM Parameter Store | ✅ Yes | S3 bucket name (non-secret) |
| `AWS_S3_BUCKET` | `qayyim-file-storage` | String | SSM Parameter Store | ✅ Yes | Alias for above |

#### **EXTERNAL AI/ML SERVICES**
| Variable | Value | Type | AWS Storage | Required | Notes |
|----------|-------|------|-------------|----------|-------|
| `OPENROUTER_API_KEY` | `sk-or-v1-[REDACTED]` | Secret | **Secrets Manager** | ✅ Yes | LLM API (DeepSeek R1) for AI Grading |
| `GOOGLE_API_KEY` | `AIza[REDACTED]` | Secret | **Secrets Manager** | ⚠️ Yes* | Google Generative AI (if used by genkit) |
| `HF_TOKEN` | `hf_[REDACTED]` | Secret | **Secrets Manager** | ✅ Yes | Hugging Face Inference API token |

#### **APPLICATION CONFIGURATION**
| Variable | Value | Type | AWS Storage | Required | Notes |
|----------|-------|------|-------------|----------|-------|
| `NEXT_PUBLIC_APP_URL` | `https://qayyim.example.com` | String | SSM Parameter Store | ✅ Yes | Frontend URL (public, accessed by browser) |
| `API_HOST` | `0.0.0.0` | String | ECS Task Def | ✅ Yes | Flask services bind to all interfaces |
| `API_PORT` | `5000` (grading), `5003` (upload) | Integer | ECS Task Def | ✅ Yes | Per-service port binding |
| `NEXT_TELEMETRY_DISABLED` | `1` | Boolean | ECS Task Def | ⚠️ Optional | Disable Next.js telemetry |

### 2.2 Secret Management Strategy

#### **Secrets Manager (High Sensitivity)**
```json
{
  "secret-name": "qayyim/prod/secrets",
  "secrets": [
    "DATABASE_URL",
    "MYSQL_ROOT_PASSWORD",
    "REDIS_URL",
    "JWT_SECRET",
    "RESEND_API_KEY",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "OPENROUTER_API_KEY",
    "GOOGLE_API_KEY",
    "HF_TOKEN"
  ]
}
```

**Rotation Policy:** Every 90 days  
**Access:** ECS Task IAM role with `secretsmanager:GetSecretValue`

#### **SSM Parameter Store (Non-Sensitive Configuration)**
```
/qayyim/prod/mysql-database     = "qayyim_db"
/qayyim/prod/aws-region         = "us-east-1"
/qayyim/prod/aws-s3-bucket      = "qayyim-file-storage"
/qayyim/prod/jwt-expires-in     = "7d"
/qayyim/prod/next-public-url    = "https://qayyim.example.com"
/qayyim/prod/app-environment    = "production"
```

#### **ECS Task Definition Environment (Non-Secret Values)**
```json
{
  "environment": [
    { "name": "NODE_ENV", "value": "production" },
    { "name": "NEXT_TELEMETRY_DISABLED", "value": "1" },
    { "name": "API_HOST", "value": "0.0.0.0" },
    { "name": "API_PORT", "value": "5000" }
  ],
  "secrets": [
    { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:qayyim/prod/secrets:DATABASE_URL::" },
    { "name": "JWT_SECRET", "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:qayyim/prod/secrets:JWT_SECRET::" }
  ]
}
```

### 2.3 Environment Files in Repository

#### **Dev Environment (.env.local)**
```env
# Local development - NEVER commit sensitive values
DATABASE_URL="mysql://root:localpassword@localhost:3306/qayyim_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="dev-secret-key-change-in-production"
MYSQL_ROOT_PASSWORD="localpassword"
RESEND_API_KEY="re_test_key"
AWS_ACCESS_KEY_ID="AKIA_DEV_KEY"
AWS_SECRET_ACCESS_KEY="dev-secret-key"
AWS_REGION="us-east-1"
AWS_S3_BUCKET_NAME="qayyim-file-storage-dev"
OPENROUTER_API_KEY="sk-or-v1-test"
GOOGLE_API_KEY="AIza_test_key"
HF_TOKEN="hf_test_token"
NEXT_PUBLIC_APP_URL="http://localhost:9002"
```

#### **.env.production (DO NOT COMMIT)**
```env
# Production - managed by CI/CD only
# All secrets injected via AWS Secrets Manager / ECS Task Definition
NODE_ENV=production
NEXT_TELEMETRY_DISABLED=1
API_HOST=0.0.0.0
```

---

## 3. Inter-Service Communication

### 3.1 Service-to-Service Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APP (3000)                      │
│  (Frontend + Backend API Routes)                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────┐         ┌──────────────────────┐    │
│  │   MySQL (3306)       │         │   Redis (6379)       │    │
│  │  - Prisma ORM        │         │  - BullMQ Queues     │    │
│  │  - User/Exam Data    │         │  - Job Persistence   │    │
│  │  - Submissions       │         │  - Session Cache     │    │
│  └──────────────────────┘         └──────────────────────┘    │
│                                                                 │
│  ┌──────────────────────┐         ┌──────────────────────┐    │
│  │ AI Grading (5000)    │         │  AI Upload (5003)    │    │
│  │ - Flask API          │         │  - Flask API         │    │
│  │ - /grade endpoint    │         │  - /upload_ref...    │    │
│  │ - LLM inference      │         │  - PDF processing    │    │
│  └──────────────────────┘         └──────────────────────┘    │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              AWS S3 (Direct HTTPS)                       │  │
│  │  - Student answer uploads                               │  │
│  │  - Model answer storage                                 │  │
│  │  - CSV export downloads                                 │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         Resend Email Service (HTTPS)                     │  │
│  │  - Password reset emails                                │  │
│  │  - Exam notifications                                   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   PDF WORKER (Standalone Process)               │
│                                                                 │
│  ┌──────────────────────┐         ┌──────────────────────┐    │
│  │   Redis (6379)       │         │   MySQL (3306)       │    │
│  │  - BullMQ Job Queue  │         │  - Result Storage    │    │
│  │  - Consume jobs      │         │  - Submission Status │    │
│  └──────────────────────┘         └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 API Endpoint Communication Details

#### **Next.js → AI Grading (5000)**
```
POST /grade
Headers: Content-Type: application/json
Body: {
  "question": "...",
  "student_answer": "...",
  "model_answer": "...",
  "exam_type": "SHORT_ANSWER|MCQ|TRUE_FALSE"
}
Response: {
  "grade": 0.85,
  "feedback": "..."
}
Timeout: 30s (configurable)
Retry: 3 attempts with exponential backoff
```

#### **Next.js → AI Upload (5003)**
```
POST /upload_reference
Content-Type: multipart/form-data
Params: file (PDF), subject (string)
Response: {
  "status": "processing_started",
  "filename": "...",
  "subject": "..."
}
Processing: Async background job (returns immediately)
```

#### **Next.js → Redis (6379)**
```
Connection: ioredis library
Functionality:
  - BullMQ job queue (pdf-processing)
  - Session storage (optional)
  - Cache layer
Protocol: Redis binary protocol
Connection pooling: Enabled
Max retries: Automatic reconnect
```

#### **PDF Worker → Redis + MySQL**
```
Redis:
  - Consume from queue: "pdf-processing"
  - Concurrency: 4 parallel jobs
  - Timeout: 5 minutes per job
  - Retries: 3 with exponential backoff
  
MySQL:
  - Update submission status: PENDING → GRADED
  - Store grading results: marks, feedback
  - Create grievance records
```

### 3.3 🚨 Critical Changes for AWS Migration

| Current (Docker) | AWS Issue | AWS Solution |
|------------------|-----------|--------------|
| Hostname: `mysql` | Service discovery broken | Use RDS endpoint in DNS |
| Hostname: `redis` | ElastiCache endpoint dynamic | Use ElastiCache cluster endpoint |
| localhost:3306 | ECS tasks can't reach | RDS in same VPC/subnet |
| localhost:6379 | ElastiCache private | Same security group rules |
| Service discovery: docker-compose | No auto-discovery | Use Route 53 private hosted zone OR env vars |
| Health checks: docker-compose | Container-level only | Use ALB/NLB target group health checks |

### 3.4 Network Architecture for AWS

```
┌──────────────────────────────────────────────────────────────┐
│                         VPC (10.0.0.0/16)                    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Public Subnets (ALB target)                        │   │
│  │  - ECS Tasks (Next.js App)                          │   │
│  │  - Security Group: Allow 80/443 from Internet       │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Private Subnets (Data layer)                       │   │
│  │  - RDS MySQL (3306)                                 │   │
│  │  - ElastiCache Redis (6379)                         │   │
│  │  - ECS Tasks (AI services)                          │   │
│  │  - Security Group: Allow only from App SG          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 4. Database Configuration

### 4.1 Current Database

| Property | Value |
|----------|-------|
| **Engine** | MySQL 8.0 |
| **Container** | `mysql:8.0` (official image) |
| **Port** | 3306 (internal), 3307 (host) |
| **Database Name** | `qayyim_db` |
| **Charset** | utf8mb4 (Unicode support) |
| **Collation** | utf8mb4_unicode_ci |
| **Storage** | Docker volume: `mysql_data:/var/lib/mysql` |
| **Health Check** | `mysqladmin ping -h localhost -u root -p$$PASSWORD` |

### 4.2 AWS RDS Migration

#### **RDS Configuration Recommendations**

```json
{
  "DBInstanceIdentifier": "qayyim-mysql",
  "Engine": "mysql",
  "EngineVersion": "8.0.39", // Latest 8.0 LTS
  "DBInstanceClass": "db.t3.medium",
  "AllocatedStorage": 100, // GB
  "StorageType": "gp3",
  "StorageEncryption": true,
  "KmsKeyId": "arn:aws:kms:us-east-1:123456789:key/...",
  "MultiAZ": true,
  "BackupRetentionPeriod": 30,
  "PreferredBackupWindow": "03:00-04:00",
  "PreferredMaintenanceWindow": "sun:04:00-sun:05:00",
  "VpcSecurityGroupIds": ["sg-rds-private"],
  "DBSubnetGroupName": "qayyim-private-subnets",
  "DBName": "qayyim_db",
  "MasterUsername": "admin",
  "MasterUserPassword": "GENERATE_STRONG_PASSWORD",
  "EnableCloudwatchLogsExports": ["error", "general", "slowquery"],
  "EnableIAMDatabaseAuthentication": true,
  "CopyTagsToSnapshot": true
}
```

#### **RDS Endpoint Examples**
- **Writer Endpoint:** `qayyim-mysql.c5fx7u9k1234.us-east-1.rds.amazonaws.com:3306`
- **Read Replica:** `qayyim-mysql-read.c5fx7u9k1234.us-east-1.rds.amazonaws.com:3306`

### 4.3 Prisma Schema

**Database URL Format:**
```
DATABASE_URL="mysql://admin:PASSWORD@qayyim-mysql.c5fx7u9k1234.us-east-1.rds.amazonaws.com:3306/qayyim_db?sslaccept=strict"
```

**Prisma Configuration (schema.prisma):**
```prisma
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}
```

### 4.4 Database Tables & Relationships

| Table | Rows | Indexes | Relations | Purpose |
|-------|------|---------|-----------|---------|
| `users` | ~1K | `email (UNIQUE)` | instructor, student | User authentication & roles |
| `instructors` | ~100 | `userId (UNIQUE)` | user, exams, courses | Instructor profiles |
| `students` | ~900 | `userId (UNIQUE)` | user, submissions, courses, grievances | Student profiles |
| `courses` | ~50 | `courseCode, sectionType, academicYear, semester` | instructors, students, exams | Course catalog |
| `exams` | ~200 | `instructorId, courseId, createdAt` | instructor, submissions, grievances, course | Exam definitions |
| `submissions` | ~5K | `studentId, examId (UNIQUE), status, gradedAt` | student, exam, grievance | Student exam submissions |
| `grievances` | ~50 | `studentId, examId, status, createdAt` | student, exam, submission | Grievance tracking |

### 4.5 Init Script & Migrations

**Init Script Location:** `init-db/01-init.sql`  
**Prisma Migrations:** `prisma/migrations/` (version control managed)

**Migration Strategy for AWS:**
```bash
# Local dev: Prisma push
npx prisma db push

# AWS RDS: Prisma migrate deploy
npx prisma migrate deploy

# In Docker/ECS: Added to startup
CMD sh -c "npx prisma migrate deploy && npm start"
```

### 4.6 Backup & Disaster Recovery

| Scenario | Strategy | RTO | RPO |
|----------|----------|-----|-----|
| **Daily Backups** | AWS RDS automated backups (30 days) | 5 min | 1 min |
| **Point-in-Time Recovery** | RDS PITR enabled | 15 min | As recent as 5 min |
| **Cross-Region Failover** | RDS Read Replica in different region | 30 min | 1 min |
| **Disaster Recovery** | Monthly full export to S3 | 2 hours | 1 month |

---

## 5. Storage & File Paths

### 5.1 Volume Mounts & File Dependencies

#### **Current Docker Volumes**
| Mount | Source | Container Path | Purpose | Size | Persistence |
|-------|--------|-----------------|---------|------|-------------|
| `mysql_data` | Docker volume | `/var/lib/mysql` | Database files | ~5GB | Yes (named volume) |
| `redis_data` | Docker volume | `/data` | Redis persistence | ~100MB | Yes (RDB snapshots) |
| `ai_grading_service/chroma_db` | Host path | `/app/chroma_db` | Vector embeddings | ~2GB | Yes |
| `ai_upload_service/uploads` | Host path | `/app/uploads` | Uploaded PDFs (temp) | ~10GB | Yes (should move to S3) |
| `ai_upload_service/vector_store` | Host path | `/app/vector_store` | Vector database | ~5GB | Yes |

### 5.2 S3 File Structure

```
s3://qayyim-file-storage/
├── model-answers/
│   ├── {exam_id}/
│   │   └── model-answer.pdf
│   └── {exam_id}/
│       └── model-answer.pdf
├── student-answers/
│   ├── {exam_id}/
│   │   ├── {student_user_id}/
│   │   │   └── answer-sheet.pdf
│   │   └── {student_user_id}/
│   │       └── answer-sheet.pdf
├── exports/
│   ├── {exam_id}-results-{timestamp}.csv
│   └── {exam_id}-results-{timestamp}.csv
├── uploads/
│   ├── {subject}/
│   │   ├── reference-book-1.pdf
│   │   └── reference-book-2.pdf
└── temp/
    ├── processing-{job_id}/
    └── processing-{job_id}/
```

### 5.3 S3 Upload Functions

```typescript
// src/lib/s3.ts
export function generateModelAnswerKey(examId: string): string
  // Format: model-answers/{exam_id}/model-answer.pdf

export function generateStudentAnswerKey(examId: string, studentUserId: string): string
  // Format: student-answers/{exam_id}/{student_id}/answer-sheet.pdf

export async function uploadToS3(file: Buffer, key: string, contentType: string): Promise<string>
  // PUT file to S3, return signed URL

export async function uploadModelAnswer(examId: string, file: Buffer): Promise<string>
  // Wrapper for model answer uploads

export async function uploadStudentAnswer(examId: string, studentUserId: string, file: Buffer): Promise<string>
  // Wrapper for student answer uploads

export async function deleteFromS3(key: string): Promise<void>
  // DELETE file from S3

export async function getSignedUploadUrl(key: string, contentType: string): Promise<string>
  // Pre-signed URL (1 hour expiry)
```

### 5.4 🚨 AWS Migration Requirements

| Current | Migration Path | AWS Resource |
|---------|-----------------|--------------|
| `./ai_grading_service/chroma_db` | Move to S3 or EBS volume | **Option 1:** S3 with periodic sync / **Option 2:** EBS volume attached to ECS task |
| `./ai_upload_service/uploads` | Move to S3 (temporary PDFs) | S3 bucket with lifecycle policy (delete after 30 days) |
| `./ai_upload_service/vector_store` | Move to S3 or EBS | **Recommended:** EBS volume or S3 + periodic snapshots |
| `mysql_data` volume | RDS managed storage | AWS RDS (no need to manage volumes) |
| `redis_data` volume | ElastiCache managed storage | AWS ElastiCache (no need to manage volumes) |

**Recommended ECS Storage Configuration:**
```json
{
  "volumes": [
    {
      "name": "chroma-db",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-12345678",
        "transitEncryption": "ENABLED",
        "authorizationConfig": {
          "accessPointId": "fsap-grading"
        }
      }
    },
    {
      "name": "vector-store",
      "efsVolumeConfiguration": {
        "fileSystemId": "fs-87654321",
        "transitEncryption": "ENABLED"
      }
    }
  ]
}
```

### 5.5 File Upload Workflow

```
┌──────────────────────┐
│  Browser/Client      │
└──────────┬───────────┘
           │ POST /api/v1/teacher/exams/upload
           ▼
┌──────────────────────────────┐
│  Next.js API Route           │
│  (validateFiles, auth)       │
└──────────┬───────────────────┘
           │
           ├─→ Validate file size, type
           ├─→ Generate S3 key
           ├─→ uploadToS3()
           │
           ▼
┌──────────────────────────────┐
│  AWS S3 (PUT)                │
│  - model-answers/            │
│  - student-answers/          │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Next.js stores fileLink     │
│  in MySQL via Prisma         │
└──────────────────────────────┘
```

---

## 6. Health Check Endpoints

### 6.1 Existing Health Checks in Docker Compose

```yaml
# MySQL Health Check
healthcheck:
  test: ["CMD", "mysqladmin", "ping", "-h", "localhost", "-u", "root", "-p$${MYSQL_ROOT_PASSWORD}"]
  interval: 5s
  timeout: 5s
  retries: 20

# Redis Health Check
healthcheck:
  test: ["CMD", "redis-cli", "ping"]
  interval: 5s
  timeout: 3s
  retries: 10
```

### 6.2 Application-Level Health Endpoints

#### **Missing: No /health endpoint in Next.js App**
**REQUIRED FOR AWS:** Add ALB health check endpoint

```typescript
// src/app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Redis from 'ioredis';

export async function GET(request: NextRequest) {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1`;
    
    // Check Redis connectivity
    const redis = new Redis(process.env.REDIS_URL!);
    await redis.ping();
    await redis.disconnect();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'ok',
        redis: 'ok'
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: String(error)
    }, { status: 503 });
  }
}
```

#### **Missing: No /health endpoint in AI Grading (Flask)**
**REQUIRED FOR AWS:**

```python
# ai_grading_service/server.py
@app.route('/health', methods=['GET'])
def health_check():
    try:
        if vector_db is None:
            return jsonify({"status": "degraded", "issue": "vector_db not loaded"}), 200
        return jsonify({"status": "healthy"}), 200
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 503
```

#### **Missing: No /health endpoint in AI Upload (Flask)**
**REQUIRED FOR AWS:**

```python
# ai_upload_service/server.py
@app.route('/health', methods=['GET'])
def health_check():
    try:
        # Check if upload folder exists
        if not os.path.exists(UPLOAD_FOLDER):
            os.makedirs(UPLOAD_FOLDER, exist_ok=True)
        return jsonify({"status": "healthy"}), 200
    except Exception as e:
        return jsonify({"status": "unhealthy", "error": str(e)}), 503
```

### 6.3 ALB Target Group Health Check Configuration

```json
{
  "HealthCheckEnabled": true,
  "HealthCheckPath": "/health",
  "HealthCheckProtocol": "HTTP",
  "HealthCheckPort": "3000",
  "HealthCheckIntervalSeconds": 30,
  "HealthCheckTimeoutSeconds": 5,
  "HealthyThresholdCount": 2,
  "UnhealthyThresholdCount": 3,
  "Matcher": {
    "HttpCode": "200"
  }
}
```

### 6.4 RDS & ElastiCache Health Monitoring

| Service | Health Check Method | CloudWatch Metric | Alarm Threshold |
|---------|-------------------|-------------------|-----------------|
| **RDS MySQL** | AWS RDS monitoring | `CPUUtilization`, `DatabaseConnections` | CPU > 80%, Connections > 80 |
| **ElastiCache Redis** | AWS ElastiCache monitoring | `CPUUtilization`, `Evictions` | CPU > 75%, Evictions > 100/min |
| **ECS Task** | ALB health checks | `TargetResponseTime`, `RequestCount` | Response > 5s, 5xx errors > 1% |

---

## 7. Background Jobs & Workers

### 7.1 PDF Processing Worker

#### **Current Implementation: BullMQ + Redis**

| Property | Value |
|----------|-------|
| **Job Queue Name** | `pdf-processing` |
| **Queue Technology** | BullMQ 5.67.0 |
| **Message Broker** | Redis 7-alpine |
| **Concurrency** | 4 parallel jobs |
| **Timeout** | 300,000ms (5 minutes) |
| **Retries** | 3 attempts with exponential backoff |
| **Dead Letter Queue** | Enabled (auto-retry 5 times) |
| **Job Persistence** | Redis (volatile, survives container restart) |

#### **Job Processing Flow**

```
┌──────────────────────────────────────────────────────────┐
│ 1. Frontend/API enqueues job                             │
│    POST /api/v1/student/submissions                      │
│    → Job added to Redis queue                            │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│ 2. Worker dequeues job (concurrency: 4)                 │
│    src/app/workers/pdfWorker.ts                         │
│    → Processes up to 4 jobs in parallel                 │
└──────────┬───────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│ 3. Job Execution                                         │
│    → Extract text from PDF                              │
│    → Send to AI Grading service                         │
│    → Store grades in MySQL                              │
│    → Update submission status: PENDING → GRADED         │
└──────────┬───────────────────────────────────────────────┘
           │
           ├─→ Success: Job completed
           │
           └─→ Failure: Retry exponential backoff
                  (1s, 2s, 4s retry delays)
```

#### **Worker Startup Process**

```typescript
// src/app/workers/startPdfWorker.ts
import pdfWorker from "@/app/workers/pdfWorker";

console.log('🚀 Starting PDF Worker Process...');

pdfWorker.on('completed', (job) => {
    console.log(`✅ Completed job ${job.id}`);
});

pdfWorker.on('failed', (job, err) => {
    console.error(`❌ Failed job ${job?.id}:`, err.message);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('⚠️ SIGTERM received, closing worker...');
    await pdfWorker.close();
    process.exit(0);
});
```

#### **Worker Configuration (Dockerfile.worker)**

```dockerfile
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm install -g tsx

# Run migrations on startup
CMD sh -c "npx prisma migrate deploy && tsx src/app/workers/startPdfWorker.ts"
```

### 7.2 🚨 AWS Migration for Workers

#### **Current: Single Worker Instance**
- Runs on same container/server as main app
- Concurrency: 4 jobs
- Memory: Shared with Next.js app

#### **AWS ECS Approach: Separate Container**

**Option 1: Separate ECS Task Definition (RECOMMENDED)**
```json
{
  "family": "qayyim-pdf-worker",
  "containerDefinitions": [
    {
      "name": "pdf-worker",
      "image": "894059646318.dkr.ecr.us-east-1.amazonaws.com/qayyim-worker:latest",
      "cpu": 512,
      "memory": 1024,
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/qayyim-worker",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "environment": [
        { "name": "NODE_ENV", "value": "production" },
        { "name": "REDIS_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:qayyim/prod/secrets:REDIS_URL" },
        { "name": "DATABASE_URL", "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789:secret:qayyim/prod/secrets:DATABASE_URL" }
      ]
    }
  ]
}
```

**Auto Scaling Configuration:**
```json
{
  "ServiceName": "qayyim-pdf-worker",
  "DesiredCount": 2,
  "MinimumHealthyPercent": 50,
  "MaximumPercent": 200,
  "AutoScalingPolicyTarget": {
    "MetricType": "JobQueueDepth",
    "TargetValue": 10,
    "ScaleOutThreshold": 20,
    "ScaleInThreshold": 5
  }
}
```

**Option 2: AWS SQS + Lambda (Alternative)**
- Replace Redis BullMQ with AWS SQS
- Use Lambda for job processing (serverless)
- Scales automatically based on queue depth
- Better for variable load

**Option 3: AWS Fargate Spot (Cost Optimization)**
- Run on Fargate Spot instead of On-Demand
- 70% cheaper than On-Demand
- Auto-restart on interruption
- Good for non-critical batch processing

### 7.3 Job Queue Monitoring

| Metric | CloudWatch Alarm | Action |
|--------|-----------------|--------|
| Queue depth > 50 | Alert operations | Scale up worker instances |
| Job processing time > 5 min | Alert on max timeout | Investigate job failure, check logs |
| Failed jobs > 10% | Alert engineering | Review dead-letter queue |
| Redis memory > 80% | Alert operations | Increase ElastiCache node size |

### 7.4 Dead Letter Queue Management

```
Active Queue (pdf-processing)
  └─→ Max retries exceeded (3 attempts)
      └─→ Dead Letter Queue (pdf-processing:failed)
          └─→ Manual intervention required
              ├─→ Review logs
              ├─→ Fix root cause
              └─→ Re-enqueue or discard
```

---

## 8. External Dependencies

### 8.1 Third-Party API Integrations

#### **Resend (Email Service)**
| Property | Value |
|----------|-------|
| **Purpose** | Transactional emails (password reset, notifications) |
| **Endpoint** | `https://api.resend.com` |
| **Auth** | Bearer token: `RESEND_API_KEY` |
| **Usage** | Password reset, exam notifications |
| **Package** | `resend@^6.2.0` |
| **Rate Limit** | 100 emails/min for transactional |
| **Cost** | Free tier: 50 emails/month, then $20/10k emails |

**Email Sending Code:**
```typescript
// src/lib/email.ts
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendPasswordResetEmail(email: string, resetLink: string) {
  const result = await resend.emails.send({
    from: 'noreply@qayyim.example.com',
    to: email,
    subject: 'Password Reset - Qayyim',
    html: `<a href="${resetLink}">Reset your password</a>`
  });
  return result;
}
```

#### **OpenRouter (LLM Service)**
| Property | Value |
|----------|-------|
| **Purpose** | AI Grading - LLM inference for exam grading |
| **Endpoint** | `https://openrouter.ai/api/v1` |
| **Model** | `tngtech/deepseek-r1t2-chimera:free` (free DeepSeek) |
| **Auth** | Bearer token: `OPENROUTER_API_KEY` |
| **Features** | RAG context injection, streaming support |
| **Cost** | Free tier available, pay-per-token |
| **Fallback** | Required if quota exceeded |

**Integration Code:**
```python
# ai_grading_service/server.py
from openai import OpenAI
import os

client = OpenAI(
    api_key=os.getenv("OPENROUTER_API_KEY"),
    base_url="https://openrouter.ai/api/v1"
)

def grade_answer(question, student_answer, model_answer, context):
    response = client.chat.completions.create(
        model="tngtech/deepseek-r1t2-chimera:free",
        messages=[
            {"role": "system", "content": GRADER_SYSTEM_PROMPT},
            {"role": "user", "content": SHORT_ANSWER_PROMPT_TEMPLATE.format(
                question=question,
                context=context,
                model_answer=model_answer,
                student_answer=student_answer
            )}
        ],
        max_tokens=250,
        temperature=0.1
    )
    return response.choices[0].message.content
```

#### **Hugging Face Inference API**
| Property | Value |
|----------|-------|
| **Purpose** | AI Grading - Model inference via Hugging Face |
| **Endpoint** | `https://api-inference.huggingface.co` |
| **Model** | `Qwen/Qwen2.5-7B-Instruct` (7B language model) |
| **Auth** | Bearer token: `HF_TOKEN` |
| **Package** | `huggingface_hub` |
| **Usage** | Short answer grading fallback |
| **Cost** | Free tier: limited requests, Pro: $9/month |

**Integration Code:**
```python
# ai_grading_service/server.py
from huggingface_hub import InferenceClient

client = InferenceClient(api_key=os.getenv("HF_TOKEN"))

def grade_short_answer_hf(question, student_answer, model_answer, context):
    response = client.text_generation(
        model="Qwen/Qwen2.5-7B-Instruct",
        prompt=f"Grade this answer:\n{student_answer}\nExpected:\n{model_answer}",
        max_new_tokens=250
    )
    return response
```

#### **Google Generative AI (Optional)**
| Property | Value |
|----------|-------|
| **Purpose** | Genkit AI integration (if used) |
| **Endpoint** | `https://generativelanguage.googleapis.com` |
| **Auth** | API key: `GOOGLE_API_KEY` |
| **Package** | `@genkit-ai/googleai@^1.14.1` |
| **Status** | Optional, imported but may not be active |
| **Cost** | Free tier: 50 requests/min, then pay-per-token |

### 8.2 Internal Service Dependencies

#### **AWS S3 (File Storage)**
```typescript
// src/lib/s3.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// Upload file
await s3Client.send(new PutObjectCommand({
  Bucket: process.env.AWS_S3_BUCKET_NAME!,
  Key: `student-answers/${examId}/${studentId}/answer.pdf`,
  Body: fileBuffer,
  ContentType: 'application/pdf'
}));
```

**Required IAM Permissions:**
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:DeleteObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::qayyim-file-storage/*"
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": "arn:aws:s3:::qayyim-file-storage"
    }
  ]
}
```

### 8.3 Internet Connectivity Requirements

| Service | Outbound Required | Port | Protocol | Purpose |
|---------|------------------|------|----------|---------|
| **Resend** | Yes | 443 | HTTPS | Email delivery |
| **OpenRouter** | Yes | 443 | HTTPS | LLM inference |
| **Hugging Face** | Yes | 443 | HTTPS | Model inference |
| **Google Generative AI** | Maybe | 443 | HTTPS | Optional genkit |
| **AWS S3** | Yes | 443 | HTTPS | File storage |
| **npm/pip registry** | Yes (at build time) | 443 | HTTPS | Dependency downloads |

**AWS Network Configuration:**
```
┌─────────────────────┐
│  ECS Tasks (Private)│
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  NAT Gateway        │  ← Needs Elastic IP + Internet Gateway
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  Internet Gateway   │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐
│  External Internet  │
└─────────────────────┘
  (Resend, OpenRouter, etc.)
```

---

## 9. Docker & Build Configuration

### 9.1 Multi-Stage Build Analysis

#### **Next.js App (Dockerfile)**

```dockerfile
# Stage 1: Dependencies
FROM node:20-alpine AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat openssl
COPY package.json package-lock.json* ./
RUN --mount=type=cache,target=/root/.npm npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
ARG RESEND_API=dummy
ENV RESEND_API=$RESEND_API
RUN npm run build

# Stage 3: Runner (minimal)
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

**Build Arguments:**
- `RESEND_API=dummy` - Build-time only, not included in final image

**Build Optimization:**
- Multistage: 60% smaller image (~400MB vs ~1GB)
- Cache layers: deps layer reused if package.json unchanged
- Minimal final image: Only runtime dependencies

### 9.2 AI Grading Service (Flask)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y gcc && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV FLASK_APP=server.py
EXPOSE 5000
CMD ["python", "server.py"]
```

**Dependencies:**
- flask, flask-cors
- huggingface_hub, langchain-chroma
- sentence-transformers, chromadb
- torch==2.5.1+cpu

### 9.3 AI Upload Service (Flask)

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5003
CMD ["python", "server.py"]
```

### 9.4 PDF Worker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm install -g tsx
CMD sh -c "npx prisma migrate deploy && tsx src/app/workers/startPdfWorker.ts"
```

### 9.5 ECR Image Registry

**Current Production Images (eu-central-1):**
- `894059646318.dkr.ecr.eu-central-1.amazonaws.com/qayyim-app:latest`
- `894059646318.dkr.ecr.eu-central-1.amazonaws.com/qayyim-ai:latest` (grading)
- `894059646318.dkr.ecr.eu-central-1.amazonaws.com/qayyim-ai-upload:latest` (upload)

### 9.6 Image Build Time & Size

| Image | Base Size | Final Size | Build Time | Layers |
|-------|-----------|-----------|------------|--------|
| Next.js App | 380MB | 380MB | 2m 30s | 10 |
| AI Grading | 1.2GB | 1.2GB | 3m 45s | 5 |
| AI Upload | 900MB | 900MB | 2m 15s | 4 |
| PDF Worker | 450MB | 450MB | 1m 30s | 8 |

### 9.7 AWS ECR Configuration for Production

```json
{
  "repositoryName": "qayyim-app",
  "imageScanningConfiguration": {
    "scanOnPush": true
  },
  "encryptionConfiguration": {
    "encryptionType": "KMS",
    "kmsKey": "arn:aws:kms:eu-central-1:123456789:key/..."
  },
  "imagePolicyText": {
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Service": "ecs-tasks.amazonaws.com"
        },
        "Action": ["ecr:GetDownloadUrlForLayer", "ecr:BatchGetImage", "ecr:BatchCheckLayerAvailability"]
      }
    ]
  }
}
```

### 9.8 Build Pipeline (CI/CD)

**.github/workflows/push-pull-ecr.yml:**
```yaml
on: [push]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: eu-central-1
      - uses: aws-actions/amazon-ecr-login@v1
      - run: docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
      - run: docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
      - uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.EC2_HOST }}
          key: ${{ secrets.EC2_KEY }}
          script: docker-compose pull && docker-compose up -d
```

---

## 10. Startup Order & Dependencies

### 10.1 Service Startup Sequence

```
1. MySQL (RDS in AWS)
   └─ Waits for: None (always first)
   └─ Health Check: mysqladmin ping
   └─ Startup Time: 30-60s
   └─ Ready Signal: Accepts connections on 3306

2. Redis (ElastiCache in AWS)
   └─ Waits for: None (can start in parallel with MySQL)
   └─ Health Check: redis-cli ping
   └─ Startup Time: 5-10s
   └─ Ready Signal: Accepts connections on 6379

3. AI Grading Service (ECS Task)
   └─ Waits for: MySQL ✓, Redis ✓
   └─ Health Check: POST /health → 200 OK
   └─ Startup Time: 15-20s (load ChromaDB vectors)
   └─ Ready Signal: Listens on 5000

4. AI Upload Service (ECS Task)
   └─ Waits for: MySQL ✓, Redis ✓
   └─ Health Check: GET /health → 200 OK
   └─ Startup Time: 10-15s (load LangChain models)
   └─ Ready Signal: Listens on 5003

5. Next.js App (ECS Task)
   └─ Waits for: MySQL ✓, Redis ✓, AI Grading ✓, AI Upload ✓
   └─ Health Check: GET /health → {"status": "healthy"}
   └─ Startup Time: 20-30s (build Next.js, generate Prisma client)
   └─ Ready Signal: ALB health check passes

6. PDF Worker (ECS Task - separate)
   └─ Waits for: MySQL ✓, Redis ✓
   └─ Startup Time: 15-20s (generate Prisma client)
   └─ Ready Signal: Worker listening on Redis queue
   └─ Note: Can start before/after main app
```

### 10.2 Docker Compose depends_on Configuration

```yaml
services:
  mysql:
    # No dependencies

  redis:
    # No dependencies

  ai_grading:
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy

  ai_upload:
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy

  app:
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
      ai_grading:
        condition: service_started  # Not healthy, just started
      ai_upload:
        condition: service_started

  worker:
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
      ai_grading:
        condition: service_started
      ai_upload:
        condition: service_started
```

### 10.3 AWS ECS Task Definition Startup

#### **Startup Configuration**

```json
{
  "containerDefinitions": [
    {
      "name": "app",
      "image": "...",
      "dependsOn": [
        {
          "containerName": "mysql",
          "condition": "HEALTHY"
        },
        {
          "containerName": "redis",
          "condition": "HEALTHY"
        }
      ],
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:3000/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

**startPeriod:** 60 seconds - Time allowed for container to startup before health checks count as failures

### 10.4 Startup Failure Scenarios

| Scenario | Symptoms | Recovery |
|----------|----------|----------|
| **MySQL not ready** | Connection timeout, app crashes | Wait 30-60s, auto-restart |
| **Redis not ready** | BullMQ connection error | Wait 10-20s, auto-restart |
| **AI Grading model loading slow** | Takes > 20s to load LLM | Increase startPeriod, scale timeout |
| **Prisma migration failure** | "Prisma Client not generated" | Run `npx prisma generate` in build |
| **Vector DB missing** | AI Grading starts degraded | Graceful fallback, warn in logs |

### 10.5 Graceful Shutdown

```typescript
// All services should handle signals
process.on('SIGTERM', async () => {
  console.log('SIGTERM: Graceful shutdown initiated');
  
  // Close connections
  await prisma.$disconnect();
  await redis.quit();
  await pdfWorker.close();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT: Graceful shutdown initiated');
  // Same as SIGTERM
});
```

**AWS ECS Termination Grace Period:** 30 seconds (default)

---

## 11. Services Summary Table

| Service | Port | Type | Container | Image | Dependencies | Memory | CPU | Scalable |
|---------|------|------|-----------|-------|--------------|--------|-----|----------|
| **MySQL** | 3306 | Database | RDS | mysql:8.0 | None | Managed | Managed | ✅ Read replicas |
| **Redis** | 6379 | Cache/Queue | ElastiCache | redis:7 | None | Managed | Managed | ✅ Cluster |
| **Next.js App** | 3000 | API/Frontend | ECS | node:20-alpine | MySQL, Redis, AI services | 1GB | 0.25 vCPU | ✅ Auto-scaling |
| **AI Grading** | 5000 | ML Service | ECS | python:3.11-slim | MySQL, Redis | 2GB | 0.5 vCPU | ✅ Auto-scaling |
| **AI Upload** | 5003 | ML Service | ECS | python:3.11-slim | MySQL, Redis | 1.5GB | 0.5 vCPU | ✅ Auto-scaling |
| **PDF Worker** | N/A | Background Job | ECS | node:20-alpine | MySQL, Redis | 1.5GB | 0.5 vCPU | ✅ Queue-based |
| **PHPMyAdmin** | 9000 | Admin UI | ❌ Remove | phpmyadmin | MySQL | N/A | N/A | ❌ Use RDS console |

---

## 12. AWS Deployment Mapping

### 12.1 Service-to-AWS-Resource Mapping

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      AWS PRODUCTION ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  INTERNET                                                              │
│      │                                                                 │
│      ▼                                                                 │
│  ┌──────────────────┐                                                │
│  │  Route 53 (DNS)  │  qayyim.example.com → ALB                     │
│  └────────┬─────────┘                                                │
│           │                                                           │
│           ▼                                                           │
│  ┌──────────────────────────────────┐                               │
│  │  Application Load Balancer       │                               │
│  │  - Port 80 (HTTP → HTTPS)        │                               │
│  │  - Port 443 (HTTPS)              │                               │
│  │  - SSL Certificate (ACM)         │                               │
│  └──────────┬───────────────────────┘                               │
│             │                                                        │
│      ┌──────┴──────────────────────────────┐                        │
│      │                                     │                        │
│      ▼                                     ▼                        │
│  ┌────────────────────┐            ┌──────────────────┐            │
│  │ ECS Service: App   │            │ CloudWatch Logs  │            │
│  │ (Next.js, 2-4 tasks)           │ (Monitoring)     │            │
│  └────────┬───────────┘            └──────────────────┘            │
│           │                                                        │
│      ┌────┴────────────────────────┬────────────────┐             │
│      │                             │                │             │
│      ▼                             ▼                ▼             │
│  ┌──────────────┐        ┌──────────────────┐  ┌──────────────┐  │
│  │ RDS MySQL    │        │ ElastiCache      │  │  S3 Bucket   │  │
│  │ Multi-AZ     │        │ Redis Cluster    │  │  (Files)     │  │
│  └──────────────┘        └──────────────────┘  └──────────────┘  │
│                                                                   │
│  ┌──────────────────┐        ┌──────────────────┐                │
│  │ ECS Service: AI  │        │ ECS Service: PDF │                │
│  │ Grading (1-2)    │        │ Worker (1-3)     │                │
│  │ AI Upload (1-2)  │        │                  │                │
│  └──────────────────┘        └──────────────────┘                │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Secrets Manager / Systems Manager Parameter Store        │  │
│  │  (Environment variables, API keys, DB passwords)         │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  VPC (10.0.0.0/16)                                         │  │
│  │  - Public Subnets: ALB + NAT Gateway                      │  │
│  │  - Private Subnets: ECS tasks, RDS, ElastiCache          │  │
│  └────────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────────────┘
```

### 12.2 AWS Resource Specifications

#### **RDS MySQL**
```
DBInstanceClass:        db.t3.medium (2 vCPU, 4GB RAM)
AllocatedStorage:       100 GB (gp3, 3000 IOPS)
MultiAZ:                Enabled
BackupRetention:        30 days
EngineVersion:          MySQL 8.0.39 (LTS)
Encryption:             KMS encrypted
PubliclyAccessible:     No (private subnet only)
```

#### **ElastiCache Redis**
```
NodeType:               cache.t3.small (2 GB)
Engine:                 Redis 7.x
CacheNodes:             3 (1 primary + 2 replicas for HA)
AutomaticFailover:      Enabled
MultiAZ:                Enabled
Encryption:             In-transit + at-rest
PubliclyAccessible:     No
```

#### **ECS Cluster**
```
LaunchType:             Fargate (serverless)
PlatformVersion:        LATEST
NetworkMode:            awsvpc
Subnets:                Private (2 AZs)
SecurityGroups:         App SG (restrictive)
TaskRoleArn:            IAM role with S3, Secrets Manager access
ExecutionRoleArn:       ecsTaskExecutionRole
```

#### **Application Load Balancer**
```
Scheme:                 Internet-facing
IpAddressType:          ipv4
SecurityGroups:         ALB-SG (allow 80, 443)
Subnets:                Public (2 AZs)
TargetGroups:
  - Name: qayyim-app-tg
    Protocol: HTTP
    Port: 3000
    HealthCheck:
      Path: /health
      Interval: 30s
      Timeout: 5s
      HealthyThreshold: 2
      UnhealthyThreshold: 3
```

#### **S3 Bucket**
```
BucketName:             qayyim-file-storage
Region:                 us-east-1
Versioning:             Enabled
ServerSideEncryption:   AES-256
PublicAccessBlock:      All denied
LifecyclePolicy:        Delete old uploads after 90 days
```

### 12.3 Estimated AWS Monthly Cost

| Service | Quantity | Unit Cost | Monthly Cost |
|---------|----------|-----------|--------------|
| **RDS MySQL t3.medium** | 1 | $200/month | $200 |
| **RDS Multi-AZ standby** | 1 | $100/month | $100 |
| **RDS Automated Backups** | 30 days | $0.20/GB | $20 |
| **ElastiCache t3.small (3 nodes)** | 3 | $50/node | $150 |
| **ECS Fargate vCPU** | 0.5 vCPU × 730h | $0.04/hour | $15 |
| **ECS Fargate Memory** | 2GB × 730h | $0.004/hour | $6 |
| **ALB** | 1 | $16/month | $16 |
| **S3 Storage** | 100 GB | $0.023/GB | $2.30 |
| **NAT Gateway** | 1 | $32/month | $32 |
| **Secrets Manager** | 1 secret | $0.40/secret | $0.40 |
| **CloudWatch Logs** | 50GB/month | $0.50/GB | $25 |
| **Data Transfer (outbound)** | 10GB/month | $0.09/GB | $0.90 |
| **Total (Estimated)** | | | **~$567/month** |

*Note: Prices are approximate for us-east-1 region, subject to change*

---

## Summary & Migration Checklist

### ✅ Pre-Migration Validation

- [ ] All 10 sections reviewed and documented
- [ ] Port mappings updated for AWS endpoints
- [ ] Environment variables extracted and categorized
- [ ] Secrets Manager secrets configured
- [ ] RDS MySQL schema imported
- [ ] ElastiCache Redis cluster created
- [ ] S3 buckets provisioned with lifecycle policies
- [ ] Health check endpoints added to all services
- [ ] BullMQ worker separation planned for ECS
- [ ] External API credentials secured
- [ ] IAM roles and policies created
- [ ] VPC, subnets, security groups configured
- [ ] ALB and target groups set up
- [ ] ECR repositories created and images pushed
- [ ] ECS task definitions created
- [ ] Auto-scaling policies configured
- [ ] CloudWatch monitoring and alarms configured
- [ ] DNS records updated in Route 53
- [ ] SSL certificate installed (ACM)
- [ ] Load testing performed
- [ ] Disaster recovery tested
- [ ] Runbooks documented

---

**Document Version:** 1.0  
**Last Updated:** May 29, 2026  
**Next Review:** After first AWS deployment
