import * as admin from "firebase-admin";

// Prevent re-initialization when Next.js hot-reloads
if (!admin.apps.length) {
  console.log("🔥 Initializing Firebase Admin with Project ID:", process.env.FIREBASE_ADMIN_PROJECT_ID);
  console.log("📧 Admin Client Email:", process.env.FIREBASE_ADMIN_CLIENT_EMAIL);
  
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
      clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
      // Replace escaped newlines that get mangled in env vars
      privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  });
}

const adminStorage = admin.storage();
const adminDb = admin.firestore();

export { adminDb, adminStorage };
