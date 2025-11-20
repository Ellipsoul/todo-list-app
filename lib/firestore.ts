import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import { Todo } from "@/types/todo";
import { getSubscriptionLimits, getUserSubscription } from "./subscriptions";

export async function checkTodoLimit(
  userId: string,
): Promise<
  {
    canCreate: boolean;
    currentCount: number;
    maxCount: number;
    error: string | null;
  }
> {
  try {
    const subscription = await getUserSubscription(userId);
    if (!subscription) {
      // Fallback to allowing creation if subscription check fails
      // This shouldn't happen as getUserSubscription always returns a subscription
      console.warn("Failed to get subscription, defaulting to FREE tier");
      const todos = await getTodos(userId);
      return {
        canCreate: todos.length < 10, // Default FREE limit
        currentCount: todos.length,
        maxCount: 10,
        error: null,
      };
    }
    const limits = getSubscriptionLimits(subscription.tier);
    const todos = await getTodos(userId);
    const currentCount = todos.length;
    const canCreate = currentCount < limits.maxTodos;

    return {
      canCreate,
      currentCount,
      maxCount: limits.maxTodos,
      error: canCreate
        ? null
        : `You've reached your limit of ${limits.maxTodos} todos. Please upgrade to create more.`,
    };
  } catch (error) {
    // On error, be lenient and allow creation (fail open)
    // This prevents blocking users if there's a transient error
    console.error("Error checking todo limit:", error);
    try {
      const todos = await getTodos(userId);
      return {
        canCreate: true, // Allow creation on error
        currentCount: todos.length,
        maxCount: Infinity, // Don't block on error
        error: null,
      };
    } catch (getTodosError) {
      // If we can't even get todos, default to allowing creation
      return {
        canCreate: true,
        currentCount: 0,
        maxCount: Infinity,
        error: null,
      };
    }
  }
}

export async function createTodo(
  userId: string,
  title: string,
  description: string,
): Promise<{ id: string; error: null } | { id: null; error: string }> {
  try {
    // Check subscription limit before creating
    const limitCheck = await checkTodoLimit(userId);
    if (!limitCheck.canCreate) {
      return {
        id: null,
        error: limitCheck.error || "Cannot create todo: limit reached",
      };
    }

    const todosRef = collection(db, `users/${userId}/todos`);
    const docRef = await addDoc(todosRef, {
      title,
      description,
      completed: false,
      createdAt: Timestamp.now(),
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return { id: null, error: errorMessage };
  }
}

export async function getTodos(userId: string): Promise<Todo[]> {
  try {
    const todosRef = collection(db, `users/${userId}/todos`);
    const q = query(todosRef, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt,
    })) as Todo[];
  } catch (error) {
    console.error("Error getting todos:", error);
    return [];
  }
}

export function subscribeToTodos(
  userId: string,
  callback: (todos: Todo[]) => void,
): () => void {
  const todosRef = collection(db, `users/${userId}/todos`);
  const q = query(todosRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (querySnapshot) => {
      const todos = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt,
      })) as Todo[];
      callback(todos);
    },
    (error) => {
      console.error("Error subscribing to todos:", error);
      callback([]);
    },
  );
}

export async function updateTodo(
  userId: string,
  todoId: string,
  updates: Partial<Pick<Todo, "title" | "description" | "completed">>,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const todoRef = doc(db, `users/${userId}/todos`, todoId);
    await updateDoc(todoRef, updates);
    return { success: true, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

export async function deleteTodo(
  userId: string,
  todoId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const todoRef = doc(db, `users/${userId}/todos`, todoId);
    await deleteDoc(todoRef);
    return { success: true, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return { success: false, error: errorMessage };
  }
}

export async function deleteAllTodos(
  userId: string,
): Promise<{ success: boolean; error: string | null }> {
  try {
    const todosRef = collection(db, `users/${userId}/todos`);
    const querySnapshot = await getDocs(todosRef);

    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    return { success: true, error: null };
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Unknown error";
    return { success: false, error: errorMessage };
  }
}
