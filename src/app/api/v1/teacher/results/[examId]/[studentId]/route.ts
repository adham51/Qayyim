import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ examId: string; studentId: string }> }
) {
    try {
        // Await params before using
        const { examId, studentId } = await params;

        // 1. Authenticate the instructor
        const authUser = requireRole(request, 'instructor');

        const instructor = await prisma.instructor.findUnique({
            where: { userId: authUser.userId }
        });

        if (!instructor) {
            return errorResponse('Instructor profile not found', 404);
        }

        // 2. Fetch the specific submission using the composite unique key
        const submission = await prisma.submission.findUnique({
            where: {
                studentId_examId: {
                    studentId: studentId,
                    examId: examId,
                },
            },
            include: {
                student: {
                    include: {
                        user: {
                            select: { name: true }
                        }
                    }
                },
                exam: {
                    select: {
                        id: true,
                        title: true,
                        type: true,
                        questions: true,
                        modelAnswerFile: true,
                        instructorId: true,
                    },
                },
            },
        });

        if (!submission) {
            return errorResponse('Submission not found', 404);
        }

        // 3. Security: Ensure this instructor owns the exam they are trying to review
        if (submission.exam.instructorId !== instructor.id) {
            return errorResponse('Unauthorized: Access denied to this submission', 403);
        }

        // 4. Parse questions and student answers
        let questions = [];
        let totalMarks = 0;
        let studentAnswers = [];

        try {
            questions = typeof submission.exam.questions === 'string'
                ? JSON.parse(submission.exam.questions)
                : submission.exam.questions;

            if (Array.isArray(questions)) {
                totalMarks = questions.reduce((sum: number, q: any) => sum + (q.questionGrade || 0), 0);
            }
        } catch (e) {
            console.error('Failed to parse exam questions:', e);
        }

        try {
            studentAnswers = typeof submission.originalAnswers === 'string'
                ? JSON.parse(submission.originalAnswers)
                : submission.originalAnswers;
        } catch (e) {
            console.error('Failed to parse student answers:', e);
        }

        // 5. Parse feedback to get individual question feedback
        let feedbackData = null;
        try {
            feedbackData = typeof submission.feedback === 'string'
                ? JSON.parse(submission.feedback)
                : submission.feedback;
        } catch (e) {
            console.error('Failed to parse feedback:', e);
        }

        // 6. Combine questions with student answers and feedback
        const questionsWithAnswers = questions.map((question: any, index: number) => {
            const studentAnswer = Array.isArray(studentAnswers)
                ? studentAnswers.find((ans: any) => ans.questionId === question.questionId)
                : null;

            const questionFeedback = feedbackData && Array.isArray(feedbackData)
                ? feedbackData.find((fb: any) => fb.questionId === question.questionId)
                : (feedbackData?.questionId === question.questionId ? feedbackData : null);

            return {
                questionId: question.questionId,
                questionText: question.questionText,
                questionGrade: question.questionGrade || 0,
                modelAnswer: question.modelAnswer || 'No model answer provided',
                studentAnswer: studentAnswer?.answer || 'No answer submitted',
                studentGrade: questionFeedback?.studentGrade || 0,
                feedback: questionFeedback?.feedback || null,
            };
        });

        return successResponse({
            submission: {
                id: submission.id,
                studentName: submission.student.user.name,
                marks: submission.marks,
                status: submission.status,
                submittedAt: submission.createdAt,
            },
            exam: {
                id: submission.exam.id,
                title: submission.exam.title,
                type: submission.exam.type,
                totalMarks: totalMarks,
                modelAnswerFile: submission.exam.modelAnswerFile,
            },
            questionsWithAnswers,
        });
    } catch (error) {
        return handleApiError(error);
    }
}