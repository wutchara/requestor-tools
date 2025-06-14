import React from "react";
import { Button } from "@mui/material";

const OboButton = ({ onClick }) => {
  return (
    <Button
      onClick={onClick}
      variant="outlined"
      color="secondary" // Or another color from your theme
      fullWidth
      sx={{ py: 1.5, mt: 2 }} // Add margin top
    >
      Call API (OBO Flow)
    </Button>
  );
};

export default OboButton;
