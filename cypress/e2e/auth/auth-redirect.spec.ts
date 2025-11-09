describe("Authentication Redirects", () => {
  beforeEach(() => {
    // Clear any existing session
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it("should redirect unauthenticated user from home to login", () => {
    cy.visit("/");
    
    // Should be redirected to login page
    cy.url().should("include", "/login");
    cy.contains("Sign In").should("be.visible");
  });

  it("should allow authenticated user to access home page", () => {
    const email = `test-${Date.now()}@example.com`;
    const password = "password123";
    
    // Create account and sign in
    cy.visit("/login");
    cy.get('button').contains("Don't have an account? Sign up").click();
    cy.get('input[id="email"]').type(email);
    cy.get('input[id="password"]').type(password);
    cy.get('button[type="submit"]').contains("Sign Up").click();
    
    // Should be on home page
    cy.url({ timeout: 1000 }).should("eq", Cypress.config().baseUrl + "/");
    cy.contains("Todo List", { timeout: 1000 }).should("be.visible");
    
    // Try to access home page again (should stay on home)
    cy.visit("/");
    cy.url().should("eq", Cypress.config().baseUrl + "/");
    cy.contains("Todo List").should("be.visible");
  });

  it("should allow authenticated user to access login page", () => {
    const email = `test-${Date.now()}@example.com`;
    const password = "password123";
    
    // Create account and sign in
    cy.visit("/login");
    cy.get('button').contains("Don't have an account? Sign up").click();
    cy.get('input[id="email"]').type(email);
    cy.get('input[id="password"]').type(password);
    cy.get('button[type="submit"]').contains("Sign Up").click();
    
    // Should be on home page
    cy.url({ timeout: 1000 }).should("eq", Cypress.config().baseUrl + "/");
    
    // Try to visit login page while authenticated
    cy.visit("/login");
    
    // Authenticated users can visit the login page (no automatic redirect)
    // The login page is accessible but they can still use it
    cy.url({ timeout: 1000 }).should("include", "/login");
    cy.contains("Sign In").should("be.visible");
  });

  it("should maintain session after page refresh", () => {
    const email = `test-${Date.now()}@example.com`;
    const password = "password123";
    
    // Create account and sign in
    cy.visit("/login");
    cy.get('button').contains("Don't have an account? Sign up").click();
    cy.get('input[id="email"]').type(email);
    cy.get('input[id="password"]').type(password);
    cy.get('button[type="submit"]').contains("Sign Up").click();
    
    // Should be on home page
    cy.url({ timeout: 1000 }).should("eq", Cypress.config().baseUrl + "/");
    cy.contains("Todo List", { timeout: 1000 }).should("be.visible");
    
    // Refresh the page
    cy.reload();
    
    // Should still be authenticated and on home page
    cy.url({ timeout: 1000 }).should("eq", Cypress.config().baseUrl + "/");
    cy.contains("Todo List", { timeout: 1000 }).should("be.visible");
  });
});

