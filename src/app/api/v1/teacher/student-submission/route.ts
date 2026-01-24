export const runtime = "nodejs";

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/middleware';
import { successResponse, handleApiError } from '@/lib/api-response';
import { uploadStudentAnswer } from '@/lib/s3';
import { FILE_UPLOAD, MESSAGES } from '@/lib/constants';
import { getExamRawText } from '@/services/teacherExamService';
import { generateText } from '@/ai/genkit';

function extractStudentUserId(filename: string): string | null {
  const nameWithoutExt = filename.replace(/\.pdf$/i, '');
  return nameWithoutExt || null;
}

export async function POST(request: NextRequest) {
  try {
    const authUser = requireRole(request, 'instructor');
    const instructor = await prisma.instructor.findUnique({
      where: { userId: authUser.userId }
    });

    if (!instructor) {
      throw new Error('Instructor not found');
    }

    const formData = await request.formData();

    const examId = formData.get('examId') as string;
    const autoExtract = formData.get('autoExtract') === 'true';
    const file = formData.get('file') as File; // Changed to single file

    if (!examId || !file) {
      throw new Error('Exam ID and file are required');
    }

    // Validate file type
    if (file.type !== FILE_UPLOAD.ALLOWED_TYPES.PDF) {
      throw new Error(MESSAGES.UPLOAD.INVALID_TYPE);
    }

    // Validate file size
    if (file.size > FILE_UPLOAD.MAX_FILE_SIZE) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(2);
      throw new Error(`${MESSAGES.UPLOAD.FILE_TOO_LARGE} (File size: ${sizeMB}MB)`);
    }

    const exam = await prisma.exam.findUnique({
      where: { id: examId },
    });

    if (!exam || exam.instructorId !== instructor.id) {
      throw new Error('Exam not found or access denied');
    }

    // Extract student user ID from filename
    const studentUserId = autoExtract
        ? extractStudentUserId(file.name)
        : file.name.replace(/\.pdf$/i, '');

    if (!studentUserId) {
      throw new Error(MESSAGES.STUDENT.ID_EXTRACT_FAILED);
    }

    const student = await prisma.student.findFirst({
      where: { userId: studentUserId },
    });

    if (!student) {
      throw new Error(`${MESSAGES.STUDENT.NOT_FOUND}: ${studentUserId}`);
    }

    // Step 1: OCR Extraction
    const rawExamText = await getExamRawText(file);
    if (!rawExamText || !rawExamText.text) {
      throw new Error("OCR failed: Could not retrieve text from the submission file");
    }

    // Step 2: AI Extraction using buildSubmissionExtractionPrompt
    const prompt = buildSubmissionExtractionPrompt(rawExamText.text);
    const aiResponse = await generateText(prompt);

    // Clean up markdown formatting if the AI returned it
    let jsonText = aiResponse.trim();
    if (jsonText.startsWith("```json")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    } else if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```\n?/g, "");
    }

    const extractedData = JSON.parse(jsonText);
    const studentAnswers = extractedData.answers; // Array of {questionId, answer, studentGrade: null, questionGrade: null, feedback: ""}

    // Step 3: Parse exam questions to get model answers
    const examQuestions = JSON.parse(exam.questions as string);

    // Step 4: Build Qwen input payload
    const qwenInput = {
      examId,
      studentId: student.id,
      questions: studentAnswers.map((studentAns: any) => {
        // Find corresponding model answer from exam
        const modelQuestion = examQuestions.find((q: any) => q.questionId === studentAns.questionId);

        return {
          questionId: studentAns.questionId,
          type: modelQuestion?.type || 'SHORT_ANSWER',
          question: modelQuestion?.question || '',
          modelAns: modelQuestion?.answer || '',
          studentAnswer: studentAns.answer
        };
      })
    };

    // Step 5: Send to Qwen grading endpoint
    const qwenResponse = await fetch('http://127.0.0.1:5000/grade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(qwenInput),
    });

    if (!qwenResponse.ok) {
      throw new Error(`Qwen grading failed with status: ${qwenResponse.status}`);
    }

    const qwenResult = await qwenResponse.json();
    const gradedQuestions = qwenResult.questions; // Array of {questionId, question, grade, feedback}

    // Step 6: Merge grading results back into originalAnswers
    const finalAnswers = studentAnswers.map((studentAns: any) => {
      const graded = gradedQuestions.find((g: any) => g.questionId === studentAns.questionId);
      const modelQuestion = examQuestions.find((q: any) => q.questionId === studentAns.questionId);

      return {
        questionId: studentAns.questionId,
        answer: studentAns.answer,
        studentGrade: graded?.grade || 0,
        questionGrade: modelQuestion?.questionGrade || 0,
        feedback: graded?.feedback || ''
      };
    });

    // Calculate total marks: sum of (studentGrade * questionGrade) for each question
    const totalMarks = finalAnswers.reduce((sum: number, ans: any) => {
      const earnedMarks = (ans.studentGrade || 0) * (ans.questionGrade || 0);
      return sum + earnedMarks;
    }, 0);

    // Calculate maximum possible marks for percentage
    const maxMarks = finalAnswers.reduce((sum: number, ans: any) => {
      return sum + (ans.questionGrade || 0);
    }, 0);

    // Step 7: Upload to S3
    const buffer = Buffer.from(await file.arrayBuffer());
    const s3Url = await uploadStudentAnswer(examId, studentUserId, buffer);

    // Step 8: Save to database with grading results and calculated marks
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
        marks: totalMarks,  // Save calculated marks
        status: 'GRADED',
        gradedAt: new Date(),
        updatedAt: new Date(),
      },
      create: {
        studentId: student.id,
        examId,
        fileLink: s3Url,
        originalAnswers: finalAnswers,
        marks: totalMarks,  // Save calculated marks
        status: 'GRADED',
        gradedAt: new Date(),
      },
    });

    return successResponse(
        {
          submission: {
            id: submission.id,
            studentId: student.id,
            studentUserId,
            examId,
            totalMarks,
            maxMarks,
            percentage: maxMarks > 0 ? ((totalMarks / maxMarks) * 100).toFixed(2) : 0,
            totalQuestions: finalAnswers.length,
          },
          s3Upload: {
            success: true,
            url: s3Url,
            filename: file.name,
          },
          grading: {
            gradedQuestions: finalAnswers.length,
            results: finalAnswers,
          },
          qwenResponse: qwenResult,
        },
        'Submission processed, graded, and uploaded successfully'
    );

  } catch (error) {
    return handleApiError(error);
  }
}

function buildSubmissionExtractionPrompt(rawExamText: string): string {
  return `
You are given raw OCR text extracted from a single scanned handwritten exam PDF.
The PDF represents ONE source only (e.g., a student solution OR an official solution),
but NEVER a merged or paired document.

Your task is to analyze, clean, normalize, and structure the OCR text into a
clear, logically formatted, and STRICTLY VALID JSON that represents the exam
questions and the handwritten answers EXACTLY as written.

The goal is to convert OCR text into a grading-ready structured JSON
suitable for automated processing in the Qayyim evaluation system.

Do NOT calculate scores, correctness, feedback, grading outcomes,
or comparisons of any kind.
Do NOT mention model answers, students, or merging.
--------------------------------------------------------------------
PHASE 1 — STRUCTURED JSON CONVERSION

Your JSON output MUST strictly follow the specification below.

GENERAL EXTRACTION RULES
• Do not summarize, interpret, or change meaning.
• Fix only obvious OCR or formatting errors (spacing, capitalization, common OCR mistakes).
• Preserve numbering, ordering, equations, and structure exactly.
• Remove non-text placeholders:
  [Image of …], [Drawing], [Sketch], (figure), (diagram), (graph)
• Remove scanning artifacts:
  page numbers, headers, footers, watermarks
  (e.g., “Scanned with CamScanner”).
• Preserve original question order and hierarchy.
• Do NOT renumber, merge, or infer questions.
• If a question’s points value is missing:
  – Inherit from the same section if explicitly defined.
  – Otherwise leave it blank.

--------------------------------------------------------------------
REQUIRED TOP-LEVEL STRUCTURE

Output EXACTLY ONE JSON object with this structure:

{
  "answers": [
    {
      "questionId": "string",
      "type": "MCQ | TrueFalse | Short-Answer | Calculation | ...",
      "answer": "string",
      "studentGrade": number,
      "questionGrade": number,
      "feedback": "string"
    }
  ]
}


Do NOT include:
• exam_title
• student name
• student ID
• model_answer
• student_answer
• table_answers
• metadata or comments

--------------------------------------------------------------------
STRICT MCQ / TRUE-FALSE STRUCTURE

Every MCQ or True/False question MUST use this exact object structure:

{
  "questionId": "string",
  "type": "MCQ | TrueFalse",
  "answer": "string",
  "studentGrade": number,
  "questionGrade": number,
  "feedback": "string"
}

--------------------------------------------------------------------
MCQ NORMALIZATION RULES (MANDATORY)

1. The \`answer\` field MUST ALWAYS be in this exact format:
   "(letter) OptionText"

   Example:
   "(b) Protocols"

2. NEVER output:
   • Only the letter (e.g., "b")
   • Only the option text (e.g., "Protocols")

3. Extract the selected option letter (case-insensitive),
   and pair it with the EXACT option text as written in the question.

4. Preserve the full MCQ question text EXACTLY, including:
   • Question numbering (e.g., "1.", "1.1", "2.3")
   • All options (a, b, c, d, or any count)
   • Original order, labels, line breaks, and spacing
   • Minor OCR fixes only

5. Do NOT:
   • Add options
   • Remove options
   • Reorder options
   • Infer missing options

--------------------------------------------------------------------
TRUE / FALSE NORMALIZATION RULES

1. The ONLY valid values for \`answer\` are:
   "True"
   "False"
   (Capitalized exactly)

2. Do NOT include the statement text inside \`answer\`.
   The statement belongs ONLY in the \`question\` field.

3. Normalize inputs as follows (case-insensitive):
   TRUE indicators:
   "true", "t", "yes", "y", "✔", "(✔)", "✓", "v", "2", "L"

   FALSE indicators:
   "false", "f", "no", "n", "✘", "x", "(x)"

4. If the answer is ambiguous or conflicting, leave \`answer\` as an empty string.

--------------------------------------------------------------------
FORMATTING REQUIREMENTS

• Merge multi-line text into a single clean string using "\\n".
• Convert tables to Markdown ONLY when unavoidable.
• Keep all equations in LaTeX.
• Escape all backslashes as double backslashes (\\\\).
• Escape all internal quotes using \\".
• Sub-questions are allowed ONLY for non-MCQ types.
• Do NOT invent missing content.

--------------------------------------------------------------------
VALID JSON RULES (STRICT)

• Output STRICTLY valid JSON only.
• No comments.
• No trailing commas.
• No text before or after JSON.
• Double quotes for all strings.
• Escape rules MUST be enforced.
• Validate JSON before returning it.

--------------------------------------------------------------------
JSON ESCAPE RULES FOR LaTeX & SPECIAL CHARACTERS

MANDATORY RULES:

1. Every backslash MUST be doubled:
   "\\"  → "\\\\"
   "\\frac" → "\\\\frac"
   "\\times" → "\\\\times"

2. NEVER allow a single unescaped backslash.

3. Disallow raw escape sequences:
   \\n \\t \\m \\s \\p
   Output instead:
   \\\\n \\\\t \\\\m \\\\s \\\\p

4. LaTeX example:
   $t_{trans} = \\frac{1024}{4 \\times 10^6}$
   becomes:
   "$t_{trans} = \\\\frac{1024}{4 \\\\times 10^6}$"

5. Replace all real newlines with literal "\\n".
6. Convert tabs to spaces.
7. If unsure whether a character needs escaping, ESCAPE IT.

--------------------------------------------------------------------
POINTS & SCORING CONSISTENCY

• Do NOT assign default points unless explicitly stated.
• If a section gives a total score for multiple questions:
  – Divide exactly.
  – Do NOT round.
• Preserve stated per-question points exactly.
• MCQs in the same section MUST have identical points unless specified.
• Do NOT infer, guess, or inflate scores.

--------------------------------------------------------------------
OCR TYPO & GARBLED TEXT HANDLING

• Fix ONLY obvious OCR errors that do not alter meaning.
• Allowed:
  spacing issues, merged words, clear misspellings.
• NOT allowed:
  rewriting, rephrasing, improving clarity.
• If ambiguous, preserve original OCR text.

--------------------------------------------------------------------
QUESTION / ANSWER SEPARATION

• \`question\` = question prompt ONLY.
• \`answer\` = handwritten response ONLY.
• Do NOT embed answers inside question text.
• If OCR mixes them, separate correctly without loss.

--------------------------------------------------------------------
SUB-QUESTION & MULTI-PART HANDLING

• One logical task = one question object.
• Split questions if text contains multiple independent prompts:
  (a), (b), i), ii), etc.
• Preserve original numbering.
• If numbering is missing, derive consistent hierarchical IDs.
• Logical structure overrides OCR numbering artifacts.

--------------------------------------------------------------------
FINAL ENFORCEMENT RULES

• One question object = exactly one \`answer\`.
• Preserve original order strictly.
• No diagrams, no images, no explanations.
• Automated grading compatibility overrides OCR artifacts.

--------------------------------------------------------------------
FINAL OUTPUT RULE

• Output EXACTLY ONE JSON object.
• Containing ONLY the \`questions\` array.
• NO extra text.

DO NOT calculate scores, correctness, feedback, grading outcomes.

OCR Text:
"""
${rawExamText}
"""
`;
}
