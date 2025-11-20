import admin from "firebase-admin";
import { PaymentType, SubscriptionTier } from "@/types/subscription";

// Server-side Subscription type using admin Timestamps
type SubscriptionServer = {
  tier: SubscriptionTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paymentType?: PaymentType;
  status?: "active" | "canceled" | "past_due" | "trialing" | "unpaid";
  currentPeriodEnd?: admin.firestore.Timestamp | null;
  cancelAtPeriodEnd?: boolean;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
};

// Initialize Admin SDK (reuse the logic from auth.ts)
let adminInitialized = false;

function initializeAdmin() {
  if (adminInitialized || admin.apps.length > 0) {
    return true;
  }

  try {
    if (process.env.USE_FIREBASE_EMULATOR === "true") {
      try {
        admin.initializeApp({
          projectId: "demo-test",
        });
        adminInitialized = true;
        return true;
      } catch (emulatorError) {
        console.error(
          "Firebase Admin emulator initialization error:",
          emulatorError,
        );
        return false;
      }
    }

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

export async function getUserSubscriptionServer(
  userId: string,
): Promise<SubscriptionServer | null> {
  if (!initializeAdmin()) {
    console.error("Failed to initialize Firebase Admin SDK");
    return null;
  }

  try {
    const db = admin.firestore();
    const subscriptionRef = db.doc(`users/${userId}/subscription/current`);
    const subscriptionSnap = await subscriptionRef.get();

    if (!subscriptionSnap.exists) {
      // Return default free subscription
      return {
        tier: SubscriptionTier.FREE,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
      };
    }

    const data = subscriptionSnap.data();
    return data as SubscriptionServer;
  } catch (error) {
    console.error("Error getting user subscription:", error);
    return null;
  }
}

export async function updateUserSubscriptionServer(
  userId: string,
  subscriptionData: Partial<SubscriptionServer>,
): Promise<{ success: boolean; error: string | null }> {
  if (!initializeAdmin()) {
    return { success: false, error: "Failed to initialize Firebase Admin SDK" };
  }

  try {
    const db = admin.firestore();
    const subscriptionRef = db.doc(`users/${userId}/subscription/current`);
    const now = admin.firestore.Timestamp.now();

    // Get existing subscription to preserve createdAt
    const existing = await subscriptionRef.get();
    const createdAt = existing.exists
      ? (existing.data() as SubscriptionServer).createdAt
      : now;

    // Prepare update data - handle Timestamp conversions
    const updateData: Partial<SubscriptionServer> = {
      ...subscriptionData,
      updatedAt: now,
      createdAt,
    };

    // Remove undefined values to avoid overwriting with undefined
    Object.keys(updateData).forEach((key) => {
      const typedKey = key as keyof SubscriptionServer;
      if (updateData[typedKey] === undefined) {
        delete updateData[typedKey];
      }
    });

    // currentPeriodEnd is already an admin Timestamp if provided, or null/undefined
    // No conversion needed as we're storing admin Timestamps

    await subscriptionRef.set(updateData, { merge: true });

    // Update reverse lookup if stripeCustomerId is provided
    if (subscriptionData.stripeCustomerId) {
      const customerMappingRef = db.doc(
        `stripeCustomers/${subscriptionData.stripeCustomerId}`,
      );
      await customerMappingRef.set({ userId }, { merge: true });
    }

    console.log(`Successfully updated subscription for user ${userId}:`, {
      tier: subscriptionData.tier,
      stripeCustomerId: subscriptionData.stripeCustomerId,
    });

    return { success: true, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    console.error("Error updating user subscription:", error);
    return { success: false, error: errorMessage };
  }
}

export async function getUserByStripeCustomerIdServer(
  stripeCustomerId: string,
): Promise<string | null> {
  if (!initializeAdmin()) {
    return null;
  }

  try {
    const db = admin.firestore();
    const customerMappingRef = db.doc(`stripeCustomers/${stripeCustomerId}`);
    const customerMappingSnap = await customerMappingRef.get();

    if (!customerMappingSnap.exists) {
      return null;
    }

    const data = customerMappingSnap.data();
    return data?.userId || null;
  } catch (error) {
    console.error("Error getting user by Stripe customer ID:", error);
    return null;
  }
}
