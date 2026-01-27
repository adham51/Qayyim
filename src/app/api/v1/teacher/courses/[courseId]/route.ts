import { Submission } from "@prisma/client";
import {handleApiError, successResponse} from "@/lib/api-response";
import {prisma} from "@/lib/prisma";
import {requireRole} from "@/lib/middleware";
import {NextRequest} from "next/server";

export async function GET(request: NextRequest, {params}: { params: { courseId: string } }) {
    try {
        const authUser = requireRole(request, 'instructor');

        const instructor = await prisma.instructor.findUnique({
            where: { userId: authUser.userId }
        });

        if (!instructor) {
            throw new Error(`No student user with id ${authUser.userId}`);
        }

        const courseContent = await prisma.course.findUnique({
            where: { id: params.courseId },
            include: {
                exams: {
                    include: {
                        submissions: true
                    }
                }
            }
        });

        if (!courseContent) {
            throw new Error(`Course id ${params.courseId} not found`);
        }

        const allStudentSubmissions = courseContent.exams.flatMap(exam => exam.submissions);

        const averageMarks = computeAverageExams(allStudentSubmissions);

        const responseData = {
            totalExams: courseContent.exams.length,
            averageMarks: averageMarks,
            course: courseContent,
            enrollmentToken: courseContent.enrollmentToken,
        };

        return successResponse(responseData);
    } catch (e) {
        return handleApiError(e);
    }
}

function computeAverageExams(submissions: Submission[]): number {
    // FIX 4: Handle empty submissions to avoid division by zero
    if (submissions.length === 0) return 0;

    let sum = 0;
    let gradedCount = 0;

    for (const submission of submissions) {
        if (submission.marks !== null) {
            sum += submission.marks;
            gradedCount++;
        }
    }

    return gradedCount > 0 ? sum / gradedCount : 0;
}