describe("Settings Page", () => {
  const timestamp = Date.now();
  const email = `test-settings-${timestamp}@example.com`;
  const password = "password123";

  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  const signupAndLogin = () => {
    cy.visit("/login");
    cy.get('button').contains("Don't have an account? Sign up").click();
    cy.get('input[id="email"]').type(email);
    cy.get('input[id="password"]').type(password);
    cy.get('button[type="submit"]').contains("Sign Up").click();
    cy.url().should("eq", Cypress.config().baseUrl + "/");
  };

  it("should navigate to settings page and display user info", () => {
    signupAndLogin();

    // Navigate to settings via header link or bottom button
    // Let's use the header link if possible, or just visit directly to be sure
    cy.visit("/settings");

    // Check user info
    cy.contains("User Profile").should("be.visible");
    cy.contains(email).should("be.visible");
    cy.contains("Joined Date").should("be.visible");
    // User ID is displayed in a mono font block
    cy.get("p.font-mono").should("be.visible");
  });

  it("should display correct note count and delete all notes", () => {
    // Reuse the user from previous test if possible? No, simpler to create new unique user per test file run or similar.
    // But here I want to ensure a clean state. 
    // Let's use a unique email for THIS test specifically to avoid conflicts.
    const testEmail = `test-notes-${Date.now()}@example.com`;
    
    cy.visit("/login");
    cy.get('button').contains("Don't have an account? Sign up").click();
    cy.get('input[id="email"]').type(testEmail);
    cy.get('input[id="password"]').type(password);
    cy.get('button[type="submit"]').contains("Sign Up").click();
    cy.url().should("eq", Cypress.config().baseUrl + "/");

    // Create 3 notes
    cy.createTestTodo("Note 1", "Description 1");
    cy.createTestTodo("Note 2", "Description 2");
    cy.createTestTodo("Note 3", "Description 3");

    // Go to settings
    cy.visit("/settings");

    // Check count
    cy.contains("3").should("be.visible");
    cy.contains("Total Notes").should("be.visible");

    // Delete all notes
    cy.window().then((win) => {
      cy.stub(win, "confirm").returns(true);
    });

    cy.get("button").contains("Delete All").click();

    // Check success message
    cy.contains("All notes deleted successfully").should("be.visible");
    
    // Check count updated
    cy.contains("0").should("be.visible");

    // Go back to dashboard and verify empty
    cy.visit("/");
    cy.contains("No todos yet").should("be.visible");
  });

  it("should delete account", () => {
    const testEmail = `test-delete-${Date.now()}@example.com`;
    
    cy.visit("/login");
    cy.get('button').contains("Don't have an account? Sign up").click();
    cy.get('input[id="email"]').type(testEmail);
    cy.get('input[id="password"]').type(password);
    cy.get('button[type="submit"]').contains("Sign Up").click();
    cy.url().should("eq", Cypress.config().baseUrl + "/");

    // Go to settings
    cy.visit("/settings");

    // Click Delete Account to open modal
    cy.get("button").contains("Delete Account").click();

    // Check modal appears
    cy.contains("Are you sure you want to delete your account?").should("be.visible");
    cy.contains("delete my account").should("be.visible");

    // Target the modal specifically for interactions
    const modalSelector = ".fixed.inset-0";

    // Try to delete without typing (button in modal should be disabled)
    cy.get(modalSelector).within(() => {
      cy.get("button").contains("Delete Account").should("be.disabled");
      
      // Type wrong text
      cy.get('input').type("wrong text");
      cy.get("button").contains("Delete Account").should("be.disabled");

      // Type correct text
      cy.get('input').clear().type("delete my account");
      cy.get("button").contains("Delete Account").should("not.be.disabled");
      
      // Click delete in modal
      cy.get("button").contains("Delete Account").click();
    });

    // Should be redirected to login
    cy.url().should("include", "/login");
    cy.contains("Account deleted successfully").should("be.visible");

    // Try to login again
    cy.visit("/login");
    cy.get('input[id="email"]').type(testEmail);
    cy.get('input[id="password"]').type(password);
    cy.get('button[type="submit"]').click();

    // Should fail
    cy.contains("auth/user-not-found").should("exist"); // Or whatever error message appears
  });

  it("should reset delete modal input when reopened", () => {
    const testEmail = `test-delete-reset-${Date.now()}@example.com`;

    cy.visit("/login");
    cy.get("button").contains("Don't have an account? Sign up").click();
    cy.get('input[id="email"]').type(testEmail);
    cy.get('input[id="password"]').type(password);
    cy.get('button[type="submit"]').contains("Sign Up").click();
    cy.url().should("eq", Cypress.config().baseUrl + "/");

    cy.visit("/settings");
    cy.get("button").contains("Delete Account").click();

    const modalSelector = ".fixed.inset-0";
    cy.get(modalSelector).within(() => {
      cy.get('input[id="confirmation-text"]').type("delete my account");
      cy.get("button").contains("Delete Account").should("not.be.disabled");
      cy.get("button").contains("Cancel").click();
    });

    cy.get(modalSelector).should("not.exist");

    cy.get("button").contains("Delete Account").click();
    cy.get(modalSelector).within(() => {
      cy.get('input[id="confirmation-text"]').should("have.value", "");
      cy.get("button").contains("Delete Account").should("be.disabled");
    });
  });
});

