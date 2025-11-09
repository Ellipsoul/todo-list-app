describe("Sign In Flow", () => {
  beforeEach(() => {
    // Clear any existing session
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it("should show validation errors for empty fields", () => {
    cy.visit("/login");
    
    // Try to submit empty form
    cy.get('button[type="submit"]').contains("Sign In").click();
    
    // Check for HTML5 validation (required fields)
    cy.get('input[id="email"]').should("have.attr", "required");
    cy.get('input[id="password"]').should("have.attr", "required");
  });

  it("should show validation error for invalid email", () => {
    cy.visit("/login");
    
    // Enter invalid email
    cy.get('input[id="email"]').type("invalid-email");
    cy.get('input[id="password"]').type("password123");
    
    // Check for HTML5 email validation
    cy.get('input[id="email"]').should("have.attr", "type", "email");
  });

  it("should show error for invalid credentials", () => {
    cy.visit("/login");
    
    // Enter invalid credentials
    cy.get('input[id="email"]').type("nonexistent@example.com");
    cy.get('input[id="password"]').type("wrongpassword");
    cy.get('button[type="submit"]').contains("Sign In").click();
    
    // Should show error message (check both toast and form error)
    cy.get('body', { timeout: 1000 }).should(($body) => {
      const hasError = $body.text().match(/invalid|incorrect|wrong|failed|auth\/wrong-password|auth\/user-not-found/i);
      expect(hasError).to.not.be.null;
    });
  });

  it("should successfully sign in with valid credentials", () => {
    const email = `test-${Date.now()}@example.com`;
    const password = "password123";
    
    // First, create an account
    cy.visit("/login");
    cy.get('button').contains("Don't have an account? Sign up").click();
    cy.get('input[id="email"]').type(email);
    cy.get('input[id="password"]').type(password);
    cy.get('button[type="submit"]').contains("Sign Up").click();
    cy.url({ timeout: 1000 }).should("eq", Cypress.config().baseUrl + "/");
    
    // Logout
    cy.get('header').within(() => {
      cy.get('button').contains("Sign Out").click();
    });
    cy.url({ timeout: 1000 }).should("include", "/login");
    
    // Now sign in
    cy.get('input[id="email"]').type(email);
    cy.get('input[id="password"]').type(password);
    cy.get('button[type="submit"]').contains("Sign In").click();
    
    // Wait for redirect to home page (more reliable than waiting for toast)
    cy.url({ timeout: 1000 }).should("eq", Cypress.config().baseUrl + "/");
    
    // Verify we're on the home page
    cy.contains("Todo List", { timeout: 1000 }).should("be.visible");
    
    // Verify toast message appears (optional check)
    cy.get('body').then(($body) => {
      if ($body.find('[role="status"]').length > 0) {
        cy.contains("Signed in successfully", { timeout: 1000 }).should("exist");
      }
    });
  });

  it("should toggle between sign in and sign up modes", () => {
    cy.visit("/login");
    
    // Should be in sign in mode by default
    cy.get('h1').contains("Sign In").should("be.visible");
    cy.get('button[type="submit"]').contains("Sign In").should("be.visible");
    
    // Switch to sign up
    cy.get('button').contains("Don't have an account? Sign up").click();
    cy.get('h1').contains("Sign Up").should("be.visible");
    cy.get('button[type="submit"]').contains("Sign Up").should("be.visible");
    
    // Switch back to sign in
    cy.get('button').contains("Already have an account? Sign in").click();
    cy.get('h1').contains("Sign In").should("be.visible");
    cy.get('button[type="submit"]').contains("Sign In").should("be.visible");
  });
});

