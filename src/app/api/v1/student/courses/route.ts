import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { successResponse, handleApiError } from '@/lib/api-response';

export async function GET(request: NextRequest) {
    try {
        const authUser = requireRole(request, 'student');

        const student = await prisma.student.findUnique({
            where: {
                userId: authUser.userId
            },
            include: {
                courses: true
            }
        });

        if (!student) {
            throw new Error(`No student user with id ${authUser.userId}`);
        }

        return successResponse(student.courses);

    } catch (error) {
        return handleApiError(error);
    }
}