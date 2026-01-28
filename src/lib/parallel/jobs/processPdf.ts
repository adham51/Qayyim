import {prisma} from '@/lib/prisma';
import {uploadStudentAnswer} from '@/lib/s3';
import {MESSAGES} from '@/lib/constants';
import {PdfProcessingJob, PdfProcessingResult} from "@/lib/parallel/queues/pdfQueue";
import {Mistral} from '@mistralai/mistralai';
import axios, {AxiosError} from 'axios';

// Initialize Mistral client
const mistralClient = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY || "koirVgJzhrERAjR9OnlIhxWW2jgGgQWP"
});

// Configure axios instance for Qwen server with better connection handling
const qwenClient = axios.create({
    baseURL: 'http://127.0.0.1:5000',
    timeout: 600000, // 10 minutes timeout for AI grading
    headers: {
        'Content-Type': 'application/json',
    },
    // Better connection pooling for concurrent requests
    maxRedirects: 5,
    // Keep connections alive for reuse
    httpAgent: undefined, // Will use default HTTP agent with keep-alive
});

// Data schema interfaces matching Python Pydantic models
interface QuestionEntry {
    questionId: string;
    type: string;
    question: string;
    answer: string;
    questionGrade: number;
    studentGrade: number | null;
    feedback: string | null;
}

interface ScannedExam {
    student_info: Record<string, string>;
    questions: QuestionEntry[];
}

/**
 * Extract MCQ choice map from question text
 * Supports: A. text, B) text, C - text
 */
function extractMcqChoiceMap(questionText: string): Record<string, string> {
    const text = questionText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    const optionStart = text.search(/(?:^|\n)\s*[A-D]\s*[\.\)\-:]\s+/m);
    const optionsBlock = optionStart !== -1 ? text.substring(optionStart) : text;

    const pattern = /^\s*([A-D])\s*[\.\)\-:]\s*(.+?)(?=^\s*[A-D]\s*[\.\)\-:]\s+|$)/gms;

    const choices: Record<string, string> = {};
    let match;
    while ((match = pattern.exec(optionsBlock)) !== null) {
        const letter = match[1].toUpperCase();
        const body = match[2].replace(/\s+/g, ' ').trim();
        choices[letter] = body;
    }

    return choices;
}

/**
 * Extract MCQ stem (remove options, keep only question)
 */
function extractMcqStem(questionText: string): string {
    const text = questionText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
    const optionStart = text.search(/(?:^|\n)\s*[A-D]\s*[\.\)\-:]\s+/m);

    if (optionStart === -1) {
        return text.replace(/\s+/g, ' ');
    }

    const stem = text.substring(0, optionStart).trim();
    return stem.replace(/\s+/g, ' ');
}

/**
 * Normalize exam JSON:
 * - Adds studentGrade = null and feedback = null
 * - Expands MCQ answers from letter to full selected option
 * - Cleans MCQ question text to stem only
 */
function normalizeExamJson(exam: ScannedExam): ScannedExam {
    const questions = exam.questions.map(q => {
        const normalized = {
            ...q,
            studentGrade: null,
            feedback: null
        };

        if (q.type.toLowerCase() === 'mcq') {
            const answerLetter = q.answer.trim().toUpperCase();

            if (/^[A-D]$/.test(answerLetter)) {
                const fullQuestion = q.question;
                const choices = extractMcqChoiceMap(fullQuestion);
                const stem = extractMcqStem(fullQuestion);

                if (stem) {
                    normalized.question = stem;
                }

                if (choices[answerLetter]) {
                    normalized.answer = `(${answerLetter}) ${choices[answerLetter]}`;
                } else {
                    normalized.answer = `(${answerLetter})`;
                }
            }
        }

        return normalized;
    });

    return {
        student_info: exam.student_info,
        questions
    };
}

/**
 * Process a single PDF submission
 * This function contains all the OCR, AI extraction, grading, and storage logic
 */
