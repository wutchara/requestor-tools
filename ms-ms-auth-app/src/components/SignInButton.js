import React from "react";
import { Button } from "@mui/material";
import MicrosoftIcon from "./MicrosoftIcon"; // Import the icon

const SignInButton = ({ onClick }) => {
  return (
    <Button
      onClick={onClick}
      variant="contained"
      color="primary"
      fullWidth
      startIcon={<MicrosoftIcon style={{ width: 24, height: 24 }} />}
      sx={{ py: 1.5, justifyContent: "center" }}
    >
      <span>Sign In with Microsoft</span>
    </Button>
  );
};

export default SignInButton;
