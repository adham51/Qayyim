import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { updateGrievanceSchema } from '@/lib/validations';
import { successResponse, errorResponse, handleApiError } from '@/lib/api-response';

// GET - Get grievance details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireRole(request, 'instructor');
    
    const grievance = await prisma.grievance.findUnique({
      where: { id: params.id },
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
            instructorId: true,
          },
        },
        submission: {
          select: {
            id: true,
            originalAnswers: true,
            marks: true,
            status: true,
            createdAt: true,
            gradedAt: true,
          },
        },
      },
    });
    
    if (!grievance) {
      return errorResponse('Grievance not found', 404);
    }
    
    // Verify instructor owns this exam
    const instructor = await prisma.instructor.findUnique({
      where: { userId: authUser.userId },
    });
    
    if (!instructor || grievance.exam.instructorId !== instructor.id) {
      return errorResponse('Unauthorized', 403);
    }
    
    return successResponse(grievance, 'Grievance retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// PATCH - Update grievance (Teacher actions)
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authUser = requireRole(request, 'instructor');
    const body = await request.json();
    
    // Validate input
    const validatedData = updateGrievanceSchema.parse(body);
    
    // Get instructor record
    const instructor = await prisma.instructor.findUnique({
      where: { userId: authUser.userId },
    });
    
    if (!instructor) {
      return errorResponse('Instructor record not found', 404);
    }
    
    // Get grievance with exam
    const grievance = await prisma.grievance.findUnique({
      where: { id: params.id },
      include: {
        exam: {
          select: {
            instructorId: true,
          },
        },
      },
    });
    
    if (!grievance) {
      return errorResponse('Grievance not found', 404);
    }
    
    // Verify instructor owns this exam
    if (grievance.exam.instructorId !== instructor.id) {
      return errorResponse('Unauthorized', 403);
    }
    
    // Prepare update data based on action
    let updateData: any = {};
    
    if (validatedData.action === 'resolve') {
      updateData = {
        status: 'RESOLVED',
        resolvedAt: new Date(),
        instructorResponse: validatedData.instructorResponse || grievance.instructorResponse,
      };
    } else if (validatedData.action === 'dismiss') {
      updateData = {
        status: 'REJECTED',
        reviewedAt: new Date(),
      };
    } else if (validatedData.action === 'respond') {
      if (!validatedData.instructorResponse) {
        return errorResponse('Instructor response is required for respond action', 400);
      }
      updateData = {
        instructorResponse: validatedData.instructorResponse,
        status: 'UNDER_REVIEW',
        reviewedAt: new Date(),
      };
    }
    
    // Update grievance
    const updated = await prisma.grievance.update({
      where: { id: params.id },
      data: updateData,
    });
    
    return successResponse(updated, 'Grievance updated successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

