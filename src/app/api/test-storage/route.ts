import { adminStorage } from "@/lib/firebase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    console.log("🧪 Diagnostic: Testing Firebase Storage upload...");
    
    const bucket = adminStorage.bucket();
    const fileName = `test_diagnostics_${Date.now()}.txt`;
    const file = bucket.file(fileName);
    
    const content = "Testing Storage connection from Feedback-Sync diagnostic tool.";
    
    await file.save(content, {
      metadata: { contentType: "text/plain" },
      public: true,
    });
    
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
    
    return NextResponse.json({
      success: true,
      message: "Storage connection is working!",
      bucket: bucket.name,
      fileName,
      publicUrl
    });
  } catch (error) {
    console.error("❌ Diagnostic Fallback:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : null,
      env: {
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        hasPrivateKey: !!process.env.FIREBASE_ADMIN_PRIVATE_KEY,
        bucketName: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
      }
    }, { status: 500 });
  }
}
