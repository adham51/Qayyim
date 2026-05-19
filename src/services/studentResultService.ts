import {
    Course,
    CourseContent,
    StudentResultsResponse,
    SubmissionDetail,
    SubmissionResult
} from '@/types/student-results';

/**
 * Fetches student results including statistics, recently graded submissions, and score trends
 * @returns Promise with student results data
 * @throws Error if the request fails
 */
export async function getStudentResults(): Promise<StudentResultsResponse> {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('No authentication token found. Please log in.');
        }

        const response = await fetch('/api/v1/student/dashboard', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.message || `Failed to fetch student results: ${response.status}`
            );
        }

        const data = await response.json();
        return data.data; // Assuming successResponse wraps data in { data: ... }
    } catch (error) {
        console.error('Error fetching student results:', error);
        throw error;
    }
}

export async function getAllSubmissions(): Promise<SubmissionResult[]>{
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('No authentication token found. Please log in.');
        }

        const response = await fetch('/api/v1/student/results', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication failed. Please log in again.');
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.message || `Failed to fetch submissions: ${response.status}`
            );
        }

        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching submissions:', error);
        throw error;
    }
}

export async function getSubmissionDetail(examId: string): Promise<SubmissionDetail> {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('No authentication token found. Please log in.');
        }

        const response = await fetch(`/api/v1/student/results/${examId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
        });

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error('Authentication failed. Please log in again.');
            }
            if (response.status === 404) {
                throw new Error('Submission not found.');
            }
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.message || `Failed to fetch submission detail: ${response.status}`
            );
        }

        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error('Error fetching submission detail:', error);
        throw error;
    }
}

export async function getStudentCourses(): Promise<Course[]>{
    try{
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('No authentication token found. Please log in.');
        }

        const response = await fetch('/api/v1/student/courses', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
                errorData.message || `Failed to fetch student courses: ${response.status}`
            );
        }

        const data = await response.json();
        return data.data;
    }catch(error){
        console.error('Error fetching student courses:', error);
        throw error;
    }
}

export async function getCourceContent(courseId: string): Promise<CourseContent> {
    try {
        const token = localStorage.getItem('token');

        if (!token) {
            throw new Error('Authentication required. Please log in.');
        }

        const response = await fetch(`/api/v1/student/courses/${courseId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `Error ${response.status}: Failed to load course`);
        }

        const result = await response.json();

        return result.data;
    } catch (error) {
        console.error('Failed to get course content:', error);
        throw error;
    }
}