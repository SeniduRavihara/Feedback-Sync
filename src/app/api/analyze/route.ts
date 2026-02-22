import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { feedback, project, technicalContext } = await req.json();
    const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
        You are an expert software engineer and code reviewer.
        Analyze this client feedback for the GitHub project "${project}".
        
        Technical Context: ${technicalContext || "No specific technical context provided."}
        
        Client Feedback: "${feedback}"
        
        Provide a structured analysis with:
        
        ## 🔍 Root Cause Analysis
        Identify the likely root cause of the issue or the intent of the improvement.
        
        ## 🛠️ Suggested Fix
        Provide specific, actionable code changes or steps. Include code snippets where applicable.
        
        ## 🤖 AI Coding Prompt
        Write a prompt the developer can paste directly into an AI coding assistant (like Copilot or Gemini) to implement the fix.
        
        ---
        
        ## 📋 Client Summary
        Write 1-2 sentences in plain language explaining that you've understood the issue and are actively addressing it (for the client to read).
      `,
    });

    return NextResponse.json({ suggestion: response.text });
  } catch (error: any) {
    console.error("Analysis error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
