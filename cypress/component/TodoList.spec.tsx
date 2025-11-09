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

// Mock useSession hook
cy.stub(require("next-auth/react"), "useSession", () => mockSession);

// Mock firestore functions
const mockCreateTodo = cy.stub().resolves({ id: "new-todo-id", error: null });
const mockSubscribeToTodos = cy.stub().returns(() => {}); // Returns unsubscribe function

// Mock firestore module
cy.stub(require("@/lib/firestore"), "createTodo", mockCreateTodo);
cy.stub(require("@/lib/firestore"), "subscribeToTodos", mockSubscribeToTodos);

// Mock toast
const mockToast = {
  loading: cy.stub().returns("toast-id"),
  success: cy.stub(),
  error: cy.stub(),
};

describe("TodoList Component", () => {
  beforeEach(() => {
    // Reset mocks
    mockCreateTodo.reset();
    mockSubscribeToTodos.reset();
  });

  it("should render empty state when no todos exist", () => {
    // Mock subscribeToTodos to call callback with empty array
    mockSubscribeToTodos.callsFake((userId: string, callback: (todos: Todo[]) => void) => {
      callback([]);
      return () => {}; // Return unsubscribe function
    });
    
    mount(<TodoList />);
    
    // Verify empty state message
    cy.contains("No todos yet. Create your first todo above!").should("be.visible");
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
    mockSubscribeToTodos.callsFake((userId: string, callback: (todos: Todo[]) => void) => {
      callback(mockTodos);
      return () => {}; // Return unsubscribe function
    });
    
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
    mockSubscribeToTodos.callsFake((userId: string, callback: (todos: Todo[]) => void) => {
      callback(mockTodos);
      return () => {};
    });
    
    mount(<TodoList />);
    
    // Verify count is displayed
    cy.contains("Your Todos (2)").should("be.visible");
  });

  it("should render TodoForm component", () => {
    // Mock subscribeToTodos with empty array
    mockSubscribeToTodos.callsFake((userId: string, callback: (todos: Todo[]) => void) => {
      callback([]);
      return () => {};
    });
    
    mount(<TodoList />);
    
    // Verify TodoForm is rendered
    cy.get('input[id="title"]').should("be.visible");
    cy.get('textarea[id="description"]').should("be.visible");
    cy.get('button[type="submit"]').contains("Add Todo").should("be.visible");
  });

  it("should not render when session is not available", () => {
    // Mock useSession to return unauthenticated
    cy.stub(require("next-auth/react"), "useSession", () => ({
      data: null,
      status: "unauthenticated" as const,
    }));
    
    mount(<TodoList />);
    
    // Component should return null
    cy.get("body").should("not.contain", "Todo List");
  });
});

