import { doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import { db } from "./firebase";
import {
  Subscription,
  SubscriptionLimits,
  SubscriptionTier,
} from "@/types/subscription";

const SUBSCRIPTION_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  [SubscriptionTier.FREE]: {
    maxTodos: 10,
  },
  [SubscriptionTier.PREMIUM]: {
    maxTodos: Infinity,
  },
};

export function getSubscriptionLimits(
  tier: SubscriptionTier,
): SubscriptionLimits {
  return SUBSCRIPTION_LIMITS[tier];
}

export async function getUserSubscription(
  userId: string,
): Promise<Subscription | null> {
  try {
    const subscriptionRef = doc(db, `users/${userId}/subscription`, "current");
    const subscriptionSnap = await getDoc(subscriptionRef);

    if (!subscriptionSnap.exists()) {
      // Return default free subscription
      return {
        tier: SubscriptionTier.FREE,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
    }

    return subscriptionSnap.data() as Subscription;
  } catch (error) {
    console.error("Error getting user subscription:", error);
    // Return default free subscription on error
    return {
      tier: SubscriptionTier.FREE,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };
  }
}

export async function updateUserSubscription(
  userId: string,
  subscriptionData: Partial<Subscription>,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const subscriptionRef = doc(db, `users/${userId}/subscription`, "current");
    const now = Timestamp.now();

    // Get existing subscription to preserve createdAt
    const existing = await getDoc(subscriptionRef);
    const createdAt = existing.exists()
      ? (existing.data() as Subscription).createdAt
      : now;

    await setDoc(
      subscriptionRef,
      {
        ...subscriptionData,
        updatedAt: now,
        createdAt,
      },
      { merge: true },
    );

    // Update reverse lookup if stripeCustomerId is provided
    if (subscriptionData.stripeCustomerId) {
      const customerMappingRef = doc(
        db,
        "stripeCustomers",
        subscriptionData.stripeCustomerId,
      );
      await setDoc(customerMappingRef, { userId }, { merge: true });
    }

    return { success: true, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    console.error("Error updating user subscription:", error);
    return { success: false, error: errorMessage };
  }
}

export async function getUserByStripeCustomerId(
  stripeCustomerId: string,
): Promise<string | null> {
  try {
    const customerMappingRef = doc(db, "stripeCustomers", stripeCustomerId);
    const customerMappingSnap = await getDoc(customerMappingRef);

    if (!customerMappingSnap.exists()) {
      return null;
    }

    const data = customerMappingSnap.data();
    return data?.userId || null;
  } catch (error) {
    console.error("Error getting user by Stripe customer ID:", error);
    return null;
  }
}
