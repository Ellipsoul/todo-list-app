import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Firebase",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.idToken) {
          return null;
        }

        try {
          // Verify the Firebase ID token
          // Use emulator endpoint if emulator mode is enabled, otherwise use production
          const isEmulator = process.env.USE_FIREBASE_EMULATOR === "true";
          const endpoint = isEmulator
            ? "http://localhost:9099/identitytoolkit.googleapis.com/v1/accounts:lookup"
            : `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}`;

          const response = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idToken: credentials.idToken,
            }),
          });

          if (!response.ok) {
            return null;
          }

          const data = await response.json();
          const user = data.users?.[0];

          if (user) {
            return {
              id: user.localId,
              email: user.email,
              name: user.displayName || null,
              firebaseIdToken: credentials.idToken, // Store the ID token
            };
          }
          return null;
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        // Store the Firebase ID token from user object
        if ("firebaseIdToken" in user && typeof user.firebaseIdToken === "string") {
          token.firebaseIdToken = user.firebaseIdToken;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        // Include Firebase ID token in session for client-side use
        session.firebaseIdToken = token.firebaseIdToken;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET,
};
