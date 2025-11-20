import { getApps, initializeApp } from "firebase/app";
import {
  connectAuthEmulator,
  createUserWithEmailAndPassword,
  getAuth,
  GoogleAuthProvider,
  signInWithCustomToken,
  signInWithEmailAndPassword,
  signInWithPopup,
  User,
} from "firebase/auth";

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

// Initialize Firebase (avoid double initialization)
const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];
export const auth = getAuth(app);

// Connect to Auth emulator if enabled (client-side only)
// IMPORTANT: This must be called BEFORE any auth operations
// Check both the environment variable and ensure we're in browser context
const shouldUseEmulator = typeof window !== "undefined" && useEmulator;

if (shouldUseEmulator) {
  try {
    // Check if already connected to prevent multiple connections
    // This will route ALL auth operations to the emulator at localhost:9099
    connectAuthEmulator(auth, "http://localhost:9099", {
      disableWarnings: true,
    });
    // Log to verify emulator connection (only in development)
    if (process.env.NODE_ENV !== "production") {
      console.log(
        "✅ Firebase Auth connected to EMULATOR at http://localhost:9099",
      );
      console.log(
        "   This means ALL authentication will use the emulator, NOT production",
      );
    }
  } catch (error) {
    // Ignore error if already connected
    if (
      error instanceof Error &&
      !error.message.includes("already been called")
    ) {
      console.error("❌ Error connecting to Auth emulator:", error);
    }
  }
} else if (typeof window !== "undefined") {
  // Log warning if emulator should be enabled but isn't
  if (process.env.NODE_ENV !== "production") {
    console.warn(
      "⚠️  Firebase Auth NOT using emulator. NEXT_PUBLIC_USE_FIREBASE_EMULATOR:",
      process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATOR,
    );
    console.warn("   Authentication will use PRODUCTION Firebase");
  }
}

export async function signUp(email: string, password: string) {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    return { user: userCredential.user, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "An unknown error occurred";
    return { user: null, error: errorMessage };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    return { user: userCredential.user, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "An unknown error occurred";
    return { user: null, error: errorMessage };
  }
}

export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    return { user: userCredential.user, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "An unknown error occurred";
    return { user: null, error: errorMessage };
  }
}

export async function getIdToken(user: User | null): Promise<string | null> {
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error("Error getting ID token:", error);
    return null;
  }
}

export async function restoreAuthWithCustomToken(customToken: string) {
  try {
    const userCredential = await signInWithCustomToken(auth, customToken);
    return { user: userCredential.user, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "An unknown error occurred";
    return { user: null, error: errorMessage };
  }
}
