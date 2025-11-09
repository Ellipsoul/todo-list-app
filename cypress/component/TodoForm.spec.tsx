import React from "react";
import { mount } from "cypress/react";
import { TodoForm } from "@/components/TodoForm";
import { TodoFormData } from "@/types/todo";

describe("TodoForm Component", () => {
  it("should render form fields correctly", () => {
    const onSubmit = cy.stub();

    mount(<TodoForm onSubmit={onSubmit} />);

    // Check for form fields
    cy.get("label").contains("Title *").should("be.visible");
    cy.get('input[id="title"]').should("be.visible");
    cy.get("label").contains("Description").should("be.visible");
    cy.get('textarea[id="description"]').should("be.visible");
    cy.get('button[type="submit"]').contains("Add Todo").should("be.visible");
  });

  it("should submit form with valid data", () => {
    const onSubmit = cy.stub().as("onSubmit");
    const title = "Test Todo";
    const description = "Test Description";

    mount(<TodoForm onSubmit={onSubmit} />);

    // Fill in form
    cy.get('input[id="title"]').type(title);
    cy.get('textarea[id="description"]').type(description);

    // Submit form
    cy.get('button[type="submit"]').click();

    // Verify onSubmit was called with correct data
    cy.get("@onSubmit").should("have.been.calledWith", {
      title,
      description,
    });
  });

  it("should not submit form with empty title", () => {
    const onSubmit = cy.stub().as("onSubmit");

    mount(<TodoForm onSubmit={onSubmit} />);

    // Try to submit without title
    cy.get('button[type="submit"]').click();

    // Verify onSubmit was not called (HTML5 validation prevents submission)
    cy.get("@onSubmit").should("not.have.been.called");
  });

  it("should clear form after submission", () => {
    const onSubmit = cy.stub().as("onSubmit");
    const title = "Test Todo";

    mount(<TodoForm onSubmit={onSubmit} />);

    // Fill in form
    cy.get('input[id="title"]').type(title);
    cy.get('textarea[id="description"]').type("Description");

    // Submit form
    cy.get('button[type="submit"]').click();

    // Verify form is cleared
    cy.get('input[id="title"]').should("have.value", "");
    cy.get('textarea[id="description"]').should("have.value", "");
  });

  it("should show cancel button when onCancel is provided", () => {
    const onSubmit = cy.stub();
    const onCancel = cy.stub().as("onCancel");

    mount(<TodoForm onSubmit={onSubmit} onCancel={onCancel} />);

    // Check for cancel button
    cy.get("button").contains("Cancel").should("be.visible");

    // Click cancel
    cy.get("button").contains("Cancel").click();

    // Verify onCancel was called
    cy.get("@onCancel").should("have.been.called");
  });

  it("should not show cancel button when onCancel is not provided", () => {
    const onSubmit = cy.stub();

    mount(<TodoForm onSubmit={onSubmit} />);

    // Cancel button should not exist
    cy.get("button").contains("Cancel").should("not.exist");
  });

  it("should populate form with initial data", () => {
    const onSubmit = cy.stub();
    const initialData: TodoFormData = {
      title: "Initial Title",
      description: "Initial Description",
    };

    mount(<TodoForm onSubmit={onSubmit} initialData={initialData} />);

    // Verify form is populated
    cy.get('input[id="title"]').should("have.value", initialData.title);
    cy.get('textarea[id="description"]').should(
      "have.value",
      initialData.description,
    );
  });

  it("should use custom submit label", () => {
    const onSubmit = cy.stub();
    const submitLabel = "Save";

    mount(<TodoForm onSubmit={onSubmit} submitLabel={submitLabel} />);

    // Verify submit button has custom label
    cy.get('button[type="submit"]').contains(submitLabel).should("be.visible");
  });

  it("should trim whitespace from title and description", () => {
    const onSubmit = cy.stub().as("onSubmit");
    const title = "  Test Todo  ";
    const description = "  Test Description  ";

    mount(<TodoForm onSubmit={onSubmit} />);

    // Fill in form with whitespace
    cy.get('input[id="title"]').type(title);
    cy.get('textarea[id="description"]').type(description);

    // Submit form
    cy.get('button[type="submit"]').click();

    // Verify onSubmit was called with trimmed data
    cy.get("@onSubmit").should("have.been.calledWith", {
      title: title.trim(),
      description: description.trim(),
    });
  });
});
