import { getApps, initializeApp } from "firebase/app";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

// When using emulator, use "demo-test" as projectId to match emulator's project ID
// This ensures tokens have the correct audience claim
const useEmulator = process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "true" ||
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR === "1";
const expectedProjectId = useEmulator
  ? "demo-test"
  : process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: expectedProjectId,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

// Initialize Firestore
export const db = getFirestore(app);

// Connect to Firestore emulator if enabled (client-side only)
if (
  typeof window !== "undefined" &&
  useEmulator
) {
  try {
    // Check if already connected to prevent multiple connections
    connectFirestoreEmulator(db, "localhost", 8080);
    // Log to verify emulator connection (only in development)
    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Firestore connected to EMULATOR at localhost:8080");
    }
  } catch (error) {
    // Ignore error if already connected
    if (
      error instanceof Error &&
      !error.message.includes("already been called")
    ) {
      console.error("❌ Error connecting to Firestore emulator:", error);
    }
  }
} else if (typeof window !== "undefined") {
  // Log warning if emulator should be enabled but isn't
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "⚠️  Firestore NOT using emulator. NEXT_PUBLIC_USE_FIREBASE_EMULATOR:",
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR,
    );
  }
}

export default app;
