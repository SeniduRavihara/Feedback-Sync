import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { audio } = await req.json();
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: "audio/webm",
                data: audio,
              },
            },
            {
              text: `Transcribe this audio recording accurately.
              
              Instructions:
              - If the audio is in English, transcribe it in English only.
              - If the audio is in Sinhala (සිංහල), transcribe it in Sinhala script AND provide an English translation below it, formatted as:
                [Sinhala]: <sinhala text>
                [English Translation]: <english translation>
              - If mixed language, transcribe each part in its respective language.
              - Do not add any commentary, just the transcription.`,
            },
          ],
        },
      ],
    });

    return NextResponse.json({ transcription: response.text });
  } catch (error: any) {
    console.error("Transcription error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
