"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  getIdToken,
  signIn as firebaseSignIn,
  signInWithGoogle,
  signUp,
} from "@/lib/firebase-auth";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let firebaseUser = null;

      if (isSignUp) {
        // Sign up with Firebase Auth
        const result = await signUp(email, password);
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }
        firebaseUser = result.user;
      } else {
        // Sign in with Firebase Auth
        const result = await firebaseSignIn(email, password);
        if (result.error) {
          setError(result.error);
          setLoading(false);
          return;
        }
        firebaseUser = result.user;
      }

      // Get Firebase ID token and sign in with NextAuth
      const idToken = await getIdToken(firebaseUser);
      if (!idToken) {
        setError("Failed to get authentication token");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        idToken,
        redirect: false,
      });

      if (result?.error) {
        setError("Authentication failed");
      } else if (result?.ok) {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);

    try {
      // Sign in with Firebase Auth using Google
      const result = await signInWithGoogle();
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Get Firebase ID token and sign in with NextAuth
      const idToken = await getIdToken(result.user);
      if (!idToken) {
        setError("Failed to get authentication token");
        setLoading(false);
        return;
      }

      const nextAuthResult = await signIn("credentials", {
        idToken,
        redirect: false,
      });

      if (nextAuthResult?.error) {
        setError("Authentication failed");
      } else if (nextAuthResult?.ok) {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="bg-card border border-border rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-card-foreground mb-2 text-center">
            {isSignUp ? "Sign Up" : "Sign In"}
          </h1>
          <p className="text-muted-foreground text-center mb-6">
            {isSignUp
              ? "Create an account to get started"
              : "Welcome back! Please sign in to continue"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-card-foreground mb-2"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-card-foreground mb-2"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-4 py-2 border border-input rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive text-destructive-foreground px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground py-2 px-4 rounded-lg font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading..." : isSignUp ? "Sign Up" : "Sign In"}
            </button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-card text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-2 border border-input rounded-lg bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53 2.27 3.31v2.81h3.68c2.15-1.98 3.39-4.9 3.39-8.13z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.68-2.81c-.98.66-2.23 1.06-3.6 1.06-2.77 0-5.12-1.87-5.96-4.38H2.18v2.9C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M6.04 14.21c-.22-.66-.35-1.36-.35-2.08s.13-1.42.35-2.08V7.15H2.18C1.43 8.48 1 9.99 1 11.5s.43 3.02 1.18 4.35l2.85-2.22.01-.42z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.15l3.86 2.99c.84-2.51 3.19-4.38 5.96-4.38z"
                />
              </svg>
              Sign in with Google
            </button>
          </div>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(!isSignUp);
                setError("");
              }}
              className="text-primary hover:underline text-sm"
            >
              {isSignUp
                ? "Already have an account? Sign in"
                : "Don't have an account? Sign up"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
