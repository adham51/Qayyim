import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { successResponse, handleApiError } from '@/lib/api-response';

// GET - List courses for the authenticated instructor
export async function GET(request: NextRequest) {
  try {
    // Get authenticated instructor
    let instructor = null;
    try {
      const authUser = requireRole(request, 'instructor');
      instructor = await prisma.instructor.findUnique({
        where: { userId: authUser.userId },
      });
    } catch (error) {
      // If not authenticated or not a teacher, return empty list
      return successResponse({
        courses: [],
        flatCourses: [],
      }, 'No courses available');
    }

    if (!instructor) {
      return successResponse({
        courses: [],
        flatCourses: [],
      }, 'Instructor profile not found');
    }

    // Get courses for this instructor
    const courses = await prisma.course.findMany({
      where: {
        isActive: true,
        instructors: {
          some: {
            id: instructor.id,
          },
        },
      },
      orderBy: [
        { courseCode: 'asc' },
        { courseName: 'asc' },
      ],
      select: {
        id: true,
        courseCode: true,
        courseName: true,
        sectionType: true,
        sectionNumber: true,
        academicYear: true,
        semester: true,
      },
    });
    
    // Group by courseCode and create unique list
    const courseMap = new Map<string, {
      id: string;
      courseCode: string;
      courseName: string;
      sections: Array<{
        id: string;
        sectionType: string;
        sectionNumber: string;
        academicYear: string;
        semester: string;
      }>;
    }>();
    
    courses.forEach(course => {
      const key = course.courseCode;
      if (!courseMap.has(key)) {
        courseMap.set(key, {
          id: course.id,
          courseCode: course.courseCode,
          courseName: course.courseName,
          sections: [],
        });
      }
      const courseData = courseMap.get(key)!;
      courseData.sections.push({
        id: course.id,
        sectionType: course.sectionType,
        sectionNumber: course.sectionNumber,
        academicYear: course.academicYear,
        semester: course.semester,
      });
    });
    
    // Convert to array and include all sections
    const coursesWithSections = Array.from(courseMap.values());
    
    // Also return flat list for simpler use cases
    return successResponse({
      courses: coursesWithSections,
      flatCourses: courses,
    }, 'Courses retrieved successfully');
  } catch (error) {
    return handleApiError(error);
  }
}

