import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import admin from "firebase-admin";

// Initialize Firebase Admin SDK
let adminInitialized = false;

function initializeAdmin() {
  if (adminInitialized || admin.apps.length > 0) {
    return true;
  }

  try {
    // Try to initialize with service account credentials
    // You can set this via environment variable (FIREBASE_SERVICE_ACCOUNT as JSON string)
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : null;

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      adminInitialized = true;
      return true;
    } else {
      // Fallback: try to use default credentials (for Firebase hosting/Cloud Run)
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
        });
        adminInitialized = true;
        return true;
      } catch (defaultError) {
        console.error("Firebase Admin initialization error:", defaultError);
        return false;
      }
    }
  } catch (error) {
    console.error("Firebase Admin initialization error:", error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Initialize Firebase Admin SDK
    if (!initializeAdmin()) {
      return NextResponse.json(
        {
          error:
            "Firebase Admin SDK not initialized. Please set FIREBASE_SERVICE_ACCOUNT environment variable.",
        },
        { status: 500 },
      );
    }

    // Get the NextAuth session
    const session = await getServerSession(authOptions);

    if (!session?.firebaseIdToken) {
      return NextResponse.json(
        { error: "No Firebase ID token in session" },
        { status: 401 },
      );
    }

    // Verify the ID token
    const decodedToken = await admin.auth().verifyIdToken(
      session.firebaseIdToken,
    );

    // Create a custom token
    const customToken = await admin.auth().createCustomToken(decodedToken.uid);

    return NextResponse.json({ customToken });
  } catch (error: any) {
    console.error("Error creating custom token:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create custom token" },
      { status: 500 },
    );
  }
}
