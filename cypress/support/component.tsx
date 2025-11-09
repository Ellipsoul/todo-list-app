// ***********************************************************
// This example support/component.tsx is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

// Import global styles
import "../../app/globals.css";

// Prevent Cypress from failing on uncaught exceptions
Cypress.on("uncaught:exception", (err, runnable) => {
  // returning false here prevents Cypress from failing the test
  // You may want to handle specific errors differently
  if (err.message.includes("ResizeObserver loop limit exceeded")) {
    return false;
  }
  return true;
});

