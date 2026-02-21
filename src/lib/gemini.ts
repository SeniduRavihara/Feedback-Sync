import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

export async function analyzeFeedback(feedback: string, codebase: string) {
  const model = ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `
      Feedback: ${feedback}
      
      Codebase Context:
      ${codebase}
      
      Analyze the feedback and provide:
      1. Summary of the issue/improvement.
      2. Specific code fix suggestions or architectural changes.
      3. A prompt I can use to apply this fix.
      
      Respond in Markdown.
    `,
  });

  const response = await model;
  return response.text;
}

export async function transcribeAudio(base64Audio: string) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-native-audio-preview-09-2025",
    contents: [
      {
        inlineData: {
          mimeType: "audio/pcm;rate=16000",
          data: base64Audio,
        },
      },
      { text: "Transcribe this audio. If it is in Sinhala, transcribe it in Sinhala and also provide an English translation." },
    ],
  });

  return response.text;
}
