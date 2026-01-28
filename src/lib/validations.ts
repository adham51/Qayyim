import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['instructor', 'student'], {
    errorMap: () => ({ message: 'Role must be either instructor or student' })
  }),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});


export const createExamSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().nullable(),
  type: z.enum(["MCQ", "TRUE_FALSE", "SHORT_ANSWER", "MIXED"]),
  duration: z.number().optional().nullable(),
  questions: z.any().optional().nullable(),
  examDate: z.string().optional().nullable(),
  modelAnswerFile: z.string().optional().nullable(),
  isActive: z.boolean().optional().default(true),
});


export const updateExamSchema = createExamSchema.partial();

export const createSubmissionSchema = z.object({
  examId: z.string().min(1, 'Exam ID is required'),
  originalAnswer: z.string().min(1, 'Answer is required'),
});

export const gradeSubmissionSchema = z.object({
  marks: z.number().min(0, 'Marks cannot be negative'),
  feedback: z.string().optional(),
  matchPercentage: z.number().min(0).max(100).optional(),
});

export const createGrievanceSchema = z.object({
  submissionId: z.string().min(1, 'Submission ID is required'),
  grievanceType: z.enum(['SCORE_DISAGREEMENT', 'INCORRECT_FEEDBACK', 'MISSING_ANSWER', 'OTHER']),
  questionNumber: z.number().int().positive().optional().nullable(),
  description: z.string().min(50, 'Description must be at least 50 characters'),
});

export const updateGrievanceSchema = z.object({
  action: z.enum(['resolve', 'dismiss', 'respond']),
  instructorResponse: z.string().optional(),
});

