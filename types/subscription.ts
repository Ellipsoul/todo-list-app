import { Timestamp } from "firebase/firestore";

export enum SubscriptionTier {
  FREE = "FREE",
  PREMIUM = "PREMIUM",
}

export interface SubscriptionLimits {
  maxTodos: number;
}

// Payment type to distinguish one-time vs recurring
export type PaymentType = "one-time" | "recurring";

// Server-side Subscription type (with Firestore Timestamps)
export interface Subscription {
  tier: SubscriptionTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paymentType?: PaymentType; // "one-time" for lifetime, "recurring" for subscriptions
  status?: "active" | "canceled" | "past_due" | "trialing" | "unpaid";
  currentPeriodEnd?: Timestamp | null;
  cancelAtPeriodEnd?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Client-safe Subscription type (with plain Date/numbers)
export interface SubscriptionClient {
  tier: SubscriptionTier;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  paymentType?: PaymentType; // "one-time" for lifetime, "recurring" for subscriptions
  status?: "active" | "canceled" | "past_due" | "trialing" | "unpaid";
  currentPeriodEnd?: number | null; // milliseconds since epoch
  cancelAtPeriodEnd?: boolean;
  createdAt: number; // milliseconds since epoch
  updatedAt: number; // milliseconds since epoch
}

