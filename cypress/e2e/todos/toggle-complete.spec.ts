describe("Toggle Todo Complete", () => {
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
    cy.url({ timeout: 20000 }).should("eq", Cypress.config().baseUrl + "/");
    cy.contains("Todo List", { timeout: 15000 }).should("be.visible");
    
    // Create a test todo
    const todoTitle = `Test Todo ${Date.now()}`;
    cy.get('input[id="title"]').type(todoTitle);
    cy.get('button[type="submit"]').contains("Add Todo").click();
    cy.contains(todoTitle, { timeout: 15000 }).should("be.visible");
  });

  it("should mark todo as complete when checkbox is checked", () => {
    // Find the checkbox and check it
    cy.get('input[type="checkbox"]').first().check();
    
    // Wait for checkbox to be checked (more reliable than waiting for toast)
    cy.get('input[type="checkbox"]').first().should("be.checked", { timeout: 10000 });
    
    // Verify visual changes (line-through and opacity)
    cy.get('input[type="checkbox"]').first().parent().parent().within(() => {
      cy.get('h3').should("have.class", "line-through");
      cy.get('h3').should("have.class", "text-muted-foreground");
    });
  });

  it("should mark todo as incomplete when checkbox is unchecked", () => {
    // First, mark as complete
    cy.get('input[type="checkbox"]').first().check();
    cy.get('input[type="checkbox"]').first().should("be.checked", { timeout: 10000 });
    
    // Wait a bit for the state to update
    cy.wait(1000);
    
    // Uncheck the checkbox
    cy.get('input[type="checkbox"]').first().uncheck();
    
    // Wait for checkbox to be unchecked (more reliable than waiting for toast)
    cy.get('input[type="checkbox"]').first().should("not.be.checked", { timeout: 10000 });
    
    // Verify visual changes are reverted (no line-through)
    cy.get('input[type="checkbox"]').first().parent().parent().within(() => {
      cy.get('h3').should("not.have.class", "line-through");
    });
  });

  it("should toggle complete state multiple times", () => {
    // Toggle to complete
    cy.get('input[type="checkbox"]').first().check();
    cy.get('input[type="checkbox"]').first().should("be.checked", { timeout: 10000 });
    
    // Wait for state update
    cy.wait(1000);
    
    // Toggle to incomplete
    cy.get('input[type="checkbox"]').first().uncheck();
    cy.get('input[type="checkbox"]').first().should("not.be.checked", { timeout: 10000 });
    
    // Wait for state update
    cy.wait(1000);
    
    // Toggle back to complete
    cy.get('input[type="checkbox"]').first().check();
    cy.get('input[type="checkbox"]').first().should("be.checked", { timeout: 10000 });
  });

  it("should apply visual styling to completed todos", () => {
    // Mark as complete
    cy.get('input[type="checkbox"]').first().check();
    cy.get('input[type="checkbox"]').first().should("be.checked", { timeout: 10000 });
    
    // Wait a bit for the state to update
    cy.wait(1000);
    
    // Verify the todo container has reduced opacity (the container div with bg-card)
    cy.get('input[type="checkbox"]').first().closest('div.bg-card').should("have.class", "opacity-60");
    
    // Verify title has line-through
    cy.get('input[type="checkbox"]').first().closest('div.bg-card').within(() => {
      cy.get('h3').should("have.class", "line-through");
    });
  });

  it("should toggle multiple todos independently", () => {
    // Create second todo
    const todo2 = `Todo 2 ${Date.now()}`;
    cy.get('input[id="title"]').type(todo2);
    cy.get('button[type="submit"]').contains("Add Todo").click();
    cy.contains(todo2, { timeout: 15000 }).should("be.visible");
    
    // Toggle first todo to complete
    cy.get('input[type="checkbox"]').first().check();
    cy.get('input[type="checkbox"]').first().should("be.checked", { timeout: 10000 });
    
    // Wait for state update
    cy.wait(1000);
    
    // Verify first is checked, second is not
    cy.get('input[type="checkbox"]').first().should("be.checked");
    cy.get('input[type="checkbox"]').last().should("not.be.checked");
    
    // Toggle second todo to complete
    cy.get('input[type="checkbox"]').last().check();
    cy.get('input[type="checkbox"]').last().should("be.checked", { timeout: 10000 });
    
    // Wait for state update
    cy.wait(1000);
    
    // Verify both are checked
    cy.get('input[type="checkbox"]').first().should("be.checked");
    cy.get('input[type="checkbox"]').last().should("be.checked");
  });
});

