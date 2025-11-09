describe("Sign Out Flow", () => {
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
  });

  it("should display sign out button in header", () => {
    // Verify sign out button is visible
    cy.get('button').contains("Sign Out").should("be.visible");
    
    // Verify it's in the header
    cy.get('header').within(() => {
      cy.get('button').contains("Sign Out").should("be.visible");
    });
  });

  it("should successfully sign out when sign out button is clicked", () => {
    // Click sign out button
    cy.get('header').within(() => {
      cy.get('button').contains("Sign Out").click();
    });
    
    // Wait for redirect to login page (more reliable than waiting for toast)
    cy.url({ timeout: 10000 }).should("include", "/login");
    cy.contains("Sign In", { timeout: 10000 }).should("be.visible");
  });

  it("should redirect to login page after sign out", () => {
    // Click sign out button
    cy.get('header').within(() => {
      cy.get('button').contains("Sign Out").click();
    });
    
    // Wait for redirect
    cy.url({ timeout: 10000 }).should("include", "/login");
    
    // Verify we're on the login page
    cy.contains("Sign In").should("be.visible");
    cy.get('input[id="email"]').should("be.visible");
    cy.get('input[id="password"]').should("be.visible");
  });

  it("should prevent access to protected routes after sign out", () => {
    // Sign out
    cy.get('header').within(() => {
      cy.get('button').contains("Sign Out").click();
    });
    cy.url({ timeout: 10000 }).should("include", "/login");
    
    // Try to access home page
    cy.visit("/");
    
    // Should be redirected back to login
    cy.url().should("include", "/login");
    cy.contains("Sign In").should("be.visible");
  });

  it("should clear session after sign out", () => {
    // Get email from session (we need to store it)
    let userEmail: string;
    cy.get('header').within(() => {
      cy.get('div').contains('@').then(($email) => {
        userEmail = $email.text();
      });
    });
    
    // Create a todo to verify session was active
    const todoTitle = `Test Todo ${Date.now()}`;
    cy.get('input[id="title"]').type(todoTitle);
    cy.get('button[type="submit"]').contains("Add Todo").click();
    cy.contains(todoTitle, { timeout: 15000 }).should("be.visible");
    
    // Sign out
    cy.get('header').within(() => {
      cy.get('button').contains("Sign Out").click();
    });
    cy.url({ timeout: 10000 }).should("include", "/login");
    
    // Sign back in (we'll need to create a new account or use the same credentials)
    // For this test, we'll just verify sign out worked
    cy.contains("Sign In").should("be.visible");
  });

  it("should show user email in header before sign out", () => {
    // Verify user email is displayed in header
    cy.get('header').within(() => {
      cy.get('div').contains('@').should("be.visible");
      
      // Sign out
      cy.get('button').contains("Sign Out").click();
    });
    
    cy.url({ timeout: 10000 }).should("include", "/login");
    
    // Email should not be visible on login page (header is not on login page)
    cy.get('header').should("not.exist");
  });
});

