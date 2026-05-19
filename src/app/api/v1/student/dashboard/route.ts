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
    
    // Get recently graded submissions
    const recentlyGraded = await prisma.submission.findMany({
      where: {
        studentId: student.id,
        status: 'GRADED',
      },
      take: 5,
      orderBy: { gradedAt: 'desc' },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            course: true,
          },
        },
      },
    });
    
    // Get all graded submissions for score trend
    const allGradedSubmissions = await prisma.submission.findMany({
      where: {
        studentId: student.id,
        status: 'GRADED',
      },
      orderBy: { gradedAt: 'asc' },
      include: {
        exam: {
          select: {
            title: true,
          },
        },
      },
    });
    
    // Calculate statistics
    const totalExamsTaken = await prisma.submission.count({
      where: { studentId: student.id },
    });
    
    const averageScore = allGradedSubmissions.length > 0
      ? allGradedSubmissions.reduce((sum, sub) => sum + (sub.marks || 0), 0) / allGradedSubmissions.length
      : 0;
    
    const scoreData = allGradedSubmissions.map(sub => ({
      name: sub.exam.title,
      marks: sub.marks || 0,
    }));
    
    return successResponse({
      statistics: {
        totalExamsTaken,
        averageScore: Math.round(averageScore),
        pendingGrading: totalExamsTaken - allGradedSubmissions.length,
      },
      recentlyGraded: recentlyGraded.map(sub => ({
        id: sub.id,
        examId: sub.examId,
        examTitle: sub.exam.title,
        marks: sub.marks,
        gradedAt: sub.gradedAt,
      })),
      scoreData,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

