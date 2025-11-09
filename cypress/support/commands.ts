/// <reference types="cypress" />

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to login with email and password
       * @example cy.login('test@example.com', 'password123')
       */
      login(email: string, password: string): Chainable<void>;
      
      /**
       * Custom command to login with Google (may require mocking)
       * @example cy.loginWithGoogle()
       */
      loginWithGoogle(): Chainable<void>;
      
      /**
       * Custom command to logout
       * @example cy.logout()
       */
      logout(): Chainable<void>;
      
      /**
       * Custom command to create a test todo
       * @example cy.createTestTodo('Test Todo', 'Test Description')
       */
      createTestTodo(title: string, description?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add("login", (email: string, password: string) => {
  cy.visit("/login");
  cy.get('input[id="email"]').type(email);
  cy.get('input[id="password"]').type(password);
  cy.get('button[type="submit"]').click();
  // Wait for redirect to home page
  cy.url().should("eq", Cypress.config().baseUrl + "/");
  // Wait for session to be established
  cy.wait(1000);
});

Cypress.Commands.add("loginWithGoogle", () => {
  cy.visit("/login");
  // Mock Google OAuth popup or use test account
  cy.get('button').contains('Sign in with Google').click();
  // Note: Google OAuth may require mocking or a test account
  // For now, we'll just click the button and handle the flow
  cy.wait(2000);
});

Cypress.Commands.add("logout", () => {
  cy.get('button').contains('Sign Out').click();
  // Wait for redirect to login page
  cy.url().should("include", "/login");
});

Cypress.Commands.add("createTestTodo", (title: string, description?: string) => {
  cy.get('input[id="title"]').type(title);
  if (description) {
    cy.get('textarea[id="description"]').type(description);
  }
  cy.get('button[type="submit"]').contains('Add Todo').click();
  // Wait for todo to appear
  cy.contains(title).should("be.visible");
});

export {};

