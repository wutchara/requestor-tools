import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Avatar,
  Alert,
} from "@mui/material"; // Removed Link as it's not used
import {
  MS_CLIENT_ID,
  MS_TENANT_ID,
  REDIRECT_URI,
  OBO_API_ENDPOINT,
} from "../config";
import { getCookie, deleteCookie } from "../utils/cookieUtils";
import {
  generateCodeVerifier,
  generateCodeChallenge,
} from "../utils/pkceUtils";
import OboButton from "../components/OboButton"; // Keep this import
import SignInButton from "../components/SignInButton"; // Add this import

export default function MainPage() {
  const [userProfile, setUserProfile] = useState(null);
  const [error, setError] = useState(null);
  const [oboApiResponse, setOboApiResponse] = useState(null);
  const [oboApiError, setOboApiError] = useState(null);

  useEffect(() => {
    const profileFromCookie = getCookie("userProfile");
    if (profileFromCookie) {
      try {
        setUserProfile(JSON.parse(profileFromCookie));
      } catch (e) {
        console.error("Failed to parse user profile from cookie", e);
        deleteCookie("userProfile");
        deleteCookie("msAccessToken");
      }
    }
  }, []);

  const handleSignIn = async () => {
    setError(null);
    if (
      MS_CLIENT_ID === "YOUR_CLIENT_ID_HERE" || // Keep this check or use environment variables
      MS_TENANT_ID === "YOUR_TENANT_ID_HERE"
    ) {
      setError("Please configure your Client ID and Tenant ID.");
      return;
    }
    try {
      const verifier = generateCodeVerifier();
      const challenge = await generateCodeChallenge(verifier);
      sessionStorage.setItem("pkceVerifier", verifier);

      const authUrl =
        `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/authorize?` + // The scope now needs to include the permission for your middle-tier API
        `client_id=${MS_CLIENT_ID}` +
        `&response_type=code` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_mode=query` +
        // Replace <YOUR_OBO_MIDDLETIER_API_CLIENT_ID> with the actual client ID of your "OBO MiddleTier API"
        `&scope=${encodeURIComponent(
          `openid profile User.Read offline_access api://botid-${MS_CLIENT_ID}/access_as_user`
        )}` +
        `&code_challenge=${challenge}` +
        `&code_challenge_method=S256`;

      // const authUrl =
      // `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0/authorize?` +
      // `client_id=${MS_CLIENT_ID}` +
      // `&response_type=code` +
      // `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
      // `&response_mode=query` +
      // `&scope=openid%20profile%20User.Read` +
      // `&code_challenge=${challenge}` +
      // `&code_challenge_method=S256`;

      const popup = window.open(
        authUrl,
        "microsoft-signin",
        "width=500,height=600"
      );

      const timer = setInterval(() => {
        if (popup.closed) {
          clearInterval(timer);
          const profile = getCookie("userProfile");
          if (profile) {
            window.location.reload();
          }
        }
      }, 1000);
    } catch (err) {
      console.error("Sign-in error", err);
      setError(
        "Could not initiate sign-in. Please check the console for details."
      );
    }
  };

  const handleSignOut = () => {
    deleteCookie("userProfile");
    deleteCookie("msAccessToken");
    deleteCookie("msRefreshToken");
    sessionStorage.removeItem("pkceVerifier");
    setUserProfile(null);
    setError(null);
    const logoutUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/logout?post_logout_redirect_uri=${encodeURIComponent(
      window.location.origin
    )}`;
    window.location.href = logoutUrl;
  };

  const handleOboFlowClick = async () => {
    setOboApiResponse(null);
    setOboApiError(null);
    setError(null); // Clear main error

    const accessToken = getCookie("msAccessToken");

    if (!accessToken) {
      setOboApiError("No access token found. Please sign in again.");
      return;
    }

    if (
      !OBO_API_ENDPOINT ||
      OBO_API_ENDPOINT === "http://localhost:7071/api/your-obo-function"
    ) {
      setOboApiError(
        "OBO API endpoint is not configured. Please check your .env file and src/config.js."
      );
      console.warn(
        "OBO_API_ENDPOINT is not configured or is set to the default placeholder."
      );
      return;
    }

    try {
      const response = await fetch(OBO_API_ENDPOINT, {
        method: "GET", // Or POST, depending on your API
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            `API request failed with status ${response.status}`
        );
      }
      setOboApiResponse(JSON.stringify(data, null, 2));
    } catch (err) {
      console.error("OBO API call error:", err);
      setOboApiError(`OBO API call failed: ${err.message}`);
    }
  };

  return (
    <Container
      component="main"
      maxWidth="sm"
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: 4,
      }}
    >
      <Paper
        elevation={12}
        sx={{
          p: { xs: 3, sm: 4 },
          textAlign: "center",
          width: "100%",
          borderRadius: "1rem",
        }}
      >
        <Typography
          variant="h1"
          component="h1"
          sx={{ mb: 1, fontSize: { xs: "2.25rem", sm: "2.5rem" } }}
        >
          React MS-Auth
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 4 }}>
          OAuth 2.0 Auth Code Flow + PKCE
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {userProfile ? (
          <Box>
            <Avatar
              src="https://placehold.co/100x100/1e293b/94a3b8?text=User"
              alt={userProfile.displayName}
              sx={{
                width: 96,
                height: 96,
                mx: "auto",
                mb: 2,
                border: "4px solid",
                borderColor: "grey.700",
              }}
            />
            <Typography
              variant="h5"
              component="h2"
              fontWeight="semibold"
              sx={{ fontSize: { xs: "1.25rem", sm: "1.5rem" } }}
            >
              {userProfile.displayName}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
              {userProfile.mail || userProfile.userPrincipalName}
            </Typography>
            <Button
              onClick={handleSignOut}
              variant="contained"
              color="error"
              fullWidth
              sx={{ py: 1.5 }}
            >
              Sign Out
            </Button>
            <OboButton onClick={handleOboFlowClick} />
          </Box>
        ) : (
          <Box>
            <Typography color="text.primary" sx={{ mb: 3 }}>
              Click the button below to sign in using your Microsoft account.
            </Typography>
            <SignInButton onClick={handleSignIn} />
          </Box>
        )}
      </Paper>

      {oboApiResponse && (
        <Paper
          elevation={3}
          sx={{ p: 2, mt: 3, width: "100%", bgcolor: "success.dark" }}
        >
          <Typography variant="h6" gutterBottom>
            OBO API Response:
          </Typography>
          <Box
            component="pre"
            sx={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              maxHeight: "300px",
              overflowY: "auto",
            }}
          >
            {oboApiResponse}
          </Box>
        </Paper>
      )}
      {oboApiError && (
        <Alert severity="warning" sx={{ mt: 3, width: "100%" }}>
          {oboApiError}
        </Alert>
      )}

      <Box component="footer" sx={{ mt: 4, textAlign: "center" }}>
        <Typography variant="caption" color="text.secondary">
          This is a demo application. Do not use for production without further
          security hardening.
        </Typography>
      </Box>
    </Container>
  );
}
