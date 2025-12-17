import React from "react";
import { Box, useTheme } from "@mui/material";

type PageContainerProps = {
  children: React.ReactNode;
};

export default function PageContainer({ children }: PageContainerProps) {
  const theme = useTheme();

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        // ❌ ta bort alignItems och justifyContent
        // alignItems: "center",
        // justifyContent: "center",
        pt: "64px", // för att inte hamna under headern
        pb: 2,
        px: { xs: 1, sm: 3 },
        backgroundColor: "#f7f7f7",
      }}
    >
      {/* Spacer motsvarande AppBar-höjden */}
      <Box sx={theme.mixins.toolbar} />

      {/* Själva sidinnehållet */}
      {children}
    </Box>
  );
}
