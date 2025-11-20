"use client";

import { useState } from "react";
import { createCheckoutSession } from "@/app/actions/stripe";
import toast from "react-hot-toast";

interface UpgradePromptProps {
  currentCount: number;
  maxCount: number;
}

export function UpgradePrompt({
  currentCount,
  maxCount,
}: UpgradePromptProps) {
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <div className="text-center space-y-4">
        <div>
          <h3 className="text-xl font-bold text-card-foreground mb-2">
            You&apos;ve reached your limit
          </h3>
          <p className="text-muted-foreground">
            You&apos;re using {currentCount} of {maxCount}{" "}
            todos on the free plan.
          </p>
        </div>

        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <h4 className="font-semibold text-primary mb-2">
            Upgrade to Premium
          </h4>
          <p className="text-sm text-muted-foreground mb-4">
            Get unlimited todos and unlock all features
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => handleUpgrade("monthly")}
              disabled={isLoading}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Loading..." : "Subscribe ($9.99/month)"}
            </button>
            <button
              onClick={() => handleUpgrade("one-time")}
              disabled={isLoading}
              className="px-6 py-3 border border-primary text-primary rounded-lg font-medium hover:bg-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Loading..." : "One-time ($99.99)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
