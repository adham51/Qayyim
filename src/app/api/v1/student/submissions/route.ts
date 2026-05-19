import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { createSubmissionSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';

// GET - Get student submissions (for grievance form)
export async function GET(request: NextRequest) {
  try {
    const authUser = requireRole(request, 'student');
    
    // Get student record
    const student = await prisma.student.findUnique({
      where: { userId: authUser.userId },
    });
    
    if (!student) {
      return errorResponse('Student record not found', 404);
    }
    
    // Get all submissions that can have grievances filed (both PENDING and GRADED)
    const submissions = await prisma.submission.findMany({
      where: {
        studentId: student.id,
        // Allow grievances for both PENDING and GRADED submissions
      },
      include: {
        exam: {
          select: {
            id: true,
            title: true,
          },
        },
        grievance: {
          select: {
            id: true,
            status: true,
          },
        },
      },
      orderBy: [
        {
          gradedAt: 'desc',
        },
        {
          createdAt: 'desc', // Fallback to creation date if not graded
        },
      ],
    });
    
    // Filter out submissions that already have grievances
    const availableSubmissions = submissions
      .filter(sub => !sub.grievance)
      .map(sub => ({
        id: sub.id,
        examId: sub.examId,
        exam: {
          id: sub.exam.id,
          title: sub.exam.title,
        },
        marks: sub.marks,
        gradedAt: sub.gradedAt,
        status: sub.status, // Include status to show if graded or pending
      }));
    
    return successResponse(availableSubmissions, 'Submissions retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = requireRole(request, 'student');
    const body = await request.json();
    
    // Validate input
    const validatedData = createSubmissionSchema.parse(body);
    
    // Get student record
    const student = await prisma.student.findUnique({
      where: { userId: authUser.userId },
    });
    
    if (!student) {
      return errorResponse('Student record not found', 404);
    }
    
    // Check if exam exists and is active
    const exam = await prisma.exam.findUnique({
      where: { id: validatedData.examId },
    });
    
    if (!exam || !exam.isActive) {
      return errorResponse('Exam not found or not available for submission', 404);
    }
    
    // Check if student has already submitted
    const existingSubmission = await prisma.submission.findUnique({
      where: {
        studentId_examId: {
          studentId: student.id,
          examId: validatedData.examId,
        },
      },
    });
    
    if (existingSubmission) {
      return errorResponse('You have already submitted this exam', 409);
    }
    
    // Create submission
    // Convert originalAnswer string to JSON format for originalAnswers
    const submission = await prisma.submission.create({
      data: {
        studentId: student.id,
        examId: validatedData.examId,
        originalAnswers: { answer: validatedData.originalAnswer },
        fileLink: '', // Required field - empty for text-based submissions
        status: 'PENDING',
      },
    });
    
    return successResponse(submission, 'Submission created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

