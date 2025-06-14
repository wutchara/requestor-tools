// IMPORTANT: Replace these values with the ones from your Microsoft Entra app registration.
// These values are now sourced from your .env file (or environment variables in deployment)
// Remember to prefix browser-accessible environment variables with REACT_APP_

export const MS_CLIENT_ID = process.env.REACT_APP_MS_CLIENT_ID;
export const MS_TENANT_ID = process.env.REACT_APP_MS_TENANT_ID; // or 'common' for multi-tenant/personal accounts
export const REDIRECT_URI = process.env.REACT_APP_REDIRECT_URI;
export const OBO_API_ENDPOINT = process.env.REACT_APP_OBO_API_ENDPOINT;

// Optional: Add checks or fallbacks if needed, though CRA usually handles this well.
// if (!MS_CLIENT_ID || !MS_TENANT_ID || !REDIRECT_URI) {
//   console.error("One or more environment variables (REACT_APP_MS_CLIENT_ID, REACT_APP_MS_TENANT_ID, REACT_APP_REDIRECT_URI) are not set. Please check your .env file or environment configuration.");
//   // You might want to throw an error or display a message to the user here
// }
