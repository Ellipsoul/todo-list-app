describe("Edit Todo", () => {
  beforeEach(() => {
    // Clear any existing session
    cy.clearCookies();
    cy.clearLocalStorage();

    // Generate unique email for each test
    const email = `test-${Date.now()}-${
      Math.random().toString(36).substring(7)
    }@example.com`;
    const password = "password123";

    // Create account and sign in
    cy.visit("/login");
    cy.get("button").contains("Don't have an account? Sign up").click();
    cy.get('input[id="email"]').type(email);
    cy.get('input[id="password"]').type(password);
    cy.get('button[type="submit"]').contains("Sign Up").click();
    cy.url({ timeout: 1000 }).should("eq", Cypress.config().baseUrl + "/");
    cy.contains("Todo List", { timeout: 1000 }).should("be.visible");

    // Create a test todo
    const todoTitle = `Test Todo ${Date.now()}`;
    cy.get('input[id="title"]').type(todoTitle);
    cy.get('button[type="submit"]').contains("Add Todo").click();
    cy.contains(todoTitle, { timeout: 1000 }).should("be.visible");
  });

  it("should enter edit mode when edit button is clicked", () => {
    // Find the todo and click edit button
    cy.get("button").contains("Edit").first().click();

    // Should show edit form with Save and Cancel buttons
    cy.get("button").contains("Save").should("be.visible");
    cy.get("button").contains("Cancel").should("be.visible");

    // Should have form fields populated
    cy.get('input[id="title"]').should("exist");
    cy.get('textarea[id="description"]').should("exist");
  });

  it("should edit todo title and description", () => {
    const newTitle = `Updated Todo ${Date.now()}`;
    const newDescription = "Updated description";

    // Click edit button
    cy.get("button").contains("Edit").first().click();

    // Scope to the edit form (the bg-card div that contains the form)
    cy.get("div.bg-card").contains("Save").parent().parent().within(() => {
      // Clear and update title
      cy.get('input[id="title"]').clear().type(newTitle);

      // Update description
      cy.get('textarea[id="description"]').clear().type(newDescription);

      // Save changes
      cy.get("button").contains("Save").click();
    });

    // Wait for updated values to appear in list (more reliable than waiting for toast)
    cy.contains(newTitle, { timeout: 1000 }).should("be.visible");
    cy.contains(newDescription, { timeout: 1000 }).should("be.visible");

    // Verify edit form is gone
    cy.get("button").contains("Save").should("not.exist");
  });

  it("should cancel editing and revert changes", () => {
    // Get original title
    cy.get("h3").first().then(($title) => {
      const originalTitle = $title.text();

      // Click edit button
      cy.get("button").contains("Edit").first().click();

      // Scope to the edit form
      cy.get("div.bg-card").contains("Save").parent().parent().within(() => {
        // Change title
        cy.get('input[id="title"]').clear().type("Changed Title");

        // Click cancel
        cy.get("button").contains("Cancel").click();
      });

      // Verify original title is still there
      cy.contains(originalTitle).should("be.visible");

      // Verify edit form is gone
      cy.get("button").contains("Save").should("not.exist");
    });
  });

  it("should validate title is required when editing", () => {
    // Click edit button
    cy.get("button").contains("Edit").first().click();

    // Scope to the edit form
    cy.get("div.bg-card").contains("Save").parent().parent().within(() => {
      // Clear title
      cy.get('input[id="title"]').clear();

      // Try to save
      cy.get("button").contains("Save").click();

      // Check for HTML5 validation
      cy.get('input[id="title"]').should("have.attr", "required");
    });
  });

  it("should trim whitespace when editing", () => {
    const trimmedTitle = `Updated Todo ${Date.now()}`;
    const titleWithWhitespace = `  ${trimmedTitle}  `;

    // Click edit button
    cy.get("button").contains("Edit").first().click();

    // Scope to the edit form
    cy.get("div.bg-card").contains("Save").parent().parent().within(() => {
      // Update with whitespace
      cy.get('input[id="title"]').clear().type(titleWithWhitespace);

      // Save changes
      cy.get("button").contains("Save").click();
    });

    // Wait for trimmed title to appear in list (more reliable than waiting for toast)
    cy.contains(trimmedTitle, { timeout: 1000 }).should("be.visible");
  });

  it("should allow editing multiple todos independently", () => {
    // Create second todo
    const todo2 = `Todo 2 ${Date.now()}`;
    cy.get('input[id="title"]').type(todo2);
    cy.get('button[type="submit"]').contains("Add Todo").click();
    cy.contains(todo2, { timeout: 1000 }).should("be.visible");

    // Get all todo items (they are in div.bg-card containers)
    // The newest todo (todo2) appears first, the oldest (from beforeEach) appears last
    cy.get("div.space-y-3").within(() => {
      // Edit first todo (created in beforeEach, appears last due to desc order)
      cy.get("div.bg-card").last().within(() => {
        cy.get("button").contains("Edit").click();
        // Wait for edit form to appear
        cy.get("button").contains("Save", { timeout: 1000 }).should(
          "be.visible",
        );
        // Now edit the form
        cy.get('input[id="title"]').clear().type("First Todo Updated");
        cy.get("button").contains("Save").click();
      });
    });

    cy.contains("First Todo Updated", { timeout: 1000 }).should("be.visible");

    // Edit second todo (todo2, appears first due to desc order)
    cy.get("div.space-y-3").within(() => {
      cy.get("div.bg-card").first().within(() => {
        cy.get("button").contains("Edit").click();
        // Wait for edit form to appear
        cy.get("button").contains("Save", { timeout: 1000 }).should(
          "be.visible",
        );
        // Now edit the form
        cy.get('input[id="title"]').clear().type("Second Todo Updated");
        cy.get("button").contains("Save").click();
      });
    });

    cy.contains("Second Todo Updated", { timeout: 1000 }).should("be.visible");

    // Verify both todos are updated
    cy.contains("First Todo Updated").should("be.visible");
    cy.contains("Second Todo Updated").should("be.visible");
  });
});
