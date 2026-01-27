import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { successResponse, handleApiError } from '@/lib/api-response';

// GET - Check if student is enrolled and get course details
export async function GET(request: NextRequest) {
    try {
        const authUser = requireRole(request, 'student');

        const { searchParams } = new URL(request.url);
        const enrollmentToken = searchParams.get('token');

        if (!enrollmentToken) {
            throw new Error('Enrollment token is required');
        }

        // Find the course by enrollment token
        const course = await prisma.course.findUnique({
            where: { enrollmentToken },
            select: {
                id: true,
                courseCode: true,
                courseName: true,
                sectionType: true,
                sectionNumber: true,
                semester: true,
                academicYear: true,
                students: {
                    where: {
                        userId: authUser.userId
                    },
                    select: {
                        id: true
                    }
                }
            }
        });

        if (!course) {
            throw new Error('Invalid enrollment link');
        }

        const isEnrolled = course.students.length > 0;

        return successResponse({
            course: {
                id: course.id,
                courseCode: course.courseCode,
                courseName: course.courseName,
                sectionType: course.sectionType,
                sectionNumber: course.sectionNumber,
                semester: course.semester,
                academicYear: course.academicYear,
            },
            isEnrolled
        });

    } catch (error) {
        return handleApiError(error);
    }
}

// POST - Enroll student in course
export async function POST(request: NextRequest) {
    try {
        const authUser = requireRole(request, 'student');

        const body = await request.json();
        const { enrollmentToken } = body;

        if (!enrollmentToken) {
            throw new Error('Enrollment token is required');
        }

        // Find the student
        const student = await prisma.student.findUnique({
            where: { userId: authUser.userId }
        });

        if (!student) {
            throw new Error('Student profile not found');
        }

        // Find the course by enrollment token
        const course = await prisma.course.findUnique({
            where: { enrollmentToken },
            include: {
                students: {
                    where: {
                        userId: authUser.userId
                    }
                }
            }
        });

        if (!course) {
            throw new Error('Invalid enrollment link');
        }

        // Check if already enrolled
        if (course.students.length > 0) {
            return successResponse({
                message: 'Already enrolled in this course',
                courseId: course.id,
                alreadyEnrolled: true
            });
        }

        // Enroll the student
        await prisma.course.update({
            where: { id: course.id },
            data: {
                students: {
                    connect: { id: student.id }
                }
            }
        });

        return successResponse({
            message: 'Successfully enrolled in course',
            courseId: course.id,
            alreadyEnrolled: false
        });

    } catch (error) {
        return handleApiError(error);
    }
}