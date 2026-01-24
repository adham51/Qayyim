import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { successResponse, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const authUser = requireRole(request, 'student');

    const student = await prisma.student.findUnique({
      where:{
        userId: authUser.userId
      },
    });

    if (!student) {
      throw new Error(`No student user with id ${authUser.userId}`);
    }
    
    // Get all submissions for the student
    const submissions = await prisma.submission.findMany({
      where: {
        studentId: student.id,
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            course: true,
            type: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Transform data to match frontend expectations
    const results = submissions.map(sub => ({
      id: sub.id,
      examId: sub.examId,
      examTitle: sub.exam.title,
      examType: sub.exam.type,
      marks: sub.marks,
      status: sub.status,
      feedback: sub.feedback,
      submittedAt: sub.createdAt,
      gradedAt: sub.gradedAt,
    }));
    
    return successResponse(results);
  } catch (error) {
    return handleApiError(error);
  }
}

