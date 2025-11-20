import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import {
  getUserByStripeCustomerIdServer,
  getUserSubscriptionServer,
  updateUserSubscriptionServer,
} from "@/lib/subscriptions-server";
import { Subscription, SubscriptionTier } from "@/types/subscription";
import admin from "firebase-admin";

// Map Stripe subscription status to our Subscription status type
function mapStripeStatusToSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status,
): Subscription["status"] {
  const statusMap: Record<Stripe.Subscription.Status, Subscription["status"]> =
    {
      active: "active",
      canceled: "canceled",
      past_due: "past_due",
      trialing: "trialing",
      unpaid: "unpaid",
      incomplete: "active", // Default to active for incomplete
      incomplete_expired: "canceled", // Default to canceled for expired
      paused: "active", // Default to active for paused
    };
  return statusMap[stripeStatus] || "active";
}

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

// In emulator/test mode, webhook secret might not be set
// The app will use fallback mechanisms for subscription updates
if (
  !webhookSecret && process.env.NODE_ENV !== "test" &&
  !process.env.USE_FIREBASE_EMULATOR
) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

// Disable body parsing for this route - we need raw body for signature verification
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    // Get raw body as text for signature verification
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("stripe-signature");

    console.log("📥 Webhook received:", {
      hasBody: !!body,
      bodyLength: body?.length,
      hasSignature: !!signature,
      signaturePrefix: signature?.substring(0, 20),
    });

    let event: Stripe.Event;

    // Handle webhook signature verification
    if (webhookSecret) {
      // Normal mode: verify signature
      if (!signature) {
        console.error("❌ No signature provided in webhook");
        return NextResponse.json(
          { error: "No signature provided" },
          { status: 400 },
        );
      }

      try {
        // Verify webhook signature with raw body
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
        console.log("✅ Webhook signature verified successfully");
      } catch (err) {
        console.error("❌ Webhook signature verification failed:", {
          error: err instanceof Error ? err.message : String(err),
          bodyLength: body?.length,
          signatureLength: signature?.length,
          webhookSecretLength: webhookSecret?.length,
          webhookSecretPrefix: webhookSecret?.substring(0, 10),
        });

        // For debugging: try to parse the event anyway to see what we got
        try {
          const parsedEvent = JSON.parse(body);
          console.log("⚠️ Event data (unverified):", {
            type: parsedEvent.type,
            id: parsedEvent.id,
          });
        } catch (parseErr) {
          console.error("Could not parse event body:", parseErr);
        }

        return NextResponse.json(
          {
            error: "Webhook signature verification failed",
            hint:
              "Check that STRIPE_WEBHOOK_SECRET matches the secret from 'stripe listen'",
          },
          { status: 400 },
        );
      }
    } else {
      // Test/emulator mode: skip signature verification
      if (
        process.env.USE_FIREBASE_EMULATOR || process.env.NODE_ENV === "test"
      ) {
        console.warn(
          "⚠️ Webhook secret not configured, skipping signature verification (test mode)",
        );
        try {
          event = JSON.parse(body) as Stripe.Event;
          console.log(
            "⚠️ Processing webhook without signature verification (test mode)",
          );
        } catch (parseErr) {
          console.error("Could not parse webhook body:", parseErr);
          return NextResponse.json(
            { error: "Invalid webhook body" },
            { status: 400 },
          );
        }
      } else {
        console.error("❌ Webhook secret not configured");
        return NextResponse.json(
          { error: "Webhook secret not configured" },
          { status: 500 },
        );
      }
    }

    try {
      console.log("📥 Received webhook event:", event.type, {
        id: event.id,
        created: new Date(event.created * 1000).toISOString(),
      });

      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const customerId = session.customer as string;

          console.log("Processing checkout.session.completed:", {
            sessionId: session.id,
            userId,
            customerId,
            paymentStatus: session.payment_status,
            mode: session.mode,
          });

          if (!customerId) {
            console.error("No customer ID in checkout session:", session.id);
            break;
          }

          let userIdToUpdate: string | undefined = userId;

          // If no userId in metadata, try to find user by customer ID
          if (!userIdToUpdate) {
            userIdToUpdate =
              await getUserByStripeCustomerIdServer(customerId) ||
              undefined;
            if (!userIdToUpdate) {
              console.error("Could not find user for customer:", customerId);
              // Still create the customer mapping for future reference using Admin SDK
              try {
                const db = admin.firestore();
                const customerMappingRef = db.doc(
                  `stripeCustomers/${customerId}`,
                );
                await customerMappingRef.set(
                  { userId: null, sessionId: session.id },
                  { merge: true },
                );
              } catch (error) {
                console.error("Error creating customer mapping:", error);
              }
              break;
            }
          }

          // Determine payment type from session mode
          const paymentType = session.mode === "subscription"
            ? "recurring"
            : "one-time";

          // Update subscription to premium using server-side function
          const updateResult = await updateUserSubscriptionServer(
            userIdToUpdate,
            {
              tier: SubscriptionTier.PREMIUM,
              stripeCustomerId: customerId,
              paymentType,
              status: "active",
              cancelAtPeriodEnd: false,
            },
          );

          if (!updateResult.success) {
            console.error("Failed to update subscription:", updateResult.error);
            throw new Error(
              `Failed to update subscription: ${updateResult.error}`,
            );
          }

          console.log(
            "Subscription updated to PREMIUM for user:",
            userIdToUpdate,
          );

          // Handle subscription creation for recurring payments
          if (session.mode === "subscription" && session.subscription) {
            try {
              const subscription = await stripe.subscriptions.retrieve(
                session.subscription as string,
              );
              const subUpdateResult = await updateUserSubscriptionServer(
                userIdToUpdate,
                {
                  stripeSubscriptionId: subscription.id,
                  status: mapStripeStatusToSubscriptionStatus(
                    subscription.status,
                  ),
                  currentPeriodEnd: subscription.current_period_end
                    ? admin.firestore.Timestamp.fromMillis(
                      subscription.current_period_end * 1000,
                    )
                    : null,
                },
              );

              if (!subUpdateResult.success) {
                console.error(
                  "Failed to update subscription details:",
                  subUpdateResult.error,
                );
              } else {
                console.log(
                  "Subscription details updated for user:",
                  userIdToUpdate,
                );
              }
            } catch (error) {
              console.error("Error retrieving subscription details:", error);
              // Non-fatal - tier is already updated to PREMIUM
            }
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          console.log("🔄 Processing customer.subscription.updated:", {
            subscriptionId: subscription.id,
            customerId,
            status: subscription.status,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            currentPeriodEnd: subscription.current_period_end
              ? new Date(subscription.current_period_end * 1000).toISOString()
              : null,
          });

          const userId = await getUserByStripeCustomerIdServer(customerId);

          if (!userId) {
            console.error("❌ Could not find user for customer:", customerId);
            break;
          }

          // Get current subscription state to detect changes
          const currentSubscription = await getUserSubscriptionServer(userId);
          const wasCanceled = currentSubscription?.cancelAtPeriodEnd === true;
          const isNowReactivated = wasCanceled &&
            subscription.cancel_at_period_end === false;
          const isNowCanceled = !wasCanceled &&
            subscription.cancel_at_period_end === true;

          console.log("📊 Subscription state comparison:", {
            subscriptionId: subscription.id,
            userId,
            currentState: {
              tier: currentSubscription?.tier,
              cancelAtPeriodEnd: currentSubscription?.cancelAtPeriodEnd,
              status: currentSubscription?.status,
            },
            newState: {
              status: subscription.status,
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
            wasCanceled,
            isNowReactivated,
            isNowCanceled,
          });

          // Determine if subscription should be PREMIUM
          // - If status is active and not immediately canceled, keep/upgrade to PREMIUM
          // - If cancel_at_period_end is true, keep PREMIUM (user still has access until period ends)
          // - If immediately canceled (status canceled and cancel_at_period_end false), downgrade to FREE
          const isActive = subscription.status === "active" ||
            subscription.status === "trialing";
          const isImmediatelyCanceled = subscription.status === "canceled" &&
            subscription.cancel_at_period_end === false;
          const shouldBePremium = isActive && !isImmediatelyCanceled;

          console.log("💾 Updating subscription in Firestore:", {
            userId,
            shouldBePremium,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            tier: shouldBePremium
              ? SubscriptionTier.PREMIUM
              : SubscriptionTier.FREE,
          });

          const updateResult = await updateUserSubscriptionServer(userId, {
            stripeSubscriptionId: subscription.id,
            paymentType: "recurring", // Always recurring for subscription objects
            status: mapStripeStatusToSubscriptionStatus(subscription.status),
            currentPeriodEnd: subscription.current_period_end
              ? admin.firestore.Timestamp.fromMillis(
                subscription.current_period_end * 1000,
              )
              : null,
            cancelAtPeriodEnd: subscription.cancel_at_period_end,
            // Set tier based on subscription state
            tier: shouldBePremium
              ? SubscriptionTier.PREMIUM
              : SubscriptionTier.FREE,
          });

          if (!updateResult.success) {
            console.error(
              "❌ Failed to update subscription:",
              updateResult.error,
            );
            throw new Error(
              `Failed to update subscription: ${updateResult.error}`,
            );
          }

          // Log specific actions
          if (isNowReactivated) {
            console.log(
              "✅ Subscription REACTIVATED for user:",
              userId,
              "- User canceled but then reactivated from Stripe portal",
            );
          } else if (isNowCanceled) {
            console.log(
              "⚠️ Subscription CANCELED (at period end) for user:",
              userId,
              "- Will remain PREMIUM until period ends on",
              subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000)
                  .toLocaleDateString()
                : "period end",
            );
          } else if (isImmediatelyCanceled) {
            console.log(
              "❌ Subscription immediately canceled, downgraded to FREE for user:",
              userId,
            );
          } else if (shouldBePremium) {
            console.log(
              "✅ Subscription is active and set to PREMIUM for user:",
              userId,
            );
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          const userId = await getUserByStripeCustomerIdServer(customerId);

          if (!userId) {
            console.error("Could not find user for customer:", customerId);
            break;
          }

          // Always downgrade to FREE tier when subscription is deleted
          // Users can have more than 10 todos but won't be able to create new ones
          // until they delete enough to get below 10
          await updateUserSubscriptionServer(userId, {
            tier: SubscriptionTier.FREE,
            status: "canceled",
            currentPeriodEnd: null,
            cancelAtPeriodEnd: false,
          });
          console.log("Subscription downgraded to FREE for user:", userId);
          break;
        }

        case "payment_intent.succeeded": {
          // Handle one-time payments
          const paymentIntent = event.data.object as Stripe.PaymentIntent;
          const customerId = paymentIntent.customer as string;

          console.log("Processing payment_intent.succeeded:", {
            paymentIntentId: paymentIntent.id,
            customerId,
          });

          if (customerId) {
            const userId = await getUserByStripeCustomerIdServer(customerId);
            if (userId) {
              const updateResult = await updateUserSubscriptionServer(userId, {
                tier: SubscriptionTier.PREMIUM,
                stripeCustomerId: customerId,
                paymentType: "one-time", // One-time payment for lifetime subscription
                status: "active",
                cancelAtPeriodEnd: false,
              });

              if (!updateResult.success) {
                console.error(
                  "Failed to update subscription from payment_intent:",
                  updateResult.error,
                );
              } else {
                console.log(
                  "Subscription updated to PREMIUM from payment_intent for user:",
                  userId,
                );
              }
            } else {
              console.error(
                "Could not find user for customer in payment_intent:",
                customerId,
              );
            }
          } else {
            console.error(
              "No customer ID in payment_intent:",
              paymentIntent.id,
            );
          }
          break;
        }

        default:
          console.log(`⚠️ Unhandled event type: ${event.type}`);
      }

      console.log("✅ Webhook processed successfully:", event.type);
      return NextResponse.json({ received: true });
    } catch (error) {
      console.error("❌ Error processing webhook:", error);
      if (error instanceof Error) {
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
        });
      }
      return NextResponse.json(
        {
          error: "Webhook processing failed",
          details: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500 },
      );
    }
  } catch (error) {
    // Catch any errors from signature verification or initial setup
    console.error("❌ Error in webhook handler:", error);
    return NextResponse.json(
      {
        error: "Webhook handler error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
