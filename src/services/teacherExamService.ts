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

/**
 * Unified service to process exam PDF using Mistral OCR + AI Extraction
 * Then save to backend with S3 upload
 *
 * @param examFile The PDF file containing the exam
 * @param examMeta Metadata for the exam (title, type, date, etc.)
 * @returns Promise with the saved exam data
 * @throws Error if OCR, extraction, or save fails
 */
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
  // Step 1: Send PDF to Mistral extraction endpoint (OCR + AI extraction combined)
  const formData = new FormData();
  formData.append('file', examFile);

  const extractionResponse = await fetch("/api/v1/teacher/exams/extract", {
    method: "POST",
    body: formData,
  });

  if (!extractionResponse.ok) {
    const errorData = await extractionResponse.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to extract questions from PDF");
  }

  const { questions } = await extractionResponse.json();

  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    throw new Error("No questions were extracted from the PDF");
  }

  // Step 2: Save exam to database with model answer file upload
  const saveFormData = new FormData();
  saveFormData.append("modelAnswerFile", examFile);
  saveFormData.append("title", examMeta.title);
  saveFormData.append("type", examMeta.type);

  if (examMeta.description) {
    saveFormData.append("description", examMeta.description);
  }

  if (examMeta.examDate) {
    saveFormData.append("examDate", examMeta.examDate);
  }

  if (examMeta.courseId) {
    saveFormData.append("courseId", examMeta.courseId);
  }

  saveFormData.append("questions", JSON.stringify(questions));

  const token = localStorage.getItem('token');
  if (!token) {
    throw new Error('No authentication token found. Please log in.');
  }

  const saveResponse = await fetch("/api/v1/teacher/exams", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
    },
    body: saveFormData,
  });

  if (!saveResponse.ok) {
    const errorData = await saveResponse.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to save exam to database");
  }

  return await saveResponse.json();
}