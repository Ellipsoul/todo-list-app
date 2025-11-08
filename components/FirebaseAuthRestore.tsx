"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { auth } from "@/lib/firebase-auth";
import { restoreAuthWithCustomToken } from "@/lib/firebase-auth";
import { onAuthStateChanged } from "firebase/auth";

/**
 * Component that restores Firebase Auth state when NextAuth session exists
 * This ensures Firestore queries work properly after authentication
 */
export function FirebaseAuthRestore() {
  const { data: session, status } = useSession();
  const isRestoringRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.firebaseIdToken) {
      return;
    }

    // Check if Firebase Auth is already authenticated
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Firebase Auth is already authenticated, no need to restore
        return;
      }

      // Firebase Auth is not authenticated, restore it using custom token
      if (!isRestoringRef.current) {
        isRestoringRef.current = true;
        try {
          // Get custom token from API
          const response = await fetch("/api/auth/custom-token", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            console.error("Failed to get custom token");
            isRestoringRef.current = false;
            return;
          }

          const data = await response.json();
          if (data.customToken) {
            // Sign in with custom token
            const result = await restoreAuthWithCustomToken(data.customToken);
            if (result.error) {
              console.error("Failed to restore Firebase Auth:", result.error);
            }
          }
        } catch (error) {
          console.error("Error restoring Firebase Auth:", error);
        } finally {
          isRestoringRef.current = false;
        }
      }
    });

    return () => unsubscribe();
  }, [session, status]);

  return null; // This component doesn't render anything
}

