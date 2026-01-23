export interface OCRResponse {
    fileName: string;
    success: boolean;
    text: string;
}

export function mapOCRResponse(data: any): OCRResponse {
    return {
        fileName: data.filename,
        success: data.success,
        text: data.text,
    };
}

export interface ExamModelAnswer {
    questions: {
        questionId: string;
        question: string;
        modelAnswer: string | null;
        questionGrade: number;
    }[];
}