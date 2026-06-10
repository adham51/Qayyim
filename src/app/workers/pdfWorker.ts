// lib/parallel/workers/pdfWorker.ts
import {PdfProcessingJob, PdfProcessingResult} from '@/lib/parallel/queues/pdfQueue';
import {Job, Worker} from 'bullmq';
import {processPdfSubmission} from "@/lib/parallel/jobs/processPdf";
import {createRedisConnection} from "@/lib/parallel/redis";

// Create a SEPARATE Redis connection for the worker
const workerRedisConnection = createRedisConnection();

workerRedisConnection.on('connect', () => {
    console.log('✅ Redis (Worker) connected successfully');
});

workerRedisConnection.on('error', (error) => {
    console.error('❌ Redis (Worker) connection error:', error);
});

console.log('🔍 Creating worker with concurrency: 4');

// Create worker with concurrency of 4
export const pdfWorker = new Worker<PdfProcessingJob, PdfProcessingResult>(
    '{pdf-processing}',
    async (job: Job<PdfProcessingJob>) => {
        console.log(`📄 Worker [${job.id}] processing: ${job.data.filename}`);

        try {
            const result = await processPdfSubmission(job.data);

            // Update job progress
            await job.updateProgress(100);

            if (result.success) {
                console.log(`✅ Worker [${job.id}] completed: ${job.data.filename}`);
            } else {
                console.error(`❌ Worker [${job.id}] failed: ${job.data.filename} - ${result.error}`);
            }

            return result;
        } catch (error: any) {
            console.error(`❌ Worker error for job ${job.id}:`, error);
            throw error; // Let BullMQ handle retries
        }
    },
    {
        connection: workerRedisConnection,
        concurrency: 4,
    }
);

console.log('🚀 PDF Worker started, now attaching event listeners...');

// Worker event listeners
pdfWorker.on('active', (job: Job<PdfProcessingJob>) => {
    console.log(`🔄 Worker started job ${job.id}: ${job.data.filename}`);
});

pdfWorker.on('completed', (job: Job<PdfProcessingJob, PdfProcessingResult>, result: PdfProcessingResult) => {
    console.log(`✅ Job ${job.id} completed:`, {
        filename: result.filename,
        success: result.success,
        studentUserId: result.studentUserId,
    });
});

pdfWorker.on('failed', (job: Job<PdfProcessingJob> | undefined, error: Error) => {
    console.error(`❌ Job ${job?.id} failed:`, {
        filename: job?.data.filename,
        error: error.message,
        attemptsMade: job?.attemptsMade,
    });
});

pdfWorker.on('error', (error: Error) => {
    console.error('❌ Worker error:', error);
});

pdfWorker.on('progress', (job: Job<PdfProcessingJob>, progress: number) => {
    console.log(`📊 Job ${job.id} progress: ${progress}%`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('⚠️ SIGTERM received, closing worker...');
    await pdfWorker.close();
    await workerRedisConnection.quit();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('⚠️ SIGINT received, closing worker...');
    await pdfWorker.close();
    await workerRedisConnection.quit();
    process.exit(0);
});

console.log('✅ Worker ready and listening for jobs');

export default pdfWorker;