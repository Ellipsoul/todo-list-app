import { Timestamp } from "firebase/firestore";

export interface Todo {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  createdAt: Timestamp;
}

export interface TodoFormData {
  title: string;
  description: string;
}
