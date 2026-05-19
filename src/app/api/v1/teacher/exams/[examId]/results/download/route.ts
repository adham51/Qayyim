import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { errorResponse, handleApiError } from '@/lib/api-response';
import { generateResultsCSV } from '@/lib/csv-export';

export async function GET(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const authUser = requireRole(request, 'TEACHER');
    
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
    
    // Transform data for CSV
    const results = submissions.map(sub => ({
      studentName: sub.student.user.name,
      studentId: sub.student.id,
      studentEmail: sub.student.user.email,
      marks: sub.marks || 0,
      feedback: sub.feedback || '',
      status: sub.status,
      submittedAt: sub.createdAt.toISOString(),
      gradedAt: sub.gradedAt?.toISOString() || '',
    }));
    
    // Generate CSV
    const csvBuffer = await generateResultsCSV(exam.title, results);
    
    // Return CSV file
    return new Response(csvBuffer, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${exam.title.replace(/[^a-z0-9]/gi, '_')}_results.csv"`,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

