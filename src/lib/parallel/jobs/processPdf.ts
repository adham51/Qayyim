// src/lib/parallel/jobs/processPdf.ts
import { prisma } from "@/lib/prisma";
import { uploadStudentAnswer } from "@/lib/s3";
import { MESSAGES } from "@/lib/constants";
import { PdfProcessingJob, PdfProcessingResult } from "@/lib/parallel/queues/pdfQueue";
import { Mistral } from "@mistralai/mistralai";

// ✅ Docker-safe: DO NOT use 127.0.0.1 for other containers
// Use env AI_GRADING_SERVICE_URL (example: http://ai_grading:5000)
const QWEN_BASE_URL =
  process.env.AI_GRADING_SERVICE_URL?.replace(/\/$/, "") || "http://ai_grading:5000";

// ✅ Avoid doing stuff at module import time (build-safe)
let _mistral: Mistral | null = null;
function getMistralClient() {
  if (_mistral) return _mistral;

  // you said you don't care about safety; keep a fallback if missing env
  const apiKey = process.env.MISTRAL_API_KEY || "koirVgJzhrERAjR9OnlIhxWW2jgGgQWP";
  _mistral = new Mistral({ apiKey });
  return _mistral;
}

// Data schema interfaces matching Python Pydantic models
interface AnswerEntry {
  questionId: string;
  type: string;
  question: string;
  answer: string | null;
  questionGrade: number;
  studentGrade: number | null;
  feedback: string | null;
}

interface ScannedExam {
  student_info: Record<string, string>;
  answers: AnswerEntry[];
}

/**
 * Process a single PDF submission
 * This function contains all the OCR, AI extraction, grading, and storage logic
 */
