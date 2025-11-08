import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  Timestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";
import { Todo } from "@/types/todo";

export async function createTodo(
  userId: string,
  title: string,
  description: string
): Promise<{ id: string; error: null } | { id: null; error: string }> {
  try {
    const todosRef = collection(db, `users/${userId}/todos`);
    const docRef = await addDoc(todosRef, {
      title,
      description,
      completed: false,
      createdAt: Timestamp.now(),
    });
    return { id: docRef.id, error: null };
  } catch (error: any) {
    return { id: null, error: error.message };
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
  } catch (error: any) {
    console.error("Error getting todos:", error);
    return [];
  }
}

export function subscribeToTodos(
  userId: string,
  callback: (todos: Todo[]) => void
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
    }
  );
}

export async function updateTodo(
  userId: string,
  todoId: string,
  updates: Partial<Pick<Todo, "title" | "description" | "completed">>
): Promise<{ success: boolean; error: string | null }> {
  try {
    const todoRef = doc(db, `users/${userId}/todos`, todoId);
    await updateDoc(todoRef, updates);
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function deleteTodo(
  userId: string,
  todoId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const todoRef = doc(db, `users/${userId}/todos`, todoId);
    await deleteDoc(todoRef);
    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

