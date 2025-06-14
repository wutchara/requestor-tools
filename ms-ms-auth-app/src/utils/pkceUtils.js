// --- PKCE Helper Functions ---
// PKCE (Proof Key for Code Exchange) is a security extension to the OAuth 2.0 flow.
// It prevents authorization code interception attacks.

// Generates a cryptographically random string.
export const generateCodeVerifier = () => {
  const randomBytes = new Uint8Array(32);
  window.crypto.getRandomValues(randomBytes);
  return window
    .btoa(String.fromCharCode(...randomBytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

// Hashes the verifier using SHA-256 and base64-url-encodes it to create the challenge.
export const generateCodeChallenge = async (verifier) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await window.crypto.subtle.digest("SHA-256", data);
  return window
    .btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};