export async function processPdfSubmission(job: PdfProcessingJob): Promise<PdfProcessingResult> {
  const { examId, studentUserId, fileBuffer, filename, instructorId } = job;

  try {
    // Get exam details
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam || exam.instructorId !== instructorId) {
      throw new Error("Exam not found or access denied");
    }

    // Get student details
    const student = await prisma.student.findFirst({
      where: { userId: studentUserId },
    });

    if (!student) {
      throw new Error(`${MESSAGES.STUDENT.NOT_FOUND}: ${studentUserId}`);
    }

    // Step 1: OCR Extraction using Mistral
    const realFileBuffer = Buffer.from(fileBuffer, "base64");
    const rawExamText = await performMistralOCR(realFileBuffer, filename);

    if (!rawExamText) {
      throw new Error("OCR failed: Could not retrieve text from the submission file");
    }

    // Step 2: AI Extraction using Mistral
    const prompt = buildMistralExtractionPrompt(rawExamText);
    const extractedData = await performMistralExtraction(prompt);
    const studentAnswers = extractedData.answers;

    // Step 3: Parse exam questions
    const examQuestions = JSON.parse(exam.questions as string);

    // Step 4: Build Qwen grading input
    const qwenInput = {
      examId,
      studentId: student.id,
      questions: studentAnswers.map((studentAns: any) => {
        const modelQuestion = examQuestions.find((q: any) => q.questionId === studentAns.questionId);
        return {
          questionId: studentAns.questionId,
          type: modelQuestion?.type || "SHORT_ANSWER",
          question: modelQuestion?.question || "",
          modelAns: modelQuestion?.answer || "",
          studentAnswer: studentAns.answer,
        };
      }),
    };

    // Step 5: Send to Qwen grading endpoint (Docker-safe)
    const qwenResponse = await fetch(`${QWEN_BASE_URL}/grade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(qwenInput),
    });

    if (!qwenResponse.ok) {
      throw new Error(`Qwen grading failed with status: ${qwenResponse.status}`);
    }

    const qwenResult = await qwenResponse.json();
    const gradedQuestions = qwenResult.questions;

    // Step 6: Merge grading results
    const finalAnswers = studentAnswers.map((studentAns: any) => {
      const graded = gradedQuestions.find((g: any) => g.questionId === studentAns.questionId);
      const modelQuestion = examQuestions.find((q: any) => q.questionId === studentAns.questionId);

      return {
        questionId: studentAns.questionId,
        answer: studentAns.answer,
        studentGrade: graded?.grade || 0,
        questionGrade: modelQuestion?.questionGrade || 0,
        feedback: graded?.feedback || "",
      };
    });

    // Calculate total marks (kept as you had it)
    const totalMarks = finalAnswers.reduce((sum: number, ans: any) => {
      const earnedMarks = (ans.studentGrade || 0) * (ans.questionGrade || 0);
      return sum + earnedMarks;
    }, 0);

    const maxMarks = finalAnswers.reduce((sum: number, ans: any) => {
      return sum + (ans.questionGrade || 0);
    }, 0);

    // Step 7: Upload to S3 (kept)
    const s3Url = await uploadStudentAnswer(examId, studentUserId, realFileBuffer);

    // Step 8: Save to database
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
        status: "GRADED",
        gradedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        studentId: student.id,
        examId,
        fileLink: s3Url,
        originalAnswers: finalAnswers,
        marks: totalMarks,
        status: "GRADED",
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
        percentage: maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : "0",
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
      error: error.message || "Unknown error occurred",
    };
  }
}

/**
 * Perform OCR using Mistral AI
 */
async function performMistralOCR(fileBuffer: Buffer, filename: string): Promise<string | null> {
  try {
    console.log(`📡 [Worker] Uploading ${fileBuffer.length} bytes to Mistral OCR...`);
    const mistralClient = getMistralClient();

    // Step 1: Upload file to Mistral
    const uploadedFile = await mistralClient.files.upload({
      file: {
        fileName: filename,
        content: fileBuffer,
      },
      purpose: "ocr",
    });

    console.log(`✅ [Worker] File uploaded with ID: ${uploadedFile.id}`);

    // Step 2: Process OCR
    const ocrResponse = await mistralClient.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "file",
        fileId: uploadedFile.id,
      },
    });

    console.log(`✅ [Worker] OCR completed, ${ocrResponse.pages.length} pages processed`);

    // Step 3: Combine all pages into markdown
    const fullMarkdown = ocrResponse.pages
      .map((page: any, index: number) => `--- Page ${index + 1} ---\n${page.markdown}`)
      .join("\n\n");

    return fullMarkdown;
  } catch (error) {
    console.error("❌ Mistral OCR Error:", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Perform intelligent extraction using Mistral Large
 */
async function performMistralExtraction(prompt: string): Promise<ScannedExam> {
  try {
    console.log("🤖 [Worker] Running Mistral Large extraction...");
    const mistralClient = getMistralClient();

    const schemaDefinition = {
      type: "object",
      properties: {
        student_info: {
          type: "object",
          additionalProperties: { type: "string" },
        },
        answers: {
          type: "array",
          items: {
            type: "object",
            properties: {
              questionId: { type: "string" },
              type: { type: "string" },
              question: { type: "string" },
              answer: { type: ["string", "null"] },
              questionGrade: { type: "number" },
              studentGrade: { type: ["number", "null"] },
              feedback: { type: ["string", "null"] },
            },
            required: [
              "questionId",
              "type",
              "question",
              "answer",
              "questionGrade",
              "studentGrade",
              "feedback",
            ],
            additionalProperties: false,
          },
        },
      },
      required: ["student_info", "answers"],
      additionalProperties: false,
    };

    const chatResponse = await mistralClient.chat.complete({
      model: "mistral-large-latest",
      messages: [{ role: "user", content: prompt }],
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          name: "ExamAnswerSchema",
          strict: true,
          schemaDefinition,
        },
      },
    });

    const content = chatResponse.choices[0].message.content;
    if (!content) throw new Error("No content returned from Mistral");

    const extractedData = JSON.parse(content) as ScannedExam;
    console.log(`✅ [Worker] Extraction completed, ${extractedData.answers.length} answers extracted`);

    return extractedData;
  } catch (error) {
    console.error("❌ Mistral Extraction Error:", error instanceof Error ? error.message : error);
    throw error;
  }
}

/**
 * Build the Mistral extraction prompt (exact copy from Python script)
 */
function buildMistralExtractionPrompt(fullMarkdown: string): string {
  return `
You are an intelligent exam-structuring assistant.
Your task is to extract the exam into STRICT JSON matching the provided schema.
DO NOT add extra fields. DO NOT add explanations.
────────────────────────────────
CORE EXTRACTION RULES
────────────────────────────────
1) Visual Separation:
   - Printed/digital text → question
   - Handwritten text immediately following → answer
2) Each sub-question MUST become a separate entry in \`answers[]\`.
────────────────────────────────
QUESTION ID NORMALIZATION (MANDATORY)
────────────────────────────────
- If a main question has ANY subparts (labeled OR unlabeled), you MUST NOT create an entry with questionId equal
  to the parent alone (e.g., "1" or "2"). Output ONLY sub-entries and the first MUST start at ".1".
  - Question 1 with subparts -> first is "1.1", then "1.2", ...
  - Question 2 with subparts -> first is "2.1", then "2.2", ...

- Labeled subparts (a/b/c, i/ii/iii, (a)(i), etc.):
  - Normalize labels into numeric hierarchy (e.g., 2(a)(ii) -> 2.1.2)

- Unlabeled subparts:
  - If a parent question clearly contains multiple sub-questions but no labels are present,
    split them and assign synthetic IDs in order like: "3.1", "3.2", "3.3", ...

- Only output a parent-only ID like "3" when the question truly has no subparts (exactly one prompt).
- Apply these rules to ALL question types (MCQ, TrueFalse, Short-Answer, etc.).
────────────────────────────────
GRADING RULES
────────────────────────────────
questionGrade:
- If explicitly stated for the sub-question → use it
- If only stated for the parent question → divide equally among its immediate subparts
studentGrade:
- ONLY extract if explicitly written in the source
- If not present → null
- NEVER infer or calculate studentGrade
feedback:
- MUST always be null
────────────────────────────────
MCQ NORMALIZATION (MANDATORY)
────────────────────────────────
When type == "MCQ":
- answer MUST be exactly:
  "(letter) OptionText"
- NEVER output only the letter
- NEVER output only the option text
────────────────────────────────
TRUE/FALSE NORMALIZATION
────────────────────────────────
When type == "TrueFalse":
- Normalize to exactly "True" or "False"
True indicators:
"true", "t", "yes", "y", "✓", "(✓)", "✔", "v", "2", "L"
False indicators:
"false", "f", "no", "n", "✗", "x", "(x)"
If ambiguous → keep closest raw extracted text
────────────────────────────────
MISSING ANSWER HANDLING (MANDATORY)
────────────────────────────────
- If a question or sub-question has NO student answer present in the source (no handwritten text, no mark, no selection),
  you MUST set:
  answer = null
- NEVER invent, infer, summarize, or restate an answer.
- NEVER output an empty string ("") or placeholder text (e.g., "N/A", "Not answered").
- If an answer is partially visible or unclear, extract the closest raw text that appears.
────────────────────────────────
EXAM CONTENT
────────────────────────────────
EXAM CONTENT:
${fullMarkdown}
`;
}
