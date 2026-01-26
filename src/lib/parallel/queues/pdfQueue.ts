// src/lib/parallel/queues/pdfQueue.ts
import { Queue } from "bullmq";
import { createRedisConnection } from "@/lib/parallel/redis";

export interface PdfProcessingJob {
  examId: string;
  studentUserId: string;
  fileBuffer: string;
  filename: string;
  instructorId: string;
  autoExtract: boolean;
}

export interface PdfProcessingResult {
  success: boolean;
  filename: string;
  studentUserId?: string;
  submission?: {
    id: string;
    studentId: string;
    examId: string;
    totalMarks: number;
    maxMarks: number;
    percentage: string;
    totalQuestions: number;
  };
  grading?: {
    gradedQuestions: number;
    results: any[];
  };
  error?: string;
}

let pdfQueue: Queue<PdfProcessingJob> | null = null;

export function getPdfQueue() {
  if (pdfQueue) return pdfQueue;

  const redisConnection = createRedisConnection(); // lazyConnect in redis.ts prevents build-time connect

  pdfQueue = new Queue<PdfProcessingJob>("pdf-processing", {
    connection: redisConnection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400, count: 5000 },
    },
  });

  // ✅ keep your logging exactly as-is
  pdfQueue.on("error", (error) => {
    console.error("❌ PDF Queue error:", error);
  });

  pdfQueue.on("waiting", (jobId) => {
    console.log(`⏳ Job ${jobId} is waiting`);
  });

  pdfQueue.on("active", (job) => {
    console.log(`🔄 Processing job ${job.id} - ${job.data.filename}`);
  });

  pdfQueue.on("completed", (job) => {
    console.log(`✅ Job ${job.id} completed - ${job.data.filename}`);
  });

  pdfQueue.on("failed", (job, error) => {
    console.error(`❌ Job ${job?.id} failed - ${job?.data.filename}:`, error.message);
  });

  return pdfQueue;
}
