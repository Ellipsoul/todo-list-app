"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Todo } from "@/types/todo";
import { subscribeToTodos, createTodo } from "@/lib/firestore";
import { TodoItem } from "./TodoItem";
import { TodoForm } from "./TodoForm";

export function TodoList() {
  const { data: session } = useSession();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session?.user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToTodos(session.user.id, (newTodos) => {
      setTodos(newTodos);
      setLoading(false);
      setError("");
    });

    return () => unsubscribe();
  }, [session?.user?.id]);

  const handleAddTodo = async (data: { title: string; description: string }) => {
    if (!session?.user?.id) return;

    setError("");
    const result = await createTodo(session.user.id, data.title, data.description);
    if (result.error) {
      setError(result.error);
    } else {
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
        <TodoForm onSubmit={handleAddTodo} />
        {error && (
          <div className="mt-4 bg-destructive/10 border border-destructive text-destructive-foreground px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>

      <div>
        <h2 className="text-2xl font-bold text-card-foreground mb-4">
          Your Todos ({todos.length})
        </h2>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : todos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No todos yet. Create your first todo above!
          </div>
        ) : (
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

