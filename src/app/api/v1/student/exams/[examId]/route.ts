import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const authUser = requireRole(request, 'student');
    
    // Get exam details (without model answer - students shouldn't see it)
    const exam = await prisma.exam.findUnique({
      where: { id: params.examId },
      select: {
        id: true,
        title: true,
        course: true,
        type: true,
        deadline: true,
        rubric: true,
        createdAt: true,
        teacher: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
    
    if (!exam) {
      return errorResponse('Exam not found', 404);
    }
    
    if (!exam) {
      return errorResponse('Exam not found or not active', 404);
    }
    
    // Check if student has already submitted
    const submission = await prisma.submission.findUnique({
      where: {
        studentId_examId: {
          studentId: authUser.userId,
          examId: params.examId,
        },
      },
    });
    
    return successResponse({
      exam,
      hasSubmitted: !!submission,
      submission: submission ? {
        id: submission.id,
        status: submission.status,
        score: submission.marks,
        submittedAt: submission.createdAt,
      } : null,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

