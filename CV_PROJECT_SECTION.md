Qayyim: AI-Powered Exam Management System with RAG Pipeline & Microservices | Next.js, TypeScript, Node.js, React, MySQL, Prisma ORM, AWS S3, Docker Compose, Redis, BullMQ, LangChain, ChromaDB, Flask, Python, JWT, bcrypt

• Engineered full-stack web application with Next.js 15 App Router, TypeScript 5, and Shadcn/ui component library featuring teacher exam management dashboard, student submission portal, and AI-powered automated grading system for computer science assessments

• Designed and implemented responsive frontend UI using React Hook Form with Zod schema validation, React Dropzone for drag-and-drop file uploads with client-side validation, and Recharts for student performance analytics dashboards

• Built multi-file upload component with React Dropzone supporting PDF/DOCX formats, real-time validation, progress indicators, and AWS S3 presigned URL integration for secure client-side direct uploads bypassing server bottlenecks

• Implemented JWT-based authentication system using jsonwebtoken with bcrypt 10-round password hashing, 7-day token expiration, role-encoded claims (student/instructor), and token verification middleware protecting all API endpoints

• Engineered backend API with Next.js API Routes and TypeScript, enforcing runtime schema validation using Zod for type-safe request/response handling and comprehensive error reporting across 15+ REST endpoints

• Designed Prisma ORM schema with relational models (User, Instructor, Student, Course, Exam, Submission, Grievance) including cascade delete policies, enrollment token generation, and database migration management with auto-generated type-safe queries

• Integrated AWS S3 SDK for secure file storage with dynamic key generation (model-answers/{examId}, student-answers/{examId}/{userId}), presigned URL generation with 15-minute expiration, and MIME type validation for content-type enforcement

• Architected distributed job processing system using BullMQ 5.67.0 and Redis 7 as persistent job queue, implementing PDF processing workers with exponential backoff retry logic, dead-letter queues for failed jobs, and concurrency control for optimal resource utilization

• Configured HTTP client with Axios featuring 10-minute timeout for long-running AI operations, connection pooling with keep-alive headers for efficient concurrent requests, and custom interceptors for resilient service-to-service communication

• Built three-stage RAG (Retrieval-Augmented Generation) pipeline in Python using LangChain and ChromaDB: (1) PDF ingestion with PyPDFLoader and RecursiveCharacterTextSplitter (1000-char chunks, 150-char overlap), (2) LLM enrichment using DeepSeek R1 via OpenRouter API with batch processing (4-8 chunks/batch) and JSON-forced response formatting, (3) semantic vector storage in ChromaDB for efficient retrieval-augmented grading

• Implemented Flask microservice (/upload_reference endpoint) for background PDF processing using threading, supporting multi-stage ingestion pipeline with LLM-based relevance filtering validating chunk subject alignment and metadata extraction

• Integrated Mistral AI API, OpenRouter API, and Gemini AI (@google/generative-ai) for multi-model LLM support with fallback mechanisms, enabling cost-optimized and resilient AI-powered grading with graceful degradation

• Deployed Kaggle server endpoint exposing /grade Flask API for Qwen LLM-based answer evaluation, handling JSON request/response format with health check mechanisms and integration with Next.js backend through persistent HTTP connections

• Containerized full microservices architecture using Docker Compose with 5 services: MySQL 8 (port 3307) with persistent volumes and health checks, Redis 7-Alpine (port 6379) with appendonly persistence, AI Upload service (port 5003) for RAG pipeline, AI Grading service (port 5000) with ChromaDB integration, Next.js app (port 3000) with Prisma client generation

• Built multi-stage Dockerfile with Node.js 20-Alpine implementing deps → builder → runner pattern for optimized layer caching, minimal production images, and non-root user execution (nodejs uid 1001) reducing container attack surface

• Configured service health checks for MySQL (mysqladmin ping), Redis (redis-cli), and AI services with startup and liveness probes, enabling automatic recovery and zero-downtime container restarts

• Secured application using JWT verification middleware on protected endpoints, Bcrypt password hashing with strength requirements (8+ chars, uppercase, lowercase, numeric, special), input validation with Zod schemas (client & server), and CORS configuration for origin validation

• Hardened SSH infrastructure with ED25519 key-based authentication, disabled password authentication, root login prevention, SSH port configuration, and connection timeout settings eliminating password-based attacks

• Implemented database security using Prisma's parameterized queries for SQL injection prevention, MySQL least-privilege user creation, connection pooling with credential encryption, and Docker network segmentation restricting database access to application containers only

• Managed sensitive credentials using environment variables, .env.local configuration isolation, and Docker secrets management following least-privilege access principles across development and containerized environments

• Configured Docker container resource limits (CPU, memory) to prevent Denial of Service attacks, enabled read-only filesystems where applicable, and implemented network segmentation through Docker bridge networks
