"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { signOut } from "next-auth/react";
import toast from "react-hot-toast";
import Image from "next/image";
import { TodoList } from "@/components/TodoList";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FirebaseAuthRestore } from "@/components/FirebaseAuthRestore";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

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

  const handleSignOut = async () => {
    const loadingToast = toast.loading("Signing you out...");
    try {
      await signOut({ redirect: false });
      toast.success("Signed out successfully!", { id: loadingToast });
      router.push("/login");
      router.refresh();
    } catch (error) {
      toast.error("Failed to sign out. Please try again.", {
        id: loadingToast,
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <FirebaseAuthRestore />
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/todo-logo.png"
              alt="Todo Logo"
              width={40}
              height={40}
              className="rounded-full"
            />
            <h1 className="text-2xl font-bold text-card-foreground">Todo List</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {session?.user?.email}
            </div>
            <ThemeToggle />
            <button
              onClick={handleSignOut}
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/80 transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <TodoList />
      </main>
    </div>
  );
}
