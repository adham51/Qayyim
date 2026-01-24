export interface StudentStatistics {
    totalExamsTaken: number;
    averageScore: number;
    pendingGrading: number;
}

export interface RecentlyGradedSubmission {
    id: string;
    examId: string;
    examTitle: string;
    marks: number | null;
    gradedAt: Date | null;
}

export interface ScoreData {
    name: string;
    marks: number;
}

export interface StudentResultsResponse {
    statistics: StudentStatistics;
    recentlyGraded: RecentlyGradedSubmission[];
    scoreData: ScoreData[];
}
export interface SubmissionResult {
    id: string;
    examId: string;
    examTitle: string;
    examType: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'MIXED';
    marks: number | null;
    status: 'PENDING' | 'GRADED';
    feedback: string | null;
    submittedAt: Date;
    gradedAt: Date | null;
}
export interface SubmissionDetail {
    submission: {
        id: string;
        originalAnswers: any;
        marks: number | null;
        feedback: string | null;
        status: 'PENDING' | 'GRADED';
        submittedAt: Date;
        gradedAt: Date | null;
    };
    exam: {
        id: string;
        title: string;
        description: string | null;
        duration: number | null;
        totalMarks: number | null;
        type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'MIXED';
        modelAnswer: string | null;
        rubric: string | null;
    };
}

export interface Course {
    id: string;
    courseCode: string;
    courseName: string;
    sectionType: 'LECTURE' | 'LAB' | 'TUTORIAL';
    sectionNumber: string;
    academicYear: string;
    semester: 'FALL' | 'SPRING' | 'SUMMER';
    isActive: boolean;
}

export interface CourseContent {
    totalExams: number;
    averageMarks: number;
    course: {
        id: string;
        courseCode: string;
        courseName: string;
        sectionType: 'LECTURE' | 'LAB' | 'TUTORIAL';
        sectionNumber: string;
        academicYear: string;
        semester: 'FALL' | 'SPRING' | 'SUMMER';
        exams: {
            id: string;
            title: string;
            type: 'MCQ' | 'TRUE_FALSE' | 'SHORT_ANSWER' | 'MIXED';
            duration: number | null;
            examDate: Date | string | null;
            isActive: boolean;
            submissions: {
                id: string;
                marks: number | null;
                status: 'PENDING' | 'GRADED';
                gradedAt: Date | string | null;
                fileLink: string;
            }[];
        }[];
    };
}