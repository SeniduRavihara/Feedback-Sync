import * as admin from "firebase-admin";

// Prevent re-initialization when Next.js hot-reloads
if (!admin.apps.length) {
  console.log(
    "🔥 Initializing Firebase Admin with Project ID:",
    process.env.FIREBASE_ADMIN_PROJECT_ID
  );
  console.log(
    "📧 Admin Client Email:",
    process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  );

  try {
    if (
      !process.env.FIREBASE_ADMIN_PROJECT_ID ||
      !process.env.FIREBASE_ADMIN_CLIENT_EMAIL ||
      !process.env.FIREBASE_ADMIN_PRIVATE_KEY
    ) {
      throw new Error(
        "Missing Firebase Admin environment variables. Check .env.local for FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, and FIREBASE_ADMIN_PRIVATE_KEY"
      );
    }

    // Fix the private key - handle both escaped and unescaped newlines
    let privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    // If it's surrounded by quotes, remove them
    if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
      privateKey = privateKey.slice(1, -1);
    }

    // Replace literal \n with actual newlines
    privateKey = privateKey.replace(/\\n/g, "\n");

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
        clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });

    console.log("✅ Firebase Admin initialized successfully");
  } catch (error) {
    console.error("❌ Firebase Admin initialization failed:", error);
    throw error;
  }
}

const adminStorage = admin.storage();
const adminDb = admin.firestore();

export { adminDb, adminStorage };
