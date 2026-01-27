import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { successResponse, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const authUser = requireRole(request, 'student');
    
    // Get recently graded submissions for this student
    const recentlyGraded = await prisma.submission.findMany({
      where: {
        studentId: authUser.userId,
        status: 'GRADED',
      },
      take: 10, // Last 10 graded exams
      orderBy: { gradedAt: 'desc' },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            totalMarks: true,
          },
        },
      },
    });
    
    // Transform data to match frontend expectations
    const results = recentlyGraded.map(sub => ({
      id: sub.id,
      examId: sub.examId,
      examTitle: sub.exam.title,
      examDescription: sub.exam.description,
      examType: sub.exam.type,
      totalMarks: sub.exam.totalMarks,
      marks: sub.marks,
      feedback: sub.feedback,
      gradedAt: sub.gradedAt,
    }));
    
    return successResponse(results);
  } catch (error) {
    return handleApiError(error);
  }
}

