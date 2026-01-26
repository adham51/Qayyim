import { NextRequest, NextResponse } from 'next/server';
import { Mistral } from '@mistralai/mistralai';

// Initialize Mistral client
const mistralClient = new Mistral({
    apiKey: process.env.MISTRAL_API_KEY || "koirVgJzhrERAjR9OnlIhxWW2jgGgQWP"
});

// Data schema interface for exam questions
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

        // Step 2: Extract questions using Mistral Large
        const prompt = buildExamExtractionPrompt(rawExamText);
        const extractedData = await performMistralExtraction(prompt);

        console.log(`✅ [API] Extraction completed, ${extractedData.questions.length} questions extracted`);

        return NextResponse.json(extractedData);
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

        // Step 3: Combine all pages into markdown
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
 */
async function performMistralExtraction(prompt: string): Promise<ExamQuestions> {
    try {
        console.log('🤖 [API] Running Mistral Large extraction...');

        // Create JSON schema for exam questions
        const schemaDefinition = {
            type: "object",
            properties: {
                questions: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            questionId: { type: "string" },
                            type: { type: "string" },
                            question: { type: "string" },
                            questionGrade: { type: "number" },
                            answer: { type: "string" }
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
                { role: "user", content: prompt }
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

/**
 * Build the exam extraction prompt
 */
function buildExamExtractionPrompt(fullMarkdown: string): string {
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
2) Each sub-question MUST become a separate entry in \`questions[]\`.
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