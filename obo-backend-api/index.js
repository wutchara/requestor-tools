require("dotenv").config();
const express = require("express");
const cors = require("cors");
// If using Node.js v18+, global.fetch is available, and 'node-fetch' is not required.

const app = express();
app.use(cors()); // Enable CORS for your frontend to call this API
app.use(express.json());

const PORT = process.env.PORT || 3001;
const TENANT_ID = process.env.TENANT_ID;
const MIDDLE_TIER_CLIENT_ID = process.env.MIDDLE_TIER_CLIENT_ID;
const MIDDLE_TIER_CLIENT_SECRET = process.env.MIDDLE_TIER_CLIENT_SECRET;
const DOWNSTREAM_API_SCOPE = process.env.DOWNSTREAM_API_SCOPE;

console.log("TENANT_ID:", TENANT_ID);
console.log("MIDDLE_TIER_CLIENT_ID:", MIDDLE_TIER_CLIENT_ID);
console.log("DOWNSTREAM_API_SCOPE:", DOWNSTREAM_API_SCOPE);

// Endpoint to be called by the frontend
app.get("/api/obo-graph-profile", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Unauthorized: No Bearer token provided." });
  }
  const frontendAccessToken = authHeader.split(" ")[1];

  if (
    !MIDDLE_TIER_CLIENT_ID ||
    !MIDDLE_TIER_CLIENT_SECRET ||
    !TENANT_ID ||
    !DOWNSTREAM_API_SCOPE
  ) {
    console.error("Missing OBO configuration in backend .env file.");
    return res
      .status(500)
      .json({ error: "Server configuration error for OBO flow." });
  }

  try {
    // 1. Exchange frontendAccessToken for a token to call the downstream API (Graph)
    const oboTokenRequestBody = new URLSearchParams();
    oboTokenRequestBody.append("client_id", MIDDLE_TIER_CLIENT_ID);
    oboTokenRequestBody.append("client_secret", MIDDLE_TIER_CLIENT_SECRET);
    oboTokenRequestBody.append(
      "grant_type",
      "urn:ietf:params:oauth:grant-type:jwt-bearer"
    );
    oboTokenRequestBody.append("assertion", frontendAccessToken);
    oboTokenRequestBody.append("scope", DOWNSTREAM_API_SCOPE);
    oboTokenRequestBody.append("requested_token_use", "on_behalf_of");

    const tokenEndpoint = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`;

    const oboTokenResponse = await fetch(tokenEndpoint, {
      method: "POST",
      body: oboTokenRequestBody,
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const oboTokenData = await oboTokenResponse.json();

    if (!oboTokenResponse.ok) {
      console.error("OBO Token Exchange Error:", oboTokenData);
      return res.status(oboTokenResponse.status).json({
        error: "Failed to obtain OBO token",
        details:
          oboTokenData.error_description ||
          oboTokenData.error ||
          "Unknown OBO error",
      });
    }

    const downstreamAccessToken = oboTokenData.access_token;

    // 2. Use the downstreamAccessToken to call Microsoft Graph API
    const graphResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${downstreamAccessToken}`,
      },
    });

    const graphData = await graphResponse.json();

    if (!graphResponse.ok) {
      console.error("Microsoft Graph API Error:", graphData);
      return res.status(graphResponse.status).json({
        error: "Failed to fetch data from Microsoft Graph",
        details: graphData.error?.message || "Unknown Graph API error",
      });
    }

    res.json({
      message: "Successfully called Graph API using OBO flow.",
      graphProfile: graphData,
      oboTokenDetails: {
        // For demonstration; don't expose sensitive token details in prod
        scopes: oboTokenData.scope,
        expires_in: oboTokenData.expires_in,
      },
    });
  } catch (error) {
    console.error("OBO Flow Error:", error);
    res.status(500).json({
      error: "Internal server error during OBO flow.",
      details: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`OBO Backend API listening on port ${PORT}`);
  console.log(
    `Ensure your frontend's REACT_APP_OBO_API_ENDPOINT is set to http://localhost:${PORT}/api/obo-graph-profile`
  );
});
