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

    const student = await prisma.student.findUnique({
      where:{
        userId: authUser.userId
      },
    });

    if (!student) {
      throw new Error(`No student user with id ${authUser.userId}`);
    }

    // Get submission for this exam
    const submission = await prisma.submission.findUnique({
      where: {
        studentId_examId: {
          studentId: student.id,
          examId: params.examId,
        },
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            course: true,
            type: true,
            examDate: true,
            questions: true,
            modelAnswerFile: true,
          },
        },
      },
    });

    if (!submission) {
      return errorResponse('Submission not found', 404);
    }

    // Parse questions JSON to calculate total marks
    let totalMarks = 0;
    try {
      const questions = JSON.parse(submission.exam.questions as string);
      totalMarks = questions.reduce((sum: number, q: any) => sum + (q.questionGrade || 0), 0);
    } catch (e) {
      console.error('Failed to parse exam questions:', e);
    }

    return successResponse({
      submission: {
        id: submission.id,
        originalAnswers: submission.originalAnswers,
        marks: submission.marks,
        status: submission.status,
        submittedAt: submission.createdAt,
        gradedAt: submission.gradedAt,
        fileLink: submission.fileLink,
      },
      exam: {
        id: submission.exam.id,
        title: submission.exam.title,
        type: submission.exam.type,
        examDate: submission.exam.examDate,
        totalMarks: totalMarks,
        questions: submission.exam.questions,
        modelAnswerFile: submission.exam.modelAnswerFile,
        course: submission.exam.course,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}