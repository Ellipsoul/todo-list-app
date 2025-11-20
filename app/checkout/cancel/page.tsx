"use client";

import Link from "next/link";
import Image from "next/image";

export default function CheckoutCancelPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
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
        </div>
      </header>

      <main className="container mx-auto px-4 py-16 max-w-2xl">
        <div className="bg-card border border-border rounded-xl p-8 text-center space-y-6">
          <div className="text-6xl mb-4">❌</div>
          <h1 className="text-3xl font-bold text-card-foreground">
            Payment Canceled
          </h1>
          <p className="text-muted-foreground">
            Your checkout was canceled. No charges were made. You can try again
            anytime.
          </p>
          <div className="pt-4 flex gap-4 justify-center">
            <Link
              href="/"
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary-hover transition-colors"
            >
              Go to Dashboard
            </Link>
            <Link
              href="/settings"
              className="px-6 py-3 border border-border rounded-lg font-medium hover:bg-secondary-hover transition-colors"
            >
              View Settings
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