export async function processPdfSubmission(
    job: PdfProcessingJob
): Promise<PdfProcessingResult> {
    const { examId, studentUserId, fileBuffer, filename, instructorId, courseName } = job;

    try {
        // Get exam details
        const exam = await prisma.exam.findUnique({
            where: { id: examId },
        });

        if (!exam || exam.instructorId !== instructorId) {
            throw new Error('Exam not found or access denied');
        }

        // Get student details
        const student = await prisma.student.findFirst({
            where: { userId: studentUserId },
        });

        if (!student) {
            throw new Error(`${MESSAGES.STUDENT.NOT_FOUND}: ${studentUserId}`);
        }

        // Step 1: OCR Extraction using Mistral
        const realFileBuffer = Buffer.from(fileBuffer, 'base64');
        const rawExamText = await performMistralOCR(realFileBuffer, filename);

        if (!rawExamText) {
            throw new Error("OCR failed: Could not retrieve text from the submission file");
        }

        // Step 2: AI Extraction using Mistral with the exact Python prompt
        const extractedData = await performMistralExtraction(rawExamText);

        // Step 2.5: Normalize the extracted data (MCQ expansion, etc.)
        const normalizedData = normalizeExamJson(extractedData);
        const studentAnswers = normalizedData.questions;

        // Step 3: Parse exam questions (model answers)
        const examQuestions = JSON.parse(exam.questions as string);

        // Step 4: Build Qwen grading input matching Python server format
        const qwenInput = {
            student_info: {
                Name: normalizedData.student_info.Name || studentUserId,
                ID: studentUserId,
                Course: 'Security',
                Exam: exam.title || 'Unknown Exam'
            },
            answers: studentAnswers.map((studentAns: any) => {
                const modelQuestion = examQuestions.find((q: any) => q.questionId === studentAns.questionId);
                return {
                    questionId: studentAns.questionId,
                    type: modelQuestion?.type || 'Short Answer',
                    question: modelQuestion?.question || studentAns.question,
                    modelAnswer: modelQuestion?.answer || '',
                    student_answer: studentAns.answer
                };
            })
        };

        // Step 5: Send to Qwen grading endpoint using axios
        console.log('🤖 [Worker] Sending to Qwen grading endpoint...');
        console.log(`📊 [Worker] Grading ${qwenInput.answers.length} answers for student ${studentUserId}`);

        let qwenResult;
        try {
            const response = await qwenClient.post('/grade', qwenInput);
            qwenResult = response.data;
            console.log('✅ [Worker] Received response from Qwen');
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const axiosError = error as AxiosError;

                // Handle timeout
                if (axiosError.code === 'ECONNABORTED') {
                    throw new Error('Qwen grading timed out after 10 minutes. The AI server may be overloaded.');
                }

                // Handle connection refused
                if (axiosError.code === 'ECONNREFUSED') {
                    throw new Error('Cannot connect to Qwen grading server. Please ensure the Python server is running on http://127.0.0.1:5000');
                }

                // Handle HTTP error responses
                if (axiosError.response) {
                    const status = axiosError.response.status;
                    const errorText = typeof axiosError.response.data === 'string'
                        ? axiosError.response.data
                        : JSON.stringify(axiosError.response.data);
                    throw new Error(`Qwen grading failed with status ${status}: ${errorText}`);
                }

                // Handle network errors
                if (axiosError.request) {
                    throw new Error(`No response received from Qwen grading server: ${axiosError.message}`);
                }
            }

            // Re-throw unknown errors
            throw new Error(`Failed to connect to Qwen grading server: ${error instanceof Error ? error.message : String(error)}`);
        }

        const gradedAnswers = qwenResult.graded_answers;

        // Step 6: Merge grades into studentAnswers
        const finalAnswers = studentAnswers.map((sa: any) => {
            const graded = gradedAnswers.find((ga: any) => ga.questionId === sa.questionId);
            if (graded) {
                return {
                    ...sa,
                    studentGrade: graded.studentGrade,
                    feedback: graded.feedback
                };
            }
            return sa;
        });

        console.log("Final Answers",finalAnswers);

        // Step 7: Calculate total marks
        const totalMarks = finalAnswers.reduce((sum: number, q: any) => sum + (q.studentGrade * q.questionGrade || 0), 0);
        const maxMarks = finalAnswers.reduce((sum: number, q: any) => sum + q.questionGrade, 0);

        console.log(`📊 [Worker] Total Marks: ${totalMarks}/${maxMarks}`);

        // Step 8: Upload to S3
        console.log('☁️  [Worker] Uploading to S3...');
        const s3Url = await uploadStudentAnswer(
            examId,
            studentUserId,
           realFileBuffer,
        );
        console.log(`✅ [Worker] S3 Upload Complete: ${s3Url}`);

        // Step 9: Save or update submission in DB
        const submission = await prisma.submission.upsert({
            where: {
                studentId_examId: {
                    studentId: student.id,
                    examId: examId,
                },
            },
            update: {
                fileLink: s3Url,
                originalAnswers: finalAnswers,
                marks: totalMarks,
                status: 'GRADED',
                gradedAt: new Date(),
                updatedAt: new Date(),
            },
            create: {
                studentId: student.id,
                examId,
                fileLink: s3Url,
                originalAnswers: finalAnswers,
                marks: totalMarks,
                status: 'GRADED',
                gradedAt: new Date(),
            },
        });

        return {
            success: true,
            filename,
            studentUserId,
            submission: {
                id: submission.id,
                studentId: student.id,
                examId,
                totalMarks,
                maxMarks,
                percentage: maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : '0',
                totalQuestions: finalAnswers.length,
            },
            grading: {
                gradedQuestions: finalAnswers.length,
                results: finalAnswers,
            },
        };
    } catch (error: any) {
        console.error(`Error processing ${filename}:`, error);
        return {
            success: false,
            filename,
            studentUserId,
            error: error.message || 'Unknown error occurred',
        };
    }
}

/**
 * Perform OCR using Mistral AI
 */
