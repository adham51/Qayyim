import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { successResponse, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const authUser = requireRole(request, 'student');
    
    // Get all active exams
    const exams = await prisma.exam.findMany({
      where: {
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        course: true,
        type: true,
        deadline: true,
        createdAt: true,
        teacher: {
          select: {
            name: true,
          },
        },
      },
    });
    
    // Check which exams the student has already submitted
    const submissions = await prisma.submission.findMany({
      where: {
        studentId: authUser.userId,
      },
      select: {
        examId: true,
        status: true,
      },
    });
    
    const submissionMap = new Map(submissions.map(s => [s.examId, s.status]));
    
    // Add submission status to exams
    const examsWithStatus = exams.map(exam => ({
      ...exam,
      teacherName: exam.instructor.name,
      hasSubmitted: submissionMap.has(exam.id),
      submissionStatus: submissionMap.get(exam.id) || null,
    }));
    
    return successResponse(examsWithStatus);
  } catch (error) {
    return handleApiError(error);
  }
}

