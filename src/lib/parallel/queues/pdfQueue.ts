import { Queue } from 'bullmq';
import redisConnection from "@/lib/parallel/redis";

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

// Create the PDF processing queue
export const pdfQueue = new Queue<PdfProcessingJob>('pdf-processing', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 seconds, then 4, then 8
        },
        removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 1000, // Keep last 1000 completed jobs
        },
        removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
            count: 5000, // Keep last 5000 failed jobs
        },
    },
});

// Queue event listeners
pdfQueue.on('error', (error) => {
    console.error('❌ PDF Queue error:', error);
});

pdfQueue.on('waiting', (jobId) => {
    console.log(`⏳ Job ${jobId} is waiting`);
});

pdfQueue.on('active', (job) => {
    console.log(`🔄 Processing job ${job.id} - ${job.data.filename}`);
});

pdfQueue.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed - ${job.data.filename}`);
});

pdfQueue.on('failed', (job, error) => {
    console.error(`❌ Job ${job?.id} failed - ${job?.data.filename}:`, error.message);
});

export default pdfQueue;