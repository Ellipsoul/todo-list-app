import React from "react";
import { mount } from "cypress/react";
import { TodoList } from "@/components/TodoList";
import { Todo } from "@/types/todo";
import { Timestamp } from "firebase/firestore";

// Mock next-auth
const mockSession = {
  data: {
    user: {
      id: "test-user-id",
      email: "test@example.com",
    },
  },
  status: "authenticated" as const,
};

// Mock firestore functions
const mockCreateTodo = cy.stub().resolves({ id: "new-todo-id", error: null });
const mockSubscribeToTodos = cy.stub().returns(() => {}); // Returns unsubscribe function

// Mock modules
// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextAuthModule = require("next-auth/react");
// eslint-disable-next-line @typescript-eslint/no-require-imports
const firestoreModule = require("@/lib/firestore");

// Mock useSession hook
cy.stub(nextAuthModule, "useSession").returns(mockSession);

// Mock firestore module exports
cy.stub(firestoreModule, "createTodo").callsFake(mockCreateTodo);
cy.stub(firestoreModule, "subscribeToTodos").callsFake(mockSubscribeToTodos);

describe("TodoList Component", () => {
  beforeEach(() => {
    // Reset mocks
    mockCreateTodo.reset();
    mockSubscribeToTodos.reset();
  });

  it("should render empty state when no todos exist", () => {
    // Mock subscribeToTodos to call callback with empty array
    mockSubscribeToTodos.callsFake(
      (userId: string, callback: (todos: Todo[]) => void) => {
        callback([]);
        return () => {}; // Return unsubscribe function
      },
    );

    mount(<TodoList />);

    // Verify empty state message
    cy.contains("No todos yet. Create your first todo above!").should(
      "be.visible",
    );
  });

  it("should render loading state initially", () => {
    // Mock subscribeToTodos to not call callback immediately
    mockSubscribeToTodos.callsFake(() => {
      return () => {}; // Return unsubscribe function
    });

    mount(<TodoList />);

    // Verify loading state
    cy.contains("Loading...").should("be.visible");
  });

  it("should render list of todos", () => {
    const mockTodos: Todo[] = [
      {
        id: "todo-1",
        title: "Todo 1",
        description: "Description 1",
        completed: false,
        createdAt: Timestamp.now(),
      },
      {
        id: "todo-2",
        title: "Todo 2",
        description: "Description 2",
        completed: true,
        createdAt: Timestamp.now(),
      },
    ];

    // Mock subscribeToTodos to call callback with todos
    mockSubscribeToTodos.callsFake(
      (userId: string, callback: (todos: Todo[]) => void) => {
        callback(mockTodos);
        return () => {}; // Return unsubscribe function
      },
    );

    mount(<TodoList />);

    // Verify todos are displayed
    cy.contains("Todo 1").should("be.visible");
    cy.contains("Todo 2").should("be.visible");
    cy.contains("Description 1").should("be.visible");
    cy.contains("Description 2").should("be.visible");
  });

  it("should display todo count in header", () => {
    const mockTodos: Todo[] = [
      {
        id: "todo-1",
        title: "Todo 1",
        description: "Description 1",
        completed: false,
        createdAt: Timestamp.now(),
      },
      {
        id: "todo-2",
        title: "Todo 2",
        description: "Description 2",
        completed: false,
        createdAt: Timestamp.now(),
      },
    ];

    // Mock subscribeToTodos
    mockSubscribeToTodos.callsFake(
      (userId: string, callback: (todos: Todo[]) => void) => {
        callback(mockTodos);
        return () => {};
      },
    );

    mount(<TodoList />);

    // Verify count is displayed
    cy.contains("Your Todos (2)").should("be.visible");
  });

  it("should render TodoForm component", () => {
    // Mock subscribeToTodos with empty array
    mockSubscribeToTodos.callsFake(
      (userId: string, callback: (todos: Todo[]) => void) => {
        callback([]);
        return () => {};
      },
    );

    mount(<TodoList />);

    // Verify TodoForm is rendered
    cy.get('input[id="title"]').should("be.visible");
    cy.get('textarea[id="description"]').should("be.visible");
    cy.get('button[type="submit"]').contains("Add Todo").should("be.visible");
  });

  it("should not render when session is not available", () => {
    // Mock useSession to return unauthenticated
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cy.stub(require("next-auth/react"), "useSession").returns({
      data: null,
      status: "unauthenticated" as const,
    });

    mount(<TodoList />);

    // Component should return null
    cy.get("body").should("not.contain", "Todo List");
  });
});
