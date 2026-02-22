import { db } from "@/lib/firebase";
import { adminStorage } from "@/lib/firebase-admin";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

async function uploadScreenshotToStorage(
  base64Data: string
): Promise<string | null> {
  if (!base64Data) return null;

  try {
    // Strip "data:image/jpeg;base64," prefix
    const matches = base64Data.match(/^data:(.+);base64,(.+)$/);
    if (!matches) return null;

    const mimeType = matches[1]; // e.g. "image/jpeg"
    const imageBuffer = Buffer.from(matches[2], "base64");

    const extension = mimeType.split("/")[1] || "jpg";
    const fileName = `feedbacks/scr_${uuidv4()}.${extension}`;

    const bucket = adminStorage.bucket();
    const file = bucket.file(fileName);

    await file.save(imageBuffer, {
      metadata: { contentType: mimeType },
      public: true, // Make publicly readable
    });

    // Return the public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    return publicUrl;
  } catch (err) {
    console.error("❌ Storage upload failed:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      projectId,
      annotations,
      screenshot,
      pageUrl,
      metadata,
      clientId,
      clientName,
    } = body;

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

    if (!pageUrl) {
      return NextResponse.json(
        { error: "Page URL is required" },
        { status: 400 }
      );
    }

    // Upload screenshot to Firebase Storage and get a public URL
    const screenshotUrl = await uploadScreenshotToStorage(screenshot);

    // Store feedback in Firestore (tiny, fast document — no Base64 blob)
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
      screenshot: screenshotUrl || "", // Short Firebase Storage URL
      clientId: clientId || null,
      clientName: clientName || null,
      metadata: {
        viewport: metadata?.viewport || {},
        timestamp: metadata?.timestamp || new Date().toISOString(),
        userAgent: req.headers.get("user-agent") || "unknown",
      },
      status: "new",
      createdAt: serverTimestamp(),
    });

    console.log("✅ Feedback saved:", docRef.id, "Screenshot URL:", screenshotUrl);

    return NextResponse.json({
      success: true,
      feedbackId: docRef.id,
      screenshotUrl,
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
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
