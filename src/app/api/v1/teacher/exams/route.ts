import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { createExamSchema } from '@/lib/validations';
import { successResponse, handleApiError } from '@/lib/api-response';
import { uploadModelAnswer } from '@/lib/s3';
import { FILE_UPLOAD, MESSAGES } from '@/lib/constants';

// GET - List all exams for the instructor (formerly teacher)
export async function GET(request: NextRequest) {
  try {
    const authUser = requireRole(request, 'instructor');
    
    const instructor = await prisma.instructor.findUnique({
      where: { userId: authUser.userId }  // Find instructor by User ID
    });
  
    if (!instructor) {
      throw new Error('Instructor profile not found');
    }
    
    // Get query parameters for filtering
    const { searchParams } = new URL(request.url);
    const courseCode = searchParams.get('courseCode');
    
    // Build where clause
    const where: any = { instructorId: instructor.id };
    if (courseCode) {
      where.course = {
        courseCode: courseCode
      };
    }
    
    const exams = await prisma.exam.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        course: {
          select: {
            id: true,
            courseCode: true,
            courseName: true,
          },
        },
        _count: {
          select: {
            submissions: true,
          },
        },
        submissions: {
          select: {
            status: true,
          },
        },
      },
    });
    
    // Get unique course codes only from exams (courses that actually have exams)
    const coursesFromExams = exams
      .filter(exam => exam.course)
      .map(exam => ({
        courseCode: exam.course!.courseCode,
        courseName: exam.course!.courseName,
      }));
    
    // Deduplicate by courseCode - only show courses that have exams
    const uniqueCourses = Array.from(
      new Map(coursesFromExams.map(c => [c.courseCode, c])).values()
    );
    
    // Transform exams to include graded and total submission counts
    const examsWithCounts = exams.map(exam => {
      const totalSubmissions = exam._count.submissions;
      const gradedSubmissions = exam.submissions.filter(
        sub => sub.status === 'GRADED'
      ).length;
      
      return {
        id: exam.id,
        title: exam.title,
        type: exam.type,
        examDate: exam.examDate,
        createdAt: exam.createdAt,
        updatedAt: exam.updatedAt,
        courseCode: exam.course?.courseCode || null,
        courseName: exam.course?.courseName || null,
        totalSubmissions,
        gradedSubmissions,
      };
    });
    
    return successResponse({
      exams: examsWithCounts,
      availableCourses: uniqueCourses,
    }, 'Exams retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

// POST - Create a new exam with S3 upload
export async function POST(request: NextRequest) {
  try {
    const authUser = requireRole(request, 'instructor');
    
    // Parse FormData
    const formData = await request.formData();
    const modelAnswerFile = formData.get('modelAnswerFile') as File | null;

    const instructor = await prisma.instructor.findUnique({
    where: { userId: authUser.userId }  // Find instructor by User ID
    });
  
     if (!instructor) {
      throw new Error('Instructor profile not found');
    }
    
    // Extract fields from form
    const courseId = formData.get('courseId') as string | null;
    const courseTopic = formData.get('courseTopic') as string | null;
    
    // Extract only the fields that exist in your form
    const body = {
      title: formData.get('title') as string,
      description: courseTopic || null, // Use courseTopic as description if provided
      type: formData.get('type') as string,
      examDate: formData.get('examDate') as string | null,
      questions: formData.get('questions') as string,
    };
    
    // Validate - adjust your createExamSchema to match these fields only
    const validatedData = createExamSchema.parse(body);
    
    // Validate courseId if provided
    if (courseId) {
      const course = await prisma.course.findUnique({
        where: { id: courseId },
      });
      if (!course) {
        throw new Error('Invalid course selected');
      }
    }
    
    // Create exam (only with fields from form)
    const exam = await prisma.exam.create({
      data: {
        title: validatedData.title,
        type: validatedData.type,
        questions: validatedData.questions,
        examDate: validatedData.examDate ? new Date(validatedData.examDate) : null,
        instructorId: instructor.id,
        courseId: courseId || null, // Link exam to course if provided
      },
    });
    
    // Upload to S3 if file exists
    if (modelAnswerFile) {
      if (modelAnswerFile.type !== FILE_UPLOAD.ALLOWED_TYPES.PDF) {
        // Rollback: Delete the exam record if file is not a PDF
        await prisma.exam.delete({ where: { id: exam.id } });
        throw new Error(MESSAGES.UPLOAD.INVALID_TYPE);
      }
      
      // Validate file size
      if (modelAnswerFile.size > FILE_UPLOAD.MAX_FILE_SIZE) {
        await prisma.exam.delete({ where: { id: exam.id } });
        throw new Error(MESSAGES.UPLOAD.FILE_TOO_LARGE);
      }
      
      const bytes = await modelAnswerFile.arrayBuffer();
      const s3Url = await uploadModelAnswer(exam.id, Buffer.from(bytes));
      
      await prisma.exam.update({
        where: { id: exam.id },
        data: { modelAnswerFile: s3Url },
      });
    }
    
    return successResponse(exam, 'Exam created successfully', 201);
  } catch (error) {
    return handleApiError(error);
  }
}