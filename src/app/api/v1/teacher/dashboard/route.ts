import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { successResponse, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
  try {
    const authUser = requireRole(request, 'instructor');

    console.log(authUser);

    const instructor = await prisma.instructor.findUnique({
      where: { userId: authUser.userId }  // Find instructor by User ID
    });

    if (!instructor) {
      throw new Error('Instructor profile not found');
    }
    
    // Get statistics
    const [totalExams, totalSubmissions, pendingSubmissions] = await Promise.all([
      prisma.exam.count({
        where: { instructorId: instructor.id },
      }),
      prisma.submission.count({
        where: {
          exam: { instructorId: instructor.id },
        },
      }),
      prisma.submission.count({
        where: {
          exam: { instructorId: instructor.id },
          status: 'PENDING',
        },
      }),
    ]);
    
    // Get recent exams
    const recentExams = await prisma.exam.findMany({
      where: { instructorId: instructor.id },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });
    
    // Get grade distribution
    const allSubmissions = await prisma.submission.findMany({
      where: {
        exam: { instructorId: instructor.id },
        status: 'GRADED',
        marks: { not: null },
      },
      select: {
        marks: true,
      },
    });
    
    const gradeDistribution = {
      A: 0,
      B: 0,
      C: 0,
      D: 0,
      F: 0,
    };
    
    allSubmissions.forEach(sub => {
      if (sub.marks === null) return;
      if (sub.marks >= 90) gradeDistribution.A++;
      else if (sub.marks >= 80) gradeDistribution.B++;
      else if (sub.marks >= 70) gradeDistribution.C++;
      else if (sub.marks >= 60) gradeDistribution.D++;
      else gradeDistribution.F++;
    });
    
    return successResponse({
      statistics: {
        totalExams,
        totalSubmissions,
        pendingSubmissions,
        studentsGraded: totalSubmissions - pendingSubmissions,
      },
      recentExams,
      gradeDistribution,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

