import {mapOCRResponse, OCRResponse} from "@/types/exam-types";

export interface TeacherExam {
  id: string;
  title: string;
  description: string | null;
  type: string;
  deadline: Date | null;
  createdAt: Date;
  updatedAt: Date;
  courseCode: string | null;
  courseName: string | null;
  totalSubmissions: number;
  gradedSubmissions: number;
}

export interface AvailableCourse {
  courseCode: string;
  courseName: string;
}

export interface TeacherExamsResponse {
  exams: TeacherExam[];
  availableCourses: AvailableCourse[];
}

/**
 * Fetches all exams for the current teacher/instructor
 * @param courseCode Optional course code to filter exams
 * @returns Promise with exams and available courses data
 * @throws Error if the request fails
 */
export async function getTeacherExams(courseCode?: string): Promise<TeacherExamsResponse> {
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      throw new Error('No authentication token found. Please log in.');
    }

    // Build query string
    const queryParams = new URLSearchParams();
    if (courseCode) {
      queryParams.append('courseCode', courseCode);
    }
    const queryString = queryParams.toString();
    const url = `/api/v1/teacher/exams${queryString ? `?${queryString}` : ''}`;

    const response = await fetch(url, {
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
          errorData.message || `Failed to fetch exams: ${response.status}`
      );
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Error fetching teacher exams:', error);
    throw error;
  }
}


export async function getExamRawText(examFile: File): Promise<OCRResponse> {
  try {
    const formData = new FormData();
    formData.append('file', examFile);

    const response = await fetch('http://127.0.0.1:5001/ocr', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`OCR request failed with status: ${response.status}`);
    }

    const data = await response.json();

    if (!data || typeof data.success !== 'boolean' || typeof data.text !== 'string') {
      throw new Error('OCR response is invalid or missing required fields');
    }

    return mapOCRResponse(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';

    console.error('getExamRawText error:', message);

    throw new Error(`Failed to get OCR text: ${message}`);
  }
}

export async function saveExam(
    examFile: File,
    examMeta: {
      title: string;
      type: string;
      examDate?: string | null;
      description?: string | null;
      courseId?: string | null;
    }
) {
  const rawExamText = await getExamRawText(examFile);
  if (!rawExamText || !rawExamText.text) {
    throw new Error("OCR failed: Could not retrieve text from the exam file");
  }

  const extractionResponse = await fetch("/api/v1/teacher/exams/extract", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${localStorage.getItem('token')}`,
    },
    body: JSON.stringify({ text: rawExamText.text }),
  });

  if (!extractionResponse.ok) {
    const errorData = await extractionResponse.json();
    throw new Error(errorData.error || "AI extraction failed");
  }

  const { questions } = await extractionResponse.json();

  const formData = new FormData();
  formData.append("modelAnswerFile", examFile);
  formData.append("title", examMeta.title);
  formData.append("type", examMeta.type);

  if (examMeta.description) {
    formData.append("description", examMeta.description);
  }

  if (examMeta.examDate) {
    formData.append("examDate", examMeta.examDate);
  }

  if (examMeta.courseId) {
    formData.append("courseId", examMeta.courseId);
  }

  formData.append("questions", JSON.stringify(questions));

  const res = await fetch("/api/v1/teacher/exams", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${localStorage.getItem('token')}`,
    },
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to save exam to database");
  }

  return await res.json();
}

