import { NextRequest, NextResponse } from 'next/server';
import { generateText } from "@/ai/genkit";

export async function POST(req: NextRequest) {
    try {
        const { text } = await req.json();

        if (!text) {
            return NextResponse.json({ error: "No exam text provided for extraction" }, { status: 400 });
        }

        // Use the prompt builder from your service
        const prompt = buildExamExtractionPrompt(text);

        // Call the new generateText function from genkit.ts
        const aiResponse = await generateText(prompt);

        // Clean up markdown formatting if the AI returned it
        let jsonText = aiResponse.trim();
        if (jsonText.startsWith("```json")) {
            jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        } else if (jsonText.startsWith("```")) {
            jsonText = jsonText.replace(/```\n?/g, "");
        }

        const questions = JSON.parse(jsonText);

        return NextResponse.json(questions);
    } catch (error: any) {
        console.error("AI Extraction Error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to parse exam questions" },
            { status: 500 }
        );
    }
}

function buildExamExtractionPrompt(rawExamText: string): string {
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
  "questions": [
    {
      "questionId": "string",
      "type": "MCQ | TrueFalse | Short-Answer | Calculation | ...",
      "question": "string",
      "questionGrade": number,
      "answer": "string"
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
  "question": "string",
  "questionGrade": number,
  "answer": "string"
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

