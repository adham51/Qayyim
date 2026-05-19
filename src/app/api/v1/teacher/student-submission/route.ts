import { getPdfQueue } from "@/lib/parallel/queues/pdfQueue";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/middleware";
import { successResponse, handleApiError } from "@/lib/api-response";
import { FILE_UPLOAD, MESSAGES } from "@/lib/constants";
import { uploadStudentAnswer } from "@/lib/s3";

export const runtime = "nodejs";

function extractStudentUserId(filename: string): string | null {
  const nameWithoutExt = filename.replace(/\.pdf$/i, "");
  return nameWithoutExt || null;
}

export async function POST(request: NextRequest) {
  // ✅ init queue ONLY at runtime (not at import/build time)
  const pdfQueue = getPdfQueue();

  try {
    console.log("📥 Received POST request for PDF processing");

    const authUser = requireRole(request, "instructor");
    const instructor = await prisma.instructor.findUnique({
      where: { userId: authUser.userId },
    });

    if (!instructor) throw new Error("Instructor not found");

    const formData = await request.formData();
    const examId = formData.get('examId') as string;
    const courseName = formData.get('courseName') as string;

    if (!examId) throw new Error("Exam ID is required");

    const exam = await prisma.exam.findUnique({ where: { id: examId } });
    if (!exam || exam.instructorId !== instructor.id) {
      throw new Error("Exam not found or access denied");
    }

    const singleFile = formData.get("file") as File | null;
    const multipleFiles = formData.getAll("files") as File[];
    const files = singleFile ? [singleFile] : multipleFiles;

    if (files.length === 0) throw new Error("At least one file is required");

    const queuedJobs: any[] = [];
    const errors: any[] = [];

    for (const file of files) {
      try {
        console.log(`\n🔍 Validating file: ${file.name}`);

        if (file.type !== FILE_UPLOAD.ALLOWED_TYPES.PDF) {
          errors.push({ filename: file.name, error: MESSAGES.UPLOAD.INVALID_TYPE });
          continue;
        }

        const studentUserId = courseName
            ? extractStudentUserId(file.name)
            : file.name.replace(/\.pdf$/i, '');

        if (!studentUserId) {
          errors.push({ filename: file.name, error: MESSAGES.STUDENT.ID_EXTRACT_FAILED });
          continue;
        }

        const student = await prisma.student.findFirst({
          where: { userId: studentUserId },
        });

        if (!student) {
          errors.push({ filename: file.name, error: `${MESSAGES.STUDENT.NOT_FOUND}: ${studentUserId}` });
          continue;
        }

        console.log(`🛠️ Converting ${file.name} to Buffer...`);
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        console.log(`📤 Uploading to S3...`);
        const s3Url = await uploadStudentAnswer(examId, studentUserId, buffer);
        console.log(`✅ S3 Success: ${s3Url}`);

        const jobData = {
          examId,
          studentUserId,
          fileBuffer: buffer.toString("base64"),
          filename: file.name,
          instructorId: instructor.id,
          courseName: courseName,
        };

        const job = await pdfQueue.add(
          `process-${studentUserId}-${Date.now()}`,
          jobData,
          {
            priority: 1,
            attempts: 3,
            backoff: { type: "exponential", delay: 2000 },
          }
        );

        console.log(`🚀 Job queued: ${job.id}`);

        queuedJobs.push({
          jobId: job.id,
          filename: file.name,
          studentUserId,
          s3Url,
          status: "queued",
        });
      } catch (error: any) {
        console.error(`❌ Error processing ${file.name}:`, error);
        errors.push({ filename: file.name, error: error.message });
      }
    }

    const [waiting, active, completed, failed] = await Promise.all([
      pdfQueue.getWaitingCount(),
      pdfQueue.getActiveCount(),
      pdfQueue.getCompletedCount(),
      pdfQueue.getFailedCount(),
    ]);

    console.log(
      `📊 Final Queue Status: waiting=${waiting}, active=${active}, completed=${completed}, failed=${failed}`
    );

    return successResponse(
      {
        queued: queuedJobs.length,
        failed: errors.length,
        jobs: queuedJobs,
        errors,
      },
      `Queued ${queuedJobs.length} submissions`
    );
  } catch (error) {
    console.error("❌ Route error:", error);
    return handleApiError(error);
  }
}

export async function GET(request: NextRequest) {
  // ✅ init queue ONLY at runtime (not at import/build time)
  const pdfQueue = getPdfQueue();

  try {
    requireRole(request, "instructor");
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get("jobId");

    if (!jobId) {
      const [waiting, active, completed, failed] = await Promise.all([
        pdfQueue.getWaitingCount(),
        pdfQueue.getActiveCount(),
        pdfQueue.getCompletedCount(),
        pdfQueue.getFailedCount(),
      ]);

      return successResponse({
        queue: { waiting, active, completed, failed, total: waiting + active + completed + failed },
      });
    }

    const job = await pdfQueue.getJob(jobId);
    if (!job) return successResponse({ jobId, status: "not_found" }, "Job not found", 404);

    return successResponse({
      jobId: job.id,
      status: await job.getState(),
      progress: job.progress,
      result: job.returnvalue,
      failedReason: job.failedReason,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
