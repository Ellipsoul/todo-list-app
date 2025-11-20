"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { Todo } from "@/types/todo";
import { checkTodoLimit, createTodo, subscribeToTodos } from "@/lib/firestore";
import { TodoItem } from "./TodoItem";
import { TodoForm } from "./TodoForm";
import { UpgradePrompt } from "./UpgradePrompt";

export function TodoList() {
  const { data: session } = useSession();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [canCreateTodo, setCanCreateTodo] = useState<boolean | null>(null);
  const [checkingLimit, setCheckingLimit] = useState(true);
  const [limitInfo, setLimitInfo] = useState<
    {
      currentCount: number;
      maxCount: number;
    } | null
  >(null);

  const checkLimit = useCallback(async (todoCount?: number) => {
    if (!session?.user?.id) return;

    setCheckingLimit(true);
    try {
      const limitCheck = await checkTodoLimit(session.user.id);
      setCanCreateTodo(limitCheck.canCreate);
      setLimitInfo({
        currentCount: todoCount ?? limitCheck.currentCount,
        maxCount: limitCheck.maxCount,
      });
    } catch (error) {
      console.error("Error checking limit:", error);
      // Default to allowing creation on error
      setCanCreateTodo(true);
    } finally {
      setCheckingLimit(false);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      return;
    }

    const unsubscribe = subscribeToTodos(session.user.id, (newTodos) => {
      setTodos(newTodos);
      setLoading(false);
      setError("");
      // Check limit after todos are loaded
      checkLimit(newTodos.length);
    });

    return () => unsubscribe();
  }, [session?.user?.id, checkLimit]);

  const handleAddTodo = async (
    data: { title: string; description: string },
  ) => {
    if (!session?.user?.id) return;

    setError("");
    const loadingToast = toast.loading("Creating todo...");
    const result = await createTodo(
      session.user.id,
      data.title,
      data.description,
    );
    if (result.error) {
      toast.error(result.error || "Failed to create todo", {
        id: loadingToast,
      });
      setError(result.error);
    } else {
      toast.success("Todo created successfully!", { id: loadingToast });
      // Error will be cleared by the real-time listener when the todo is added
      setError("");
    }
  };

  if (!session?.user?.id) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-2xl font-bold text-card-foreground mb-4">
          Add New Todo
        </h2>
        {checkingLimit
          ? (
            <div className="space-y-4 animate-pulse">
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/4"></div>
                <div className="h-10 bg-muted rounded"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-24 bg-muted rounded"></div>
              </div>
              <div className="h-10 bg-muted rounded w-32"></div>
            </div>
          )
          : canCreateTodo
          ? (
            <>
              <TodoForm onSubmit={handleAddTodo} />
              {error && (
                <div className="mt-4 bg-destructive/10 border border-destructive text-destructive-foreground px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </>
          )
          : limitInfo
          ? (
            <UpgradePrompt
              currentCount={limitInfo.currentCount}
              maxCount={limitInfo.maxCount}
            />
          )
          : null}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-card-foreground mb-4">
          Your Todos ({todos.length})
        </h2>
        {loading
          ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading...
            </div>
          )
          : todos.length === 0
          ? (
            <div className="text-center py-8 text-muted-foreground">
              No todos yet. Create your first todo above!
            </div>
          )
          : (
            <div className="space-y-3">
              {todos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  todo={todo}
                  userId={session.user.id}
                  onUpdate={() => {}}
                />
              ))}
            </div>
          )}
      </div>
    </div>
  );
}
