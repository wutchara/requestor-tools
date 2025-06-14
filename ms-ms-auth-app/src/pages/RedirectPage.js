import React, { useState, useEffect } from "react";
import { Box, CircularProgress, Typography } from "@mui/material";
import { MS_CLIENT_ID, MS_TENANT_ID, REDIRECT_URI } from "../config";
import { setCookie } from "../utils/cookieUtils";

export default function RedirectPage() {
  const [message, setMessage] = useState("Authenticating, please wait...");

  useEffect(() => {
    const exchangeCodeForToken = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const error = params.get("error");

      if (error) {
        setMessage(`Error during login: ${params.get("error_description")}`);
        return;
      }

      if (!code) {
        setMessage("No authorization code found. Please try logging in again.");
        return;
      }

      const verifier = sessionStorage.getItem("pkceVerifier");
      if (!verifier) {
        setMessage("Code verifier not found. Your session may have expired.");
        return;
      }

      try {
        const tokenResponse = await fetch(
          `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/token`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              client_id: MS_CLIENT_ID,
              // Ensure this scope matches the one requested in MainPage.js for OBO flow
              scope: `openid profile User.Read offline_access api://botid-${MS_CLIENT_ID}/access_as_user`,
              code: code,
              redirect_uri: REDIRECT_URI,
              grant_type: "authorization_code",
              code_verifier: verifier,
            }),
          }
        );

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
          throw new Error(tokenData.error_description || "Failed to get token");
        }

        const profileResponse = await fetch(
          "https://graph.microsoft.com/v1.0/me",
          {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
          }
        );

        const profileData = await profileResponse.json();
        if (!profileResponse.ok) {
          throw new Error(
            profileData.error?.message || "Failed to get user profile"
          );
        }

        setCookie("msAccessToken", tokenData.access_token, 1);
        setCookie("userProfile", JSON.stringify(profileData), 1);
        if (tokenData.refresh_token) {
          // Store the refresh token. Consider HttpOnly cookies for better security in a real app.
          setCookie("msRefreshToken", tokenData.refresh_token, 30); // Refresh tokens typically have longer expiry
        }

        setMessage(
          "Success! You are now logged in. This window will close shortly."
        );
        window.close(); // Close the popup
      } catch (err) {
        console.error("Token exchange failed:", err);
        setMessage(`Authentication failed: ${err.message}`);
        sessionStorage.removeItem("pkceVerifier");
      }
    };

    exchangeCodeForToken();
  }, []);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        p: 2,
      }}
    >
      <CircularProgress color="primary" size={64} sx={{ mb: 2 }} />
      <Typography>{message}</Typography>
    </Box>
  );
}
