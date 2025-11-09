describe("Create Todo", () => {
  beforeEach(() => {
    // Clear any existing session
    cy.clearCookies();
    cy.clearLocalStorage();
    
    // Generate unique email for each test
    const email = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@example.com`;
    const password = "password123";
    
    // Create account and sign in
    cy.visit("/login");
    cy.get('button').contains("Don't have an account? Sign up").click();
    cy.get('input[id="email"]').type(email);
    cy.get('input[id="password"]').type(password);
    cy.get('button[type="submit"]').contains("Sign Up").click();
    cy.url({ timeout: 1000 }).should("eq", Cypress.config().baseUrl + "/");
    cy.contains("Todo List", { timeout: 1000 }).should("be.visible");
  });

  it("should show form validation for empty title", () => {
    // Try to submit form with empty title
    cy.get('button[type="submit"]').contains("Add Todo").click();
    
    // Check for HTML5 validation
    cy.get('input[id="title"]').should("have.attr", "required");
  });

  it("should create todo with title only", () => {
    const todoTitle = `Test Todo ${Date.now()}`;
    
    // Fill in title only
    cy.get('input[id="title"]').type(todoTitle);
    cy.get('button[type="submit"]').contains("Add Todo").click();
    
    // Wait for todo to appear in list (more reliable than waiting for toast)
    cy.contains(todoTitle, { timeout: 1000 }).should("be.visible");
    
    // Verify form is cleared
    cy.get('input[id="title"]').should("have.value", "");
  });

  it("should create todo with title and description", () => {
    const todoTitle = `Test Todo ${Date.now()}`;
    const todoDescription = "This is a test description";
    
    // Fill in title and description
    cy.get('input[id="title"]').type(todoTitle);
    cy.get('textarea[id="description"]').type(todoDescription);
    cy.get('button[type="submit"]').contains("Add Todo").click();
    
    // Wait for todo to appear in list (more reliable than waiting for toast)
    cy.contains(todoTitle, { timeout: 1000 }).should("be.visible");
    cy.contains(todoDescription, { timeout: 1000 }).should("be.visible");
    
    // Verify form is cleared
    cy.get('input[id="title"]').should("have.value", "");
    cy.get('textarea[id="description"]').should("have.value", "");
  });

  it("should trim whitespace from title and description", () => {
    const todoTitle = `  Test Todo ${Date.now()}  `;
    const trimmedTitle = todoTitle.trim();
    const todoDescription = "  Test Description  ";
    const trimmedDescription = todoDescription.trim();
    
    // Fill in with whitespace
    cy.get('input[id="title"]').type(todoTitle);
    cy.get('textarea[id="description"]').type(todoDescription);
    cy.get('button[type="submit"]').contains("Add Todo").click();
    
    // Wait for trimmed values to appear in list (more reliable than waiting for toast)
    cy.contains(trimmedTitle, { timeout: 1000 }).should("be.visible");
    cy.contains(trimmedDescription, { timeout: 1000 }).should("be.visible");
  });

  it("should display multiple todos in the list", () => {
    const todo1 = `Todo 1 ${Date.now()}`;
    const todo2 = `Todo 2 ${Date.now()}`;
    const todo3 = `Todo 3 ${Date.now()}`;
    
    // Create first todo
    cy.get('input[id="title"]').type(todo1);
    cy.get('button[type="submit"]').contains("Add Todo").click();
    cy.contains(todo1, { timeout: 15000 }).should("be.visible");
    
    // Create second todo
    cy.get('input[id="title"]').type(todo2);
    cy.get('button[type="submit"]').contains("Add Todo").click();
    cy.contains(todo2, { timeout: 15000 }).should("be.visible");
    
    // Create third todo
    cy.get('input[id="title"]').type(todo3);
    cy.get('button[type="submit"]').contains("Add Todo").click();
    cy.contains(todo3, { timeout: 15000 }).should("be.visible");
    
    // Verify all todos appear in list
    cy.contains(todo1).should("be.visible");
    cy.contains(todo2).should("be.visible");
    cy.contains(todo3).should("be.visible");
  });

  it("should show empty state when no todos exist", () => {
    // Should show empty state message
    cy.contains("No todos yet. Create your first todo above!").should("be.visible");
  });
});