async function performMistralOCR(fileBuffer: Buffer, filename: string): Promise<string | null> {
    try {
        console.log(`📡 [Worker] Uploading ${fileBuffer.length} bytes to Mistral OCR...`);

        // Step 1: Upload file to Mistral
        const uploadedFile = await mistralClient.files.upload({
            file: {
                fileName: filename,
                content: fileBuffer
            },
            purpose: "ocr"
        });

        console.log(`✅ [Worker] File uploaded with ID: ${uploadedFile.id}`);

        // Step 2: Process OCR
        const ocrResponse = await mistralClient.ocr.process({
            model: "mistral-ocr-latest",
            document: {
                type: "file",
                fileId: uploadedFile.id
            }
        });

        console.log(`✅ [Worker] OCR completed, ${ocrResponse.pages.length} pages processed`);

        // Step 3: Combine all pages into markdown (matching Python format exactly)
        const fullMarkdown = ocrResponse.pages
            .map((page, index) => `--- Page ${index + 1} ---\n${page.markdown}`)
            .join("\n\n");

        return fullMarkdown;
    } catch (error) {
        console.error('❌ Mistral OCR Error:', error instanceof Error ? error.message : error);
        return null;
    }
}

/**
 * Perform intelligent extraction using Mistral Large
 * Matches Python implementation exactly
 */
async function performMistralExtraction(fullMarkdown: string): Promise<ScannedExam> {
    try {
        console.log('🤖 [Worker] Running Mistral Large extraction...');

        // Build the smart prompt (exact match to Python)
        const smartPrompt = `
You are an exam transcription and structuring assistant (extract-only).
Your task is to extract the exam into STRICT JSON matching the provided schema.

RULES FOR EXTRACTION:
1. **Visual Separation**:
   - Treat **Digital/Printed Text** as the 'Question'.
   - Treat **Handwritten Text** immediately following it as the 'Student Answer'.

2. **Handling Sub-Questions**:
   - If a 'Main Question' (e.g., "Question 2") contains bullet points or sub-parts, treat EACH bullet/part as a separate QuestionEntry.
   - Generate IDs like '2.1', '2.2' (or '2.a', '2.b') for these parts.

3. **Point Distribution Algorithm (CRITICAL)**:
   - Look for marks assigned to the Main Question (e.g., "[4 Points]" or "[10 Marks]").
   - Look for marks assigned to specific sub-questions.
   - **LOGIC**: If the Main Question has a score (e.g., 4) but the sub-questions DO NOT have specific scores, DIVIDE the total equally.
     * Example: "Question 2 [4 Points]" has 2 bullet points -> Assign **2.0 points** to each.
     * Example: "Question 1 [10 Marks]" has 10 MCQs -> Assign **1.0 point** to each.

4. **MCQ & T/F**:
   - Include the full context (Choice Letter + Text) in 'student_answer'.

EXAM CONTENT:
${fullMarkdown}
`;

        // Create JSON schema definition matching Python Pydantic model
        const schemaDefinition = {
            type: "object",
            properties: {
                student_info: {
                    type: "object",
                    additionalProperties: { type: "string" },
                    description: "Name, ID, etc."
                },
                questions: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            questionId: {
                                type: "string",
                                description: "Hierarchical ID (e.g., '2.1', '2.2'). If bullet points, generate IDs like '2.a', '2.b'."
                            },
                            type: {
                                type: "string",
                                description: "Type: 'MCQ', 'True/False', 'Diagram', or 'Long Answer'"
                            },
                            question: {
                                type: "string",
                                description: "The digital printed text of the question/sub-question."
                            },
                            answer: {
                                type: "string",
                                description: "The student's handwritten answer/drawing description."
                            },
                            questionGrade: {
                                type: "number",
                                description: "Points for this specific sub-question. If calculated, use (Total / Count)."
                            },
                            studentGrade: {
                                type: ["number", "null"],
                                description: "Must be null during OCR/extraction."
                            },
                            feedback: {
                                type: ["string", "null"],
                                description: "Must be null during OCR/extraction."
                            }
                        },
                        required: ["questionId", "type", "question", "answer", "questionGrade", "studentGrade", "feedback"],
                        additionalProperties: false
                    }
                }
            },
            required: ["student_info", "questions"],
            additionalProperties: false
        };

        const chatResponse = await mistralClient.chat.complete({
            model: "mistral-large-latest",
            messages: [
                { role: "user", content: smartPrompt }
            ],
            responseFormat: {
                type: "json_schema",
                jsonSchema: {
                    name: "SmartExamSchema",
                    strict: true,
                    schemaDefinition: schemaDefinition
                }
            }
        });

        const content = chatResponse.choices[0].message.content;
        if (!content) {
            throw new Error('No content returned from Mistral');
        }

        const extractedData = JSON.parse(content) as ScannedExam;
        console.log(`✅ [Worker] Extraction completed, ${extractedData.questions.length} questions extracted`);

        return extractedData;
    } catch (error) {
        console.error('❌ Mistral Extraction Error:', error instanceof Error ? error.message : error);
        throw error;
    }
}