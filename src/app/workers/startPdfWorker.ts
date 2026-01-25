// workers/startPdfWorker.ts
import pdfWorker from "@/app/workers/pdfWorker";

console.log('🚀 Starting PDF Worker Process...');
console.log('📊 Worker Status:', {
    isRunning: pdfWorker.isRunning(),
    isPaused: pdfWorker.isPaused(),
    name: pdfWorker.name
});

pdfWorker.on('completed', (job) => {
    console.log(`✅ Completed job ${job.id}`);
});

pdfWorker.on('failed', (job, err) => {
    console.error(`❌ Failed job ${job?.id}:`, err.message);
});

pdfWorker.on('error', (err) => {
    console.error('❌ Worker error:', err);
});

process.on('SIGTERM', async () => {
    console.log('⚠️ SIGTERM received, closing worker...');
    await pdfWorker.close();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('⚠️ SIGINT received, closing worker...');
    await pdfWorker.close();
    process.exit(0);
});