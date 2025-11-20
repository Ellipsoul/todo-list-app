# Cursor 2.0 Todo Playground

Welcome! This lightweight todo manager is a showcase project demonstrating how
quickly a polished experience can come together with Cursor 2.0 at the wheel. It
was designed, built, and refined in just a few hours as a warmup challenge to
explore the platform's collaborative coding power.

## What You Can Do

- Sign in securely with email or Google and keep your list private to you
- Capture new tasks in seconds, then edit, complete, or remove them as life
  changes
- Flip between light and dark modes to match your workspace vibe
- Enjoy instant syncing across devices thanks to real-time cloud storage

## Why It Exists

This app isn't meant to be a production monster; it's a focused experiment. The
goal was to validate how quickly Cursor 2.0 can help craft a full-stack
experience with authentication, persistence, and a polished UI. The result is a
friendly todo tool that proves the point: rapid iteration can still feel
intentional and delightful.

## Technology Highlights

- Next.js App Router powers the modern React experience
- Auth.js (NextAuth) manages sessions and adapters for credential and Google
  login
- Firebase Authentication keeps sign-in simple and secure
- Cloud Firestore stores todos per user and streams real-time updates
- Tailwind CSS and next-themes provide responsive styling with instant theme
  switching
- TypeScript threads everything together with strong typing and predictable data
  flow
- Cypress ensures core flows stay reliable through end-to-end and component
  tests

## Want to Explore Locally?

Developers who want to poke around can clone the repo, install dependencies with
`npm install`, and launch the dev server via `npm run dev`. The app will greet
you at `http://localhost:3000` with the same experience showcased here.

### Testing Stripe Payments Locally

When testing payment flows locally, you need to forward Stripe webhooks to your
local development server. The app includes a fallback mechanism that updates
subscriptions directly from the checkout session, but webhooks are the preferred
method.

**Option 1: Use Stripe CLI (Recommended)**

1. Install the [Stripe CLI](https://stripe.com/docs/stripe-cli)
2. Login to Stripe: `stripe login`
3. Forward webhooks to your local server:
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
4. Copy the webhook signing secret that's displayed (starts with `whsec_`)
5. Add it to your `.env.local` file:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```
6. Restart your Next.js dev server

**Option 2: Fallback Mechanism**

If you don't set up webhook forwarding, the checkout success page will
automatically update your subscription as a fallback. However, this is less
reliable than webhooks and may have edge cases. For production, always use
webhooks.

**Note:** The webhook endpoint requires `STRIPE_WEBHOOK_SECRET` to be set. If
it's not set, the app will throw an error on startup.

Thanks for dropping by! Whether you're scouting ideas or just checking out
Cursor 2.0's capabilities, this warmup project is ready to inspire your next
build.
