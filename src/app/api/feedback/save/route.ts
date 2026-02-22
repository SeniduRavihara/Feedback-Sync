import { db } from "@/lib/firebase";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { projectId, annotations, screenshot, pageUrl, metadata } = body;

    // Validate required fields
    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    if (!annotations || annotations.length === 0) {
      return NextResponse.json(
        { error: "At least one annotation is required" },
        { status: 400 }
      );
    }

    if (!screenshot) {
      return NextResponse.json(
        { error: "Screenshot is required" },
        { status: 400 }
      );
    }

    if (!pageUrl) {
      return NextResponse.json(
        { error: "Page URL is required" },
        { status: 400 }
      );
    }

    // Store in Firestore
    const feedbackRef = collection(db, "feedback");
    const docRef = await addDoc(feedbackRef, {
      projectId,
      pageUrl,
      annotations: annotations.map((ann: any) => ({
        id: ann.id,
        x: ann.x,
        y: ann.y,
        number: ann.number,
        comment: ann.comment || "",
      })),
      screenshot,
      metadata: {
        viewport: metadata?.viewport || {},
        timestamp: metadata?.timestamp || new Date().toISOString(),
        userAgent: req.headers.get("user-agent") || "unknown",
      },
      status: "new",
      createdAt: serverTimestamp(),
    });

    console.log("✅ Feedback saved:", docRef.id);

    return NextResponse.json({
      success: true,
      feedbackId: docRef.id,
    });
  } catch (error) {
    console.error("❌ Feedback API Error:", error);
    return NextResponse.json(
      {
        error: "Failed to save feedback",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Enable CORS for widget requests
export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
