import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { createGrievanceSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';

// POST - Submit a grievance (Student)
export async function POST(request: NextRequest) {
  try {
    const authUser = requireRole(request, 'student');
    const body = await request.json();
    
    // Validate input
    const validatedData = createGrievanceSchema.parse(body);
    
    // Get student record
    const student = await prisma.student.findUnique({
      where: { userId: authUser.userId },
    });
    
    if (!student) {
      return errorResponse('Student record not found', 404);
    }
    
    // Validate submission exists and belongs to student
    const submission = await prisma.submission.findUnique({
      where: { id: validatedData.submissionId },
      include: { exam: true },
    });
    
    if (!submission || submission.studentId !== student.id) {
      return errorResponse('Submission not found or does not belong to you', 404);
    }
    
    // Check if grievance already exists for this submission
    const existingGrievance = await prisma.grievance.findFirst({
      where: { submissionId: validatedData.submissionId },
    });
    
    if (existingGrievance) {
      return errorResponse('Grievance already submitted for this exam', 400);
    }
    
    // Create grievance
    const grievance = await prisma.grievance.create({
      data: {
        grievanceType: validatedData.grievanceType,
        questionNumber: validatedData.questionNumber || null,
        description: validatedData.description,
        studentId: student.id,
        examId: submission.examId,
        submissionId: validatedData.submissionId,
        status: 'PENDING',
      },
    });
    
    return successResponse(grievance, 'Grievance submitted successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}

// GET - List grievances (Teacher)
export async function GET(request: NextRequest) {
  try {
    const authUser = requireRole(request, 'instructor');
    
    // Get instructor record
    const instructor = await prisma.instructor.findUnique({
      where: { userId: authUser.userId },
    });
    
    if (!instructor) {
      return errorResponse('Instructor record not found', 404);
    }
    
    // Get grievances for exams taught by this instructor
    const grievances = await prisma.grievance.findMany({
      where: {
        exam: {
          instructorId: instructor.id,
        },
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        exam: {
          select: {
            id: true,
            title: true,
          },
        },
        submission: {
          select: {
            id: true,
            marks: true,
            status: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    return successResponse(grievances, 'Grievances retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

