import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';

export async function GET(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const authUser = requireRole(request, 'instructor');
    
    // Get instructor
    const instructor = await prisma.instructor.findUnique({
      where: { userId: authUser.userId },
    });
    
    if (!instructor) {
      throw new Error('Instructor profile not found');
    }
    
    // Verify exam ownership
    const exam = await prisma.exam.findUnique({
      where: { id: params.examId },
      include: {
        course: {
          select: {
            courseCode: true,
            courseName: true,
          },
        },
      },
    });
    
    if (!exam) {
      return errorResponse('Exam not found', 404);
    }
    
    if (exam.instructorId !== instructor.id) {
      return errorResponse('Access denied. You do not own this exam.', 403);
    }
    
    // Get all submissions for this exam
    const submissions = await prisma.submission.findMany({
      where: { examId: params.examId },
      include: {
        student: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    
    // Transform to match frontend expectations
    const transformedSubmissions = submissions.map(sub => ({
      id: sub.id,
      studentName: sub.student.user.name,
      studentId: sub.student.id,
      studentEmail: sub.student.user.email,
      examId: sub.examId,
      marks: sub.marks,
      feedback: sub.feedback || '',
      status: sub.status,
      gradedAt: sub.gradedAt,
      createdAt: sub.createdAt,
    }));
    
    return successResponse({
      exam: {
        id: exam.id,
        title: exam.title,
        type: exam.type,
        courseCode: exam.course?.courseCode || null,
        courseName: exam.course?.courseName || null,
      },
      submissions: transformedSubmissions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

