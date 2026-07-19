const { GoogleGenAI } = require("@google/genai");
const orderPrompt = require("../prompts/orderPrompt");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
});

async function extractOrder(transcript) {
    try {
        const prompt = orderPrompt(transcript);

        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });

        const cleaned = response.text
            .replace(/```json/g, "")
            .replace(/```/g, "")
            .trim();

        return JSON.parse(cleaned);

    } catch (error) {
        console.error("Gemini Error:", error);

        throw new Error("Failed to extract order.");
    }
}

module.exports = extractOrder