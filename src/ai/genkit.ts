import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function generateText(prompt: string): Promise<string> {
    if (!prompt || typeof prompt !== "string") {
        throw new Error("Prompt must be a non-empty string");
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
        });

        const result = await model.generateContent(prompt);
        const response = result.response.text();

        if (!response) {
            throw new Error("Gemini returned an empty response");
        }

        return response;
    } catch (err: any) {
        // Preserve Gemini error info if present
        const message =
            err?.message ||
            err?.error?.message ||
            "Failed to generate content from Gemini";

        throw new Error(message);
    }
}
