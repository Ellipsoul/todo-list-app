"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { getOrCreateStripeCustomer, stripe } from "@/lib/stripe";
import {
  getUserSubscriptionServer,
  updateUserSubscriptionServer,
} from "@/lib/subscriptions-server";
import { SubscriptionClient, SubscriptionTier } from "@/types/subscription";

export async function createCheckoutSession(
  paymentType: "monthly" | "one-time",
): Promise<{ url: string | null; error: string | null }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !session?.user?.email) {
      return { url: null, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const email = session.user.email;

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomer(userId, email);

    // Get base URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // Create checkout session
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: paymentType === "monthly" ? "subscription" : "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Premium Plan",
              description: "Unlimited todos",
            },
            unit_amount: paymentType === "monthly" ? 999 : 9999, // $9.99/month or $99.99 one-time
            recurring: paymentType === "monthly"
              ? {
                interval: "month",
              }
              : undefined,
          },
          quantity: 1,
        },
      ],
      success_url: `${baseUrl}/settings?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/settings?canceled=true`,
      metadata: {
        userId,
        paymentType,
      },
    });

    return { url: checkoutSession.url, error: null };
  } catch (error) {
    console.error("Error creating checkout session:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return { url: null, error: errorMessage };
  }
}

// Convert server Subscription to client-safe SubscriptionClient
// Handles both client and admin Firestore Timestamps
function toSubscriptionClient(
  subscription: {
    tier: SubscriptionTier;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    status?: "active" | "canceled" | "past_due" | "trialing" | "unpaid";
    currentPeriodEnd?: { toMillis: () => number } | null;
    cancelAtPeriodEnd?: boolean;
    createdAt: { toMillis: () => number };
    updatedAt: { toMillis: () => number };
  } | null,
): SubscriptionClient | null {
  if (!subscription) return null;

  return {
    tier: subscription.tier,
    stripeCustomerId: subscription.stripeCustomerId,
    stripeSubscriptionId: subscription.stripeSubscriptionId,
    status: subscription.status,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    createdAt: subscription.createdAt.toMillis(),
    updatedAt: subscription.updatedAt.toMillis(),
    currentPeriodEnd: subscription.currentPeriodEnd?.toMillis() ?? null,
  };
}

export async function getSubscriptionStatus(): Promise<{
  subscription: SubscriptionClient | null;
  error: string | null;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { subscription: null, error: "Unauthorized" };
    }

    // Use server-side function for server actions
    const subscription = await getUserSubscriptionServer(session.user.id);
    if (!subscription) {
      return { subscription: null, error: "Failed to retrieve subscription" };
    }
    return { subscription: toSubscriptionClient(subscription), error: null };
  } catch (error) {
    console.error("Error getting subscription status:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return { subscription: null, error: errorMessage };
  }
}

