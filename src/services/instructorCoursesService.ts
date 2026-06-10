// Service for instructor course operations
export async function getInstructorCourses() {
    const token = localStorage.getItem('token');

    if (!token) {
        throw new Error('No authentication token found. Please log in.');
    }


    const response = await fetch('/api/v1/teacher/courses',
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        }
    );
    if (!response.ok) {
        throw new Error('Failed to fetch courses');
    }
    const data = await response.json();
    return data.data;
}

export async function getInstructorCourseContent(courseId: string) {
    const token = localStorage.getItem('token');

    if (!token) {
        throw new Error('No authentication token found. Please log in.');
    }


    const response = await fetch(`/api/v1/teacher/courses/${courseId}`,
        {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`
            }
        }
    );
    if (!response.ok) {
        throw new Error('Failed to fetch course content');
    }
    const data = await response.json();
    return data.data;
}

// Add this method to your instructorCourseService.ts file

export async function createCourse(courseData: {
    courseCode: string;
    courseName: string;
    sectionType: string;
    sectionNumber: string;
    academicYear: string;
    semester: string;
}) {
    const token = localStorage.getItem('token');

    if (!token) {
        throw new Error('No authentication token found. Please log in.');
    }

    const formData = new FormData();
    formData.append('courseCode', courseData.courseCode);
    formData.append('courseName', courseData.courseName);
    formData.append('sectionType', courseData.sectionType);
    formData.append('sectionNumber', courseData.sectionNumber);
    formData.append('academicYear', courseData.academicYear);
    formData.append('semester', courseData.semester);

    const response = await fetch('/api/v1/teacher/courses',
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            },
            body: formData
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create course');
    }

    const data = await response.json();
    return data.data;
}

export async function uploadReference(file: File, subject: string) {
    try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('subject', subject);

        const response = await fetch('http://ai_upload:5003/upload_reference',
            {
                method: 'POST',
                body: formData
            }
        );
        if (!response.ok) {
            throw new Error('Failed to upload reference');
        }

        const result = await response.json();

        console.log('Upload successful:', result.message);
        return result;

    } catch (error) {
        console.error('Upload Error:', error);
        throw error;
    }
}