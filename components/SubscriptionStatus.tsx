"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  cancelSubscription,
  createCheckoutSession,
  createCustomerPortalSession,
} from "@/app/actions/stripe";
import { SubscriptionClient } from "@/types/subscription";
import { SubscriptionTier } from "@/types/subscription";
import toast from "react-hot-toast";

interface SubscriptionStatusProps {
  subscription: SubscriptionClient;
  todoCount: number;
}

export function SubscriptionStatus({
  subscription,
  todoCount,
}: SubscriptionStatusProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const isPremium = subscription.tier === SubscriptionTier.PREMIUM;
  // Determine subscription type:
  // - If they have a stripeSubscriptionId, it's definitely a recurring subscription
  // - If paymentType is explicitly "one-time" and no subscriptionId, it's lifetime
  // - Otherwise, if premium, default to recurring (for backwards compatibility)
  const hasSubscriptionId = !!subscription.stripeSubscriptionId;
  const isLifetime = subscription.paymentType === "one-time" &&
    !hasSubscriptionId;
  const isRecurring = hasSubscriptionId ||
    subscription.paymentType === "recurring" ||
    (isPremium && subscription.paymentType !== "one-time");
  const isCanceled = subscription.cancelAtPeriodEnd === true;
  const isActive = isPremium && !isCanceled;

  const handleCancel = async () => {
    // Warn users if they have more than 10 todos about what will happen
    const warningMessage = todoCount > 10
      ? `You currently have ${todoCount} todos. After canceling, you'll keep your existing todos but won't be able to create new ones until you delete enough to get below 10. Are you sure you want to cancel your subscription?`
      : "Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your billing period.";

    if (!window.confirm(warningMessage)) {
      return;
    }

    setIsLoading(true);
    const loadingToast = toast.loading("Canceling subscription...");

    try {
      const result = await cancelSubscription(false);
      if (result.error) {
        toast.error(result.error, { id: loadingToast });
      } else {
        toast.success(
          "Subscription canceled. You'll keep access until the end of your billing period.",
          {
            id: loadingToast,
          },
        );
        router.refresh();
      }
    } catch (error) {
      console.error("Error canceling subscription:", error);
      toast.error("An error occurred. Please try again.", {
        id: loadingToast,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading(true);
    const loadingToast = toast.loading("Opening subscription management...");

    try {
      const result = await createCustomerPortalSession();
      if (result.error) {
        toast.error(result.error, { id: loadingToast });
        setIsLoading(false);
      } else if (result.url) {
        toast.success("Opening in new tab...", { id: loadingToast });
        // Open in new tab instead of redirecting
        window.open(result.url, "_blank", "noopener,noreferrer");
        // Close the toast after a short delay
        setTimeout(() => {
          toast.dismiss(loadingToast);
        }, 1000);
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error creating portal session:", error);
      toast.error("An error occurred. Please try again.", {
        id: loadingToast,
      });
      setIsLoading(false);
    }
  };

  const handleUpgrade = async (paymentType: "monthly" | "one-time") => {
    setIsLoading(true);
    const loadingToast = toast.loading("Redirecting to checkout...");

    try {
      const result = await createCheckoutSession(paymentType);
      if (result.error) {
        toast.error(result.error, { id: loadingToast });
        setIsLoading(false);
        return;
      }

      if (result.url) {
        toast.success("Redirecting to checkout...", { id: loadingToast });
        window.location.href = result.url;
      } else {
        toast.error("Failed to create checkout session", { id: loadingToast });
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
      toast.error("An error occurred. Please try again.", {
        id: loadingToast,
      });
      setIsLoading(false);
    }
  };

  // Determine subscription status message
  const getStatusMessage = () => {
    if (!isPremium) {
      return "You're on the free plan. Upgrade to Premium for unlimited todos.";
    }

    if (isLifetime) {
      return "You have a lifetime Premium subscription. Enjoy unlimited todos forever!";
    }

    if (isCanceled) {
      return `Your subscription is canceled and will end on ${
        subscription.currentPeriodEnd
          ? new Date(subscription.currentPeriodEnd).toLocaleDateString()
          : "the end of your billing period"
      }. After that, you'll return to the free plan.`;
    }

    if (isActive && subscription.currentPeriodEnd) {
      return `Your subscription is active and will automatically renew on ${
        new Date(subscription.currentPeriodEnd).toLocaleDateString()
      }.`;
    }

    return "Your subscription is active.";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold text-foreground">Current Plan</h4>
          <p className="text-sm text-muted-foreground">
            {isPremium
              ? (isLifetime ? "Premium (Lifetime)" : "Premium")
              : "Free"}
          </p>
        </div>
        <div
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            isPremium
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          {isPremium ? (isLifetime ? "Lifetime" : "Premium") : "Free"}
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        {getStatusMessage()}
      </div>

      {isPremium && isRecurring && subscription.currentPeriodEnd && (
        <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
          {isCanceled
            ? `Access continues until: ${
              new Date(subscription.currentPeriodEnd).toLocaleDateString()
            }`
            : `Next renewal: ${
              new Date(subscription.currentPeriodEnd).toLocaleDateString()
            }`}
        </div>
      )}

      {!isPremium && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Upgrade to Premium for unlimited todos
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleUpgrade("monthly")}
              disabled={isLoading}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Subscribe
            </button>
            <button
              onClick={() => handleUpgrade("one-time")}
              disabled={isLoading}
              className="px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              One-time
            </button>
          </div>
        </div>
      )}

      {isPremium && (
        <div className="space-y-2">
          {isRecurring && (
            <>
              <button
                onClick={handleManageSubscription}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-border rounded-lg text-sm font-medium hover:bg-secondary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Manage Subscription
              </button>
              {todoCount > 10 && !isCanceled && (
                <p className="text-xs text-muted-foreground">
                  You have {todoCount}{" "}
                  todos. After canceling, you&apos;ll keep your existing todos
                  but won&apos;t be able to create new ones until you&apos;re
                  below 10.
                </p>
              )}
              {!isCanceled && (
                <button
                  onClick={handleCancel}
                  disabled={isLoading}
                  className="w-full px-4 py-2 border border-destructive text-destructive rounded-lg text-sm font-medium hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel Subscription
                </button>
              )}
            </>
          )}
          {isLifetime && (
            <p className="text-xs text-muted-foreground italic">
              Lifetime subscriptions cannot be canceled.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
