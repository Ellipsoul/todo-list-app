"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    // Redirect to settings page with session_id
    // The settings page will handle showing the toast notification
    if (sessionId) {
      router.replace(`/settings?session_id=${sessionId}`);
    } else {
      router.replace("/settings");
    }
  }, [sessionId, router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="text-muted-foreground mb-4">
          Redirecting to settings...
        </div>
      </div>
    </div>
  );
}
