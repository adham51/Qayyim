import { NextRequest, NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';

// Initialize Mistral client
const mistralClient = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY || "koirVgJzhrERAjR9OnlIhxWW2jgGgQWP"
});

// Data schema interface for exam questions (model answers)
interface QuestionEntry {
    questionId: string;
    type: string;
    question: string;
    questionGrade: number;
    answer: string;
}

interface ExamQuestions {
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
 * Normalize exam JSON for model answers:
 * - Expands MCQ answers from letter to full selected option
 * - Cleans MCQ question text to stem only
 * Note: Does NOT add studentGrade/feedback (not needed for model answers)
 */
function normalizeExamJson(exam: ExamQuestions): ExamQuestions {
    const questions = exam.questions.map(q => {
        const normalized = { ...q };

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

    return { questions };
}

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
        }

        // Validate file type
        if (file.type !== 'application/pdf') {
            return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
        }

        console.log(`📄 [API] Processing exam PDF: ${file.name} (${file.size} bytes)`);

        // Step 1: Perform OCR using Mistral
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const rawExamText = await performMistralOCR(fileBuffer, file.name);

        if (!rawExamText) {
            return NextResponse.json(
                { error: "OCR failed: Could not extract text from PDF" },
                { status: 500 }
            );
        }

        console.log(`✅ [API] OCR completed, text length: ${rawExamText.length} characters`);

        // Step 2: Extract questions using Mistral Large (matching processPdf logic)
        const extractedData = await performMistralExtraction(rawExamText);

        // Step 3: Normalize the data (MCQ expansion, etc.)
        const normalizedData = normalizeExamJson(extractedData);

        console.log(`✅ [API] Extraction completed, ${normalizedData.questions.length} questions extracted`);

        return NextResponse.json(normalizedData);
    } catch (error: any) {
        console.error("❌ Exam Extraction Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to process exam PDF" },
            { status: 500 }
        );
    }
}

/**
 * Perform OCR using Mistral AI
 */
async function performMistralOCR(fileBuffer: Buffer, filename: string): Promise<string | null> {
    try {
        console.log(`📡 [API] Uploading ${fileBuffer.length} bytes to Mistral OCR...`);

        // Step 1: Upload file to Mistral
        const uploadedFile = await mistralClient.files.upload({
            file: {
                fileName: filename,
                content: fileBuffer
            },
            purpose: "ocr"
        });

        console.log(`✅ [API] File uploaded with ID: ${uploadedFile.id}`);

        // Step 2: Process OCR
        const ocrResponse = await mistralClient.ocr.process({
            model: "mistral-ocr-latest",
            document: {
                type: "file",
                fileId: uploadedFile.id
            }
        });

        console.log(`✅ [API] OCR completed, ${ocrResponse.pages.length} pages processed`);

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
 * Uses the SAME prompt logic as processPdf.ts for consistency
 */
async function performMistralExtraction(fullMarkdown: string): Promise<ExamQuestions> {
    try {
        console.log('🤖 [API] Running Mistral Large extraction...');

        // Build the smart prompt (exact match to processPdf.ts)
        const smartPrompt = `
You are an exam transcription and structuring assistant (extract-only).
Your task is to extract the exam into STRICT JSON matching the provided schema.

RULES FOR EXTRACTION:
1. **Visual Separation**:
   - Treat **Digital/Printed Text** as the 'Question'.
   - Treat **Handwritten Text** immediately following it as the 'Answer' (model answer for this exam).

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
   - For MCQ: Extract the answer as just the letter (A, B, C, or D). The normalization will expand it later.
   - Include the full context (Choice Letter + Text) in the question field for MCQs.

5. **Model Answer Extraction**:
   - This is a MODEL ANSWER document, so extract the correct/expected answer for each question.
   - The answer field should contain the instructor's provided answer or solution.

EXAM CONTENT:
${fullMarkdown}
`;

        // Create JSON schema definition for model answers
        const schemaDefinition = {
            type: "object",
            properties: {
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
                                description: "Type: 'MCQ', 'TrueFalse', 'Short Answer', 'Long Answer', etc."
                            },
                            question: {
                                type: "string",
                                description: "The digital printed text of the question/sub-question."
                            },
                            questionGrade: {
                                type: "number",
                                description: "Points for this specific sub-question. If calculated, use (Total / Count)."
                            },
                            answer: {
                                type: "string",
                                description: "The model answer/correct answer for this question."
                            }
                        },
                        required: ["questionId", "type", "question", "questionGrade", "answer"],
                        additionalProperties: false
                    }
                }
            },
            required: ["questions"],
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
                    name: "ExamQuestionsSchema",
                    strict: true,
                    schemaDefinition: schemaDefinition
                }
            }
        });

        const content = chatResponse.choices[0].message.content;
        if (!content) {
            throw new Error('No content returned from Mistral');
        }

        const extractedData = JSON.parse(content) as ExamQuestions;
        console.log(`✅ [API] Extraction completed, ${extractedData.questions.length} questions extracted`);

        return extractedData;
    } catch (error) {
        console.error('❌ Mistral Extraction Error:', error instanceof Error ? error.message : error);
        throw error;
    }
}