// Verify checkout session and return payment status
// Also updates subscription if webhook hasn't processed it yet (fallback for local dev)
export async function verifyCheckoutSession(sessionId: string): Promise<{
  success: boolean;
  error: string | null;
  subscriptionUpdated?: boolean;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // Retrieve the checkout session from Stripe
    const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);

    // Check if payment was successful
    if (checkoutSession.payment_status !== "paid") {
      return { success: false, error: "Payment not completed" };
    }

    // Check current subscription status (use server-side function)
    const currentSubscription = await getUserSubscriptionServer(userId);

    // If subscription is already premium, webhook already processed it
    if (currentSubscription?.tier === SubscriptionTier.PREMIUM) {
      console.log("Subscription already premium, webhook processed it");
      return { success: true, error: null, subscriptionUpdated: false };
    }

    // Payment succeeded but subscription not updated yet
    // This can happen if webhook hasn't been received (common in local dev)
    // Update subscription directly as a fallback using server-side function
    const customerId = checkoutSession.customer as string;

    if (!customerId) {
      console.error("No customer ID in checkout session:", {
        sessionId,
        customer: checkoutSession.customer,
      });
      return {
        success: true,
        error:
          "Payment successful but customer ID not found. Webhook should update your subscription shortly.",
        subscriptionUpdated: false,
      };
    }

    console.log("Updating subscription via server action fallback:", {
      userId,
      customerId,
      mode: checkoutSession.mode,
    });

    // Determine payment type from checkout session mode
    const paymentType = checkoutSession.mode === "subscription"
      ? "recurring"
      : "one-time";

    // Update subscription directly using server-side function
    const updateResult = await updateUserSubscriptionServer(userId, {
      tier: SubscriptionTier.PREMIUM,
      stripeCustomerId: customerId,
      paymentType,
      status: "active",
      cancelAtPeriodEnd: false,
    });

    if (!updateResult.success) {
      console.error("Failed to update subscription:", updateResult.error);
      return {
        success: true,
        error:
          `Payment successful but subscription update failed: ${updateResult.error}. Please contact support.`,
        subscriptionUpdated: false,
      };
    }

    console.log("Subscription updated successfully via server action");

    // If this was a subscription (not one-time), also get subscription details
    if (
      checkoutSession.mode === "subscription" && checkoutSession.subscription
    ) {
      try {
        const stripeSubscription = await stripe.subscriptions.retrieve(
          checkoutSession.subscription as string,
        );
        const admin = await import("firebase-admin");
        await updateUserSubscriptionServer(userId, {
          stripeSubscriptionId: stripeSubscription.id,
          paymentType: "recurring",
          status: mapStripeStatusToSubscriptionStatus(
            stripeSubscription.status,
          ),
          currentPeriodEnd: stripeSubscription.current_period_end
            ? admin.firestore.Timestamp.fromMillis(
              stripeSubscription.current_period_end * 1000,
            )
            : null,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        });
        console.log("Subscription details updated successfully");
      } catch (error) {
        console.error("Error updating subscription details:", error);
        // Non-fatal, subscription tier is already updated
      }
    }

    return { success: true, error: null, subscriptionUpdated: true };
  } catch (error) {
    console.error("Error verifying checkout session:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

// Helper function to map Stripe subscription status
function mapStripeStatusToSubscriptionStatus(
  stripeStatus: string,
): "active" | "canceled" | "past_due" | "trialing" | "unpaid" {
  const statusMap: Record<
    string,
    "active" | "canceled" | "past_due" | "trialing" | "unpaid"
  > = {
    active: "active",
    canceled: "canceled",
    past_due: "past_due",
    trialing: "trialing",
    unpaid: "unpaid",
    incomplete: "active",
    incomplete_expired: "canceled",
    paused: "active",
  };
  return statusMap[stripeStatus] || "active";
}

export async function cancelSubscription(
  cancelImmediately: boolean = false,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const userId = session.user.id;

    // Allow cancellation at any time - users can downgrade even with more than 10 todos
    // They just won't be able to create new todos until they're below 10
    const subscription = await getUserSubscriptionServer(userId);

    if (!subscription?.stripeSubscriptionId) {
      // No active subscription, just update to free tier
      await updateUserSubscriptionServer(userId, {
        tier: SubscriptionTier.FREE,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
      return { success: true, error: null };
    }

    if (cancelImmediately) {
      // Cancel immediately
      await stripe.subscriptions.cancel(subscription.stripeSubscriptionId);
      await updateUserSubscriptionServer(userId, {
        tier: SubscriptionTier.FREE,
        status: "canceled",
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      });
    } else {
      // Cancel at period end
      await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
      await updateUserSubscriptionServer(userId, {
        cancelAtPeriodEnd: true,
      });
    }

    return { success: true, error: null };
  } catch (error) {
    console.error("Error canceling subscription:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

export async function createCustomerPortalSession(): Promise<{
  url: string | null;
  error: string | null;
}> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return { url: null, error: "Unauthorized" };
    }

    const userId = session.user.id;
    const subscription = await getUserSubscriptionServer(userId);

    if (!subscription?.stripeCustomerId) {
      return { url: null, error: "No Stripe customer found" };
    }

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${baseUrl}/settings`,
    });

    return { url: portalSession.url, error: null };
  } catch (error) {
    console.error("Error creating customer portal session:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return { url: null, error: errorMessage };
  }
}
