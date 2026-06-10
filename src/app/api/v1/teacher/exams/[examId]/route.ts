import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { updateExamSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';

// GET - Get a single exam
export async function GET(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const authUser = requireRole(request, 'instructor');
    
    const exam = await prisma.exam.findUnique({
      where: { id: params.examId },
      include: {
        _count: {
          select: {
            submissions: true,
          },
        },
      },
    });
    
    if (!exam) {
      return errorResponse('Exam not found', 404);
    }
    
    // ⚠️ FIX: Verify ownership using instructorId
    if (exam.instructorId !== authUser.userId) {
      return errorResponse('Access denied. You do not own this exam.', 403);
    }
    
    return successResponse({
      ...exam,
      totalSubmissions: exam._count.submissions,
    });
  } catch (error) {
    return handleApiError(error);
  }
}

// PUT - Update an exam
export async function PUT(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const authUser = requireRole(request, 'TEACHER');
    const body = await request.json();
    
    // Validate input
    const validatedData = updateExamSchema.parse(body);
    
    // Check if exam exists and user owns it
    const existingExam = await prisma.exam.findUnique({
      where: { id: params.examId },
    });
    
    if (!existingExam) {
      return errorResponse('Exam not found', 404);
    }
    
    // ⚠️ FIX: Verify ownership using instructorId
    if (existingExam.instructorId !== authUser.userId) {
      return errorResponse('Access denied. You do not own this exam.', 403);
    }
    
    // Update exam
    const updatedExam = await prisma.exam.update({
      where: { id: params.examId },
      data: {
        ...(validatedData.title && { title: validatedData.title }),
        ...(validatedData.description !== undefined && { description: validatedData.description }),
        // ...(validatedData.duration !== undefined && { duration: validatedData.duration }),
        // ...(validatedData.totalMarks !== undefined && { totalMarks: validatedData.totalMarks }),
        // ...(validatedData.questions !== undefined && { questions: validatedData.questions }),
        ...(validatedData.type && { type: validatedData.type }),
        ...(validatedData.deadline !== undefined && { 
          deadline: validatedData.deadline ? new Date(validatedData.deadline) : null 
        }),
        ...(validatedData.modelAnswer !== undefined && { modelAnswer: validatedData.modelAnswer }),
        ...(validatedData.rubric !== undefined && { rubric: validatedData.rubric }),
      },
    });
    
    return successResponse(updatedExam, 'Exam updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// DELETE - Delete an exam
export async function DELETE(
  request: NextRequest,
  { params }: { params: { examId: string } }
) {
  try {
    const authUser = requireRole(request, 'TEACHER');
    
    // Check if exam exists and user owns it
    const exam = await prisma.exam.findUnique({
      where: { id: params.examId },
    });
    
    if (!exam) {
      return errorResponse('Exam not found', 404);
    }
    
    // ⚠️ FIX: Verify ownership using instructorId
    if (exam.instructorId !== authUser.userId) {
      return errorResponse('Access denied. You do not own this exam.', 403);
    }
    
    // Delete exam (submissions and grievances will cascade delete)
    await prisma.exam.delete({
      where: { id: params.examId },
    });
    
    return successResponse(null, 'Exam deleted successfully');
  } catch (error) {
    return handleApiError(error);
  }
}