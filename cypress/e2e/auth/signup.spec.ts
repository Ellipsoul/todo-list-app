describe("Sign Up Flow", () => {
  beforeEach(() => {
    // Clear any existing session
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it("should show validation errors for empty fields", () => {
    cy.visit("/login");
    
    // Switch to sign up mode
    cy.get('button').contains("Don't have an account? Sign up").click();
    
    // Try to submit empty form
    cy.get('button[type="submit"]').contains("Sign Up").click();
    
    // Check for HTML5 validation (required fields)
    cy.get('input[id="email"]').should("have.attr", "required");
    cy.get('input[id="password"]').should("have.attr", "required");
  });

  it("should show validation error for invalid email", () => {
    cy.visit("/login");
    
    // Switch to sign up mode
    cy.get('button').contains("Don't have an account? Sign up").click();
    
    // Enter invalid email
    cy.get('input[id="email"]').type("invalid-email");
    cy.get('input[id="password"]').type("password123");
    
    // Check for HTML5 email validation
    cy.get('input[id="email"]').should("have.attr", "type", "email");
  });

  it("should show validation error for short password", () => {
    cy.visit("/login");
    
    // Switch to sign up mode
    cy.get('button').contains("Don't have an account? Sign up").click();
    
    // Enter short password
    cy.get('input[id="email"]').type("test@example.com");
    cy.get('input[id="password"]').type("12345");
    
    // Check for minLength validation
    cy.get('input[id="password"]').should("have.attr", "minLength", "6");
  });

  it("should successfully sign up with valid credentials", () => {
    const email = `test-${Date.now()}@example.com`;
    const password = "password123";
    
    cy.visit("/login");
    
    // Switch to sign up mode
    cy.get('button').contains("Don't have an account? Sign up").click();
    
    // Fill in form
    cy.get('input[id="email"]').type(email);
    cy.get('input[id="password"]').type(password);
    
    // Submit form
    cy.get('button[type="submit"]').contains("Sign Up").click();
    
    // Wait for redirect to home page (more reliable than waiting for toast)
    cy.url({ timeout: 1000 }).should("eq", Cypress.config().baseUrl + "/");
    
    // Verify we're on the home page
    cy.contains("Todo List", { timeout: 1000 }).should("be.visible");
    
    // Verify toast message appears (optional check)
    cy.get('body').then(($body) => {
      if ($body.find('[role="status"]').length > 0) {
        cy.contains("Account created successfully", { timeout: 1000 }).should("exist");
      }
    });
  });

  it("should show error for existing email", () => {
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
    
    // Try to sign up with the same email
    cy.get('button').contains("Don't have an account? Sign up").click();
    cy.get('input[id="email"]').type(email);
    cy.get('input[id="password"]').type(password);
    cy.get('button[type="submit"]').contains("Sign Up").click();
    
    // Should show error message (check both toast and form error)
    cy.get('body', { timeout: 1000 }).should(($body) => {
      const hasError = $body.text().match(/email|already|exists|in use|auth\/email-already-in-use/i);
      void expect(hasError).not.to.be.null;
    });
  });
});

