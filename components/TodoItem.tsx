"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { Todo } from "@/types/todo";
import { updateTodo, deleteTodo } from "@/lib/firestore";
import { TodoForm } from "./TodoForm";

interface TodoItemProps {
  todo: Todo;
  userId: string;
  onUpdate: () => void;
}

export function TodoItem({ todo, userId, onUpdate }: TodoItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleToggleComplete = async () => {
    setError("");
    const loadingToast = toast.loading(
      todo.completed ? "Marking as incomplete..." : "Marking as complete..."
    );
    const result = await updateTodo(userId, todo.id, {
      completed: !todo.completed,
    });
    if (result.success) {
      toast.success(
        todo.completed
          ? "Todo marked as incomplete"
          : "Todo marked as complete!",
        { id: loadingToast }
      );
      onUpdate();
    } else {
      toast.error(result.error || "Failed to update todo", {
        id: loadingToast,
      });
      setError(result.error || "Failed to update todo");
    }
  };

  const handleEdit = async (data: { title: string; description: string }) => {
    setError("");
    const loadingToast = toast.loading("Updating todo...");
    const result = await updateTodo(userId, todo.id, {
      title: data.title,
      description: data.description,
    });
    if (result.success) {
      toast.success("Todo updated successfully!", { id: loadingToast });
      setIsEditing(false);
      onUpdate();
    } else {
      toast.error(result.error || "Failed to update todo", {
        id: loadingToast,
      });
      setError(result.error || "Failed to update todo");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this todo?")) {
      return;
    }
    setError("");
    setIsDeleting(true);
    const loadingToast = toast.loading("Deleting todo...");
    const result = await deleteTodo(userId, todo.id);
    if (result.success) {
      toast.success("Todo deleted successfully!", { id: loadingToast });
      onUpdate();
    } else {
      setIsDeleting(false);
      toast.error(result.error || "Failed to delete todo", {
        id: loadingToast,
      });
      setError(result.error || "Failed to delete todo");
    }
  };

  if (isEditing) {
    return (
      <div className="bg-card border border-border rounded-lg p-4">
        <TodoForm
          onSubmit={handleEdit}
          onCancel={() => {
            setIsEditing(false);
            setError("");
          }}
          initialData={{ title: todo.title, description: todo.description }}
          submitLabel="Save"
        />
        {error && (
          <div className="mt-4 bg-destructive/10 border border-destructive text-destructive-foreground px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`bg-card border border-border rounded-lg p-4 transition-all ${
        todo.completed ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={todo.completed}
          onChange={handleToggleComplete}
          className="mt-1 w-5 h-5 rounded border-input text-primary focus:ring-ring cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <h3
            className={`font-medium text-card-foreground ${
              todo.completed ? "line-through text-muted-foreground" : ""
            }`}
          >
            {todo.title}
          </h3>
          {todo.description && (
            <p
              className={`mt-1 text-sm text-muted-foreground ${
                todo.completed ? "line-through" : ""
              }`}
            >
              {todo.description}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            {todo.createdAt.toDate().toLocaleDateString()}
          </p>
          {error && (
            <div className="mt-2 bg-destructive/10 border border-destructive text-destructive-foreground px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}
            className="px-3 py-1 text-sm bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors disabled:opacity-50"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-3 py-1 text-sm bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

