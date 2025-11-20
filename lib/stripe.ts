import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-02-24.acacia",
  typescript: true,
});

export async function getOrCreateStripeCustomer(
  userId: string,
  email: string,
): Promise<string> {
  // First, check if we already have a customer ID for this user
  const { getUserSubscription } = await import("./subscriptions");
  const subscription = await getUserSubscription(userId);

  if (subscription?.stripeCustomerId) {
    // Verify the customer still exists in Stripe
    try {
      await stripe.customers.retrieve(subscription.stripeCustomerId);
      return subscription.stripeCustomerId;
    } catch (error) {
      // Customer doesn't exist, create a new one
      console.log("Stripe customer not found, creating new one", error);
    }
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      userId,
    },
  });

  // Update Firestore with the new customer ID
  const { updateUserSubscription } = await import("./subscriptions");
  await updateUserSubscription(userId, {
    stripeCustomerId: customer.id,
  });

  return customer.id;
}
