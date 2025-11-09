import React from "react";
import { mount } from "cypress/react";
import { TodoItem } from "@/components/TodoItem";
import { Todo } from "@/types/todo";
import { Timestamp } from "firebase/firestore";

// Mock toast
const mockToast = {
  loading: cy.stub().returns("toast-id"),
  success: cy.stub(),
  error: cy.stub(),
};

// Mock firestore functions
const mockUpdateTodo = cy.stub().resolves({ success: true, error: null });
const mockDeleteTodo = cy.stub().resolves({ success: true, error: null });

// Mock modules
beforeEach(() => {
  cy.window().then((win) => {
    // Mock react-hot-toast
    (win as any).toast = mockToast;
  });
  
  // Mock firestore functions
  cy.intercept("POST", "**/firestore/**", { statusCode: 200 }).as("firestore");
});

describe("TodoItem Component", () => {
  const mockTodo: Todo = {
    id: "test-id-1",
    title: "Test Todo",
    description: "Test Description",
    completed: false,
    createdAt: Timestamp.now(),
  };

  const mockUserId = "test-user-id";

  it("should render todo data correctly", () => {
    const onUpdate = cy.stub();
    
    mount(<TodoItem todo={mockTodo} userId={mockUserId} onUpdate={onUpdate} />);
    
    // Verify todo data is displayed
    cy.contains(mockTodo.title).should("be.visible");
    cy.contains(mockTodo.description).should("be.visible");
    cy.get('input[type="checkbox"]').should("not.be.checked");
  });

  it("should render todo without description", () => {
    const onUpdate = cy.stub();
    const todoWithoutDescription: Todo = {
      ...mockTodo,
      description: "",
    };
    
    mount(<TodoItem todo={todoWithoutDescription} userId={mockUserId} onUpdate={onUpdate} />);
    
    // Verify title is displayed
    cy.contains(todoWithoutDescription.title).should("be.visible");
    
    // Description should not be visible
    cy.contains(mockTodo.description).should("not.exist");
  });

  it("should show completed state correctly", () => {
    const onUpdate = cy.stub();
    const completedTodo: Todo = {
      ...mockTodo,
      completed: true,
    };
    
    mount(<TodoItem todo={completedTodo} userId={mockUserId} onUpdate={onUpdate} />);
    
    // Verify checkbox is checked
    cy.get('input[type="checkbox"]').should("be.checked");
    
    // Verify visual styling for completed todo
    cy.contains(completedTodo.title).parent().should("have.class", "line-through");
  });

  it("should toggle checkbox", () => {
    const onUpdate = cy.stub().as("onUpdate");
    
    mount(<TodoItem todo={mockTodo} userId={mockUserId} onUpdate={onUpdate} />);
    
    // Check the checkbox
    cy.get('input[type="checkbox"]').check();
    
    // Wait for async operation
    cy.wait(1000);
    
    // Verify onUpdate was called
    cy.get("@onUpdate").should("have.been.called");
  });

  it("should enter edit mode when edit button is clicked", () => {
    const onUpdate = cy.stub();
    
    mount(<TodoItem todo={mockTodo} userId={mockUserId} onUpdate={onUpdate} />);
    
    // Click edit button
    cy.get('button').contains("Edit").click();
    
    // Verify edit form is shown
    cy.get('input[id="title"]').should("be.visible");
    cy.get('textarea[id="description"]').should("be.visible");
    cy.get('button').contains("Save").should("be.visible");
    cy.get('button').contains("Cancel").should("be.visible");
  });

  it("should populate edit form with todo data", () => {
    const onUpdate = cy.stub();
    
    mount(<TodoItem todo={mockTodo} userId={mockUserId} onUpdate={onUpdate} />);
    
    // Click edit button
    cy.get('button').contains("Edit").click();
    
    // Verify form is populated
    cy.get('input[id="title"]').should("have.value", mockTodo.title);
    cy.get('textarea[id="description"]').should("have.value", mockTodo.description);
  });

  it("should cancel editing", () => {
    const onUpdate = cy.stub();
    
    mount(<TodoItem todo={mockTodo} userId={mockUserId} onUpdate={onUpdate} />);
    
    // Click edit button
    cy.get('button').contains("Edit").click();
    
    // Click cancel
    cy.get('button').contains("Cancel").click();
    
    // Verify edit form is gone and todo is displayed
    cy.get('button').contains("Save").should("not.exist");
    cy.contains(mockTodo.title).should("be.visible");
  });

  it("should show delete button", () => {
    const onUpdate = cy.stub();
    
    mount(<TodoItem todo={mockTodo} userId={mockUserId} onUpdate={onUpdate} />);
    
    // Verify delete button exists
    cy.get('button').contains("Delete").should("be.visible");
  });

  it("should show confirmation dialog when delete is clicked", () => {
    const onUpdate = cy.stub();
    
    // Stub window.confirm
    cy.window().then((win) => {
      cy.stub(win, "confirm").returns(false);
    });
    
    mount(<TodoItem todo={mockTodo} userId={mockUserId} onUpdate={onUpdate} />);
    
    // Click delete button
    cy.get('button').contains("Delete").click();
    
    // Verify confirm was called
    cy.window().its("confirm").should("have.been.called");
  });

  it("should disable buttons when deleting", () => {
    const onUpdate = cy.stub();
    
    // Stub confirm to return true
    cy.window().then((win) => {
      cy.stub(win, "confirm").returns(true);
    });
    
    mount(<TodoItem todo={mockTodo} userId={mockUserId} onUpdate={onUpdate} />);
    
    // Click delete button
    cy.get('button').contains("Delete").click();
    
    // Verify delete button shows "Deleting..." and is disabled
    cy.get('button').contains("Deleting...").should("be.visible");
    cy.get('button').contains("Deleting...").should("be.disabled");
  });

  it("should display created date", () => {
    const onUpdate = cy.stub();
    
    mount(<TodoItem todo={mockTodo} userId={mockUserId} onUpdate={onUpdate} />);
    
    // Verify date is displayed (format may vary)
    cy.contains(mockTodo.createdAt.toDate().toLocaleDateString()).should("be.visible");
  });
});

