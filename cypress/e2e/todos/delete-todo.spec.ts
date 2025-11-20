describe("Delete Todo", () => {
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

  it("should show confirmation dialog when delete button is clicked", () => {
    // Stub the confirm dialog to return true
    cy.window().then((win) => {
      cy.stub(win, "confirm").returns(true);
    });

    // Click delete button
    cy.get("button").contains("Delete").first().click();

    // Verify confirmation was called
    cy.window().its("confirm").should("have.been.called");
  });

  it("should delete todo when confirmed", () => {
    // Get the todo title before deletion
    cy.get("h3").first().then(($title) => {
      const todoTitle = $title.text();

      // Stub confirm to return true
      cy.window().then((win) => {
        cy.stub(win, "confirm").returns(true);
      });

      // Click delete button
      cy.get("button").contains("Delete").first().click();

      // Wait for todo to be removed from list (more reliable than waiting for toast)
      cy.contains(todoTitle, { timeout: 1000 }).should("not.exist");
    });
  });

  it("should not delete todo when confirmation is cancelled", () => {
    // Get the todo title
    cy.get("h3").first().then(($title) => {
      const todoTitle = $title.text();

      // Stub confirm to return false (cancelled)
      cy.window().then((win) => {
        cy.stub(win, "confirm").returns(false);
      });

      // Click delete button
      cy.get("button").contains("Delete").first().click();

      // Verify todo is still in list
      cy.contains(todoTitle, { timeout: 1000 }).should("be.visible");
    });
  });

  it("should delete multiple todos independently", () => {
    // Create second todo
    const todo2 = `Todo 2 ${Date.now()}`;
    cy.get('input[id="title"]').type(todo2);
    cy.get('button[type="submit"]').contains("Add Todo").click();
    cy.contains(todo2, { timeout: 1000 }).should("be.visible");

    // Get both todo titles
    cy.get("h3").then(($titles) => {
      const firstTitle = $titles.eq(0).text();
      const secondTitle = $titles.eq(1).text();

      // Delete first todo
      cy.window().then((win) => {
        // Restore confirm if it exists and is a stub
        const confirmFn = win.confirm as (() => boolean) & {
          restore?: () => void;
        };
        if (confirmFn && typeof confirmFn.restore === "function") {
          confirmFn.restore();
        }
        cy.stub(win, "confirm").returns(true);
      });
      cy.get("button").contains("Delete").first().click();
      cy.contains(firstTitle, { timeout: 1000 }).should("not.exist");

      // Verify second still exists
      cy.contains(secondTitle).should("be.visible");

      // Wait a bit for cleanup
      cy.wait(1000);

      // Delete second todo - restore the stub first
      cy.window().then((win) => {
        // Restore confirm if it exists and is a stub
        const confirmFn = win.confirm as (() => boolean) & {
          restore?: () => void;
        };
        if (confirmFn && typeof confirmFn.restore === "function") {
          confirmFn.restore();
        }
        cy.stub(win, "confirm").returns(true);
      });
      cy.get("button").contains("Delete").first().click();
      cy.contains(secondTitle, { timeout: 1000 }).should("not.exist");

      // Verify both are deleted
      cy.contains(firstTitle).should("not.exist");
      cy.contains(secondTitle).should("not.exist");

      // Verify empty state is shown
      cy.contains("No todos yet. Create your first todo above!", {
        timeout: 1000,
      }).should("be.visible");
    });
  });

  it("should show empty state after deleting all todos", () => {
    // Stub confirm to return true
    cy.window().then((win) => {
      cy.stub(win, "confirm").returns(true);
    });

    // Delete the todo
    cy.get("button").contains("Delete").first().click();

    // Verify empty state message appears (more reliable than waiting for toast)
    cy.contains("No todos yet. Create your first todo above!", {
      timeout: 1000,
    }).should("be.visible");
  });
});
