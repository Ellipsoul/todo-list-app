"use client";

import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import Image from "next/image";
import Link from "next/link";
import { FirebaseAuthRestore } from "@/components/FirebaseAuthRestore";
import { auth } from "@/lib/firebase-auth";
import { deleteUser } from "firebase/auth";
import { deleteAllTodos, getTodos } from "@/lib/firestore";
import { getUserSubscription } from "@/lib/subscriptions";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";
import { SubscriptionClient } from "@/types/subscription";
import {
  getSubscriptionStatus,
  verifyCheckoutSession,
} from "@/app/actions/stripe";

import { DeleteAccountModal } from "@/components/DeleteAccountModal";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [noteCount, setNoteCount] = useState<number | null>(null);
  const [joinDate, setJoinedDate] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [subscription, setSubscription] = useState<SubscriptionClient | null>(
    null,
  );
  const [hasCheckedPayment, setHasCheckedPayment] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  // Check for payment result in URL params
  useEffect(() => {
    const checkPaymentResult = async () => {
      if (hasCheckedPayment || !session?.user?.id) return;

      const sessionId = searchParams.get("session_id");
      const canceled = searchParams.get("canceled");

      // Remove query params from URL
      if (sessionId || canceled) {
        router.replace("/settings", { scroll: false });
        setHasCheckedPayment(true);
      }

      if (canceled === "true") {
        toast.error("Payment was canceled", {
          duration: Infinity,
          id: "payment-canceled",
        });
        return;
      }

      if (sessionId) {
        try {
          // Verify the checkout session
          const verifyResult = await verifyCheckoutSession(sessionId);

          if (verifyResult.success) {
            // Check subscription status
            const subscriptionResult = await getSubscriptionStatus();

            if (subscriptionResult.subscription?.tier === "PREMIUM") {
              toast.success(
                "Payment successful! Your Premium subscription is now active. Enjoy unlimited todos!",
                {
                  duration: Infinity,
                  id: "payment-verification",
                },
              );
              // Refresh subscription data
              const userSubscription = await getUserSubscription(
                session.user.id,
              );
              if (userSubscription) {
                setSubscription({
                  ...userSubscription,
                  createdAt: userSubscription.createdAt.toMillis(),
                  updatedAt: userSubscription.updatedAt.toMillis(),
                  currentPeriodEnd:
                    userSubscription.currentPeriodEnd?.toMillis() ??
                      null,
                });
              }
            } else {
              // Payment succeeded but subscription not updated yet
              toast.success(
                "Payment successful! Your subscription is being activated and should be ready shortly.",
                {
                  duration: Infinity,
                  id: "payment-verification",
                },
              );
              // Retry after a delay
              setTimeout(async () => {
                const retryResult = await getSubscriptionStatus();
                if (retryResult.subscription?.tier === "PREMIUM") {
                  toast.success(
                    "Your Premium subscription is now active!",
                    {
                      duration: Infinity,
                      id: "payment-verification",
                    },
                  );
                  const userSubscription = await getUserSubscription(
                    session.user.id,
                  );
                  if (userSubscription) {
                    setSubscription({
                      ...userSubscription,
                      createdAt: userSubscription.createdAt.toMillis(),
                      updatedAt: userSubscription.updatedAt.toMillis(),
                      currentPeriodEnd:
                        userSubscription.currentPeriodEnd?.toMillis() ??
                          null,
                    });
                  }
                }
              }, 2000);
            }
          } else {
            toast.error(
              verifyResult.error ||
                "Payment verification failed. Please contact support if you were charged.",
              {
                duration: Infinity,
                id: "payment-verification",
              },
            );
          }
        } catch (error) {
          console.error("Error verifying payment:", error);
          toast.error(
            "An error occurred while verifying your payment. Please contact support if you were charged.",
            {
              duration: Infinity,
              id: "payment-verification",
            },
          );
        }
      }
    };

    checkPaymentResult();
  }, [session, searchParams, router, hasCheckedPayment]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (session?.user?.id) {
        // Fetch note count
        const todos = await getTodos(session.user.id);
        setNoteCount(todos.length);

        // Fetch subscription and convert to client-safe format
        const userSubscription = await getUserSubscription(session.user.id);
        if (userSubscription) {
          setSubscription({
            ...userSubscription,
            createdAt: userSubscription.createdAt.toMillis(),
            updatedAt: userSubscription.updatedAt.toMillis(),
            currentPeriodEnd: userSubscription.currentPeriodEnd?.toMillis() ??
              null,
          });
        }
      }
    };

    fetchUserData();

    // Get join date from Firebase Auth
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        const creationTime = user.metadata.creationTime;
        if (creationTime) {
          setJoinedDate(creationTime);
        }
      }
    });

    return () => unsubscribe();
  }, [session]);

  const handleDeleteAllNotes = async () => {
    if (!session?.user?.id) return;

    if (
      !window.confirm(
        "Are you sure you want to delete ALL your notes? This action cannot be undone.",
      )
    ) {
      return;
    }

    setIsLoading(true);
    try {
      const result = await deleteAllTodos(session.user.id);
      if (result.success) {
        toast.success("All notes deleted successfully");
        setNoteCount(0);
      } else {
        toast.error(`Failed to delete notes: ${result.error}`);
      }
    } catch (error) {
      toast.error("An error occurred while deleting notes");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!session?.user?.id || !auth.currentUser) return;

    setIsLoading(true);
    const loadingToast = toast.loading("Deleting account...");

    try {
      // 1. Delete all todos
      await deleteAllTodos(session.user.id);

      // 2. Delete Firebase Auth user
      await deleteUser(auth.currentUser);

      // 3. Sign out from NextAuth
      await signOut({ redirect: false });

      toast.success("Account deleted successfully", { id: loadingToast });
      router.push("/login");
    } catch (error) {
      console.error("Error deleting account:", error);
      // If requires recent login
      if (
        error instanceof Error &&
        error.message.includes("requires-recent-login")
      ) {
        toast.error("Please log out and log back in to delete your account.", {
          id: loadingToast,
        });
      } else {
        toast.error("Failed to delete account. Please try again.", {
          id: loadingToast,
        });
      }
    } finally {
      setIsLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <FirebaseAuthRestore />
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <Image
                src="/todo-logo.png"
                alt="Todo Logo"
                width={40}
                height={40}
                className="rounded-full"
              />
              <h1 className="text-2xl font-bold text-card-foreground">
                Todo List
              </h1>
            </Link>
          </div>
          <Link
            href="/"
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-6">
              Settings
            </h2>

            {/* User Profile Section */}
            <section className="bg-card border border-border rounded-xl p-6 shadow-sm mb-6">
              <h3 className="text-xl font-semibold text-card-foreground mb-4">
                User Profile
              </h3>
              <div className="space-y-4">
                <div className="flex flex-col space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">User ID</p>
                    <p className="font-mono text-sm bg-muted p-2 rounded overflow-x-auto">
                      {session?.user?.id}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="text-foreground">{session?.user?.email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Joined Date</p>
                    <p className="text-foreground">
                      {joinDate
                        ? new Date(joinDate).toLocaleDateString()
                        : "Loading..."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Statistics Section */}
            <section className="bg-card border border-border rounded-xl p-6 shadow-sm mb-6">
              <h3 className="text-xl font-semibold text-card-foreground mb-4">
                Statistics
              </h3>
              <div className="flex items-center gap-4">
                <div className="bg-primary/10 p-4 rounded-lg">
                  <p className="text-3xl font-bold text-primary">
                    {noteCount !== null ? noteCount : "-"}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Notes</p>
                </div>
              </div>
            </section>

            {/* Subscription Section */}
            {subscription && (
              <section className="bg-card border border-border rounded-xl p-6 shadow-sm mb-6">
                <h3 className="text-xl font-semibold text-card-foreground mb-4">
                  Subscription
                </h3>
                <SubscriptionStatus
                  subscription={subscription}
                  todoCount={noteCount || 0}
                />
              </section>
            )}

            {/* Danger Zone */}
            <section className="bg-destructive/5 border border-destructive/20 rounded-xl p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-destructive mb-4">
                Danger Zone
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium text-foreground">
                      Delete All Notes
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently remove all your notes
                    </p>
                  </div>
                  <button
                    onClick={handleDeleteAllNotes}
                    disabled={isLoading || noteCount === 0}
                    className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Delete All
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-background border border-border rounded-lg">
                  <div>
                    <h4 className="font-medium text-foreground">
                      Delete Account
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete your account and all data
                    </p>
                  </div>
                  <button
                    onClick={() => setIsDeleteModalOpen(true)}
                    disabled={isLoading}
                    className="px-4 py-2 border border-destructive text-destructive rounded-md hover:bg-destructive hover:text-destructive-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      <DeleteAccountModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteAccount}
        isLoading={isLoading}
      />
    </div>
  );
}
