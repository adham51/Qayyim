import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import {SectionType, Semester} from "@prisma/client";
import {randomUUID} from "node:crypto";

export async function GET(request: NextRequest) {
    try {
        const authUser = requireRole(request, 'instructor');

        const instructor = await prisma.instructor.findUnique({
            where: {
                userId: authUser.userId
            },
            include: {
                courses: true
            }
        });

        if (!instructor) {
            throw new Error(`No student user with id ${authUser.userId}`);
        }

        return successResponse(instructor.courses);

    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(request: NextRequest) {
    try {
        const authUser = requireRole(request, 'instructor');

        const instructor = await prisma.instructor.findUnique({
            where: { userId: authUser.userId },
        });

        if (!instructor) {
            throw new Error('Instructor profile not found');
        }

        // 3. Extract data from formData
        const formData = await request.formData();

        const courseCode = formData.get('courseCode') as string;
        const courseName = formData.get('courseName') as string;
        const sectionType = formData.get('sectionType') as SectionType;
        const sectionNumber = formData.get('sectionNumber') as string;
        const academicYear = formData.get('academicYear') as string;
        const semester = formData.get('semester') as Semester;

        // Validate required fields
        if (!courseCode || !courseName || !sectionType || !sectionNumber || !academicYear || !semester) {
            throw new Error('Missing required fields');
        }

        // 4. Create the course in the database
        // The schema enforces a unique constraint on courseCode, sectionType, academicYear, semester, and sectionNumber.
        const newCourse = await prisma.course.create({
            data: {
                courseCode,
                courseName,
                sectionType,
                sectionNumber,
                academicYear,
                semester,
                // Establish the relation with the creating instructor
                instructors: {
                    connect: { id: instructor.id }
                }
            },
        });

        return successResponse({
            message: 'Course created successfully',
            course: newCourse
        });

    } catch (error: any) {
        // Handle specific Prisma errors such as unique constraint violations
        if (error.code === 'P2002') {
            throw new Error('A course with these section details already exists');
        }
        return handleApiError(error);
    }
}