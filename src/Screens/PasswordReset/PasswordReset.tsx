import React, { useState } from "react";
import { TextField, Button, Typography, Box, Alert } from "@mui/material";
import PageContainer from "../../Components/PageContainer.tsx";
import url from "./../../url.ts";
import keycloak from "./../../keycloak.ts";

export default function PasswordReset() {
  const [identifier, setIdentifier] = useState("");
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("idle");

    try {
      const response = await fetch(`${url}/user/reset-password`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ usernameOrEmail: identifier.trim() }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        throw new Error(data.error || "Something went wrong");
      }

      setStatus("success");
      setMessage(data.message);
    } catch (error: any) {
      setStatus("error");
      setMessage(error.message || "Failed to request password reset.");
    }
  };

  return (
    <PageContainer>
      <Box
        sx={{
          //height: "100%",
          //backgroundColor: 'blue',
          //px: { xs: 2, sm: 3 }, // <-- lägger till padding på små skärmar
          //width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          // boxSizing: "border-box", // detta gör att padding räknas in i höjden
          //overflow: "hidden", // för att ta bort scroll
        }}
      >
        <Box
          sx={{
            backgroundColor: "white",
            padding: 4,
            borderRadius: 2,
            boxShadow: 3,
            width: "auto",
            //maxWidth: { xs: "auto", md: "50vh" },
            height: "auto",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center", // vertikalt centrerat
          }}
        >
          <Typography
            variant="h4"
            textAlign="center"
            marginBottom={3}
            sx={{
              fontSize: {
                xs: "1.5rem", // mobiler
                //sm: "2rem",    // små skärmar
                md: "2rem", // mellanstora
                //lg: "2rem",    // stora skärmar
              },
            }}
          >
            Ändra lösenord
          </Typography>

          <Typography
            variant="body2"
            textAlign="center"
            color="text.secondary"
            marginBottom={2}
          >
            Ange din mejladdress och klicka på knappen. <br /> Du får sedan ett
            mejl med en länk för att återställa lösenordet.
          </Typography>

          <form
            onSubmit={handleSubmit}
            style={{ width: "100%", marginTop: "16px" }}
          >
            <TextField
              label="Email"
              variant="outlined"
              fullWidth
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />

            <Box sx={{ display: "flex", justifyContent: "center" }}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                sx={{
                  mt: 2,
                  borderRadius: "999px",
                  //width: "30%",
                  px: 3, // extra sidopadding
                  whiteSpace: "nowrap", // förhindra radbrytning
                }}
              >
                SKICKA LÄNK
              </Button>
            </Box>
          </form>

          {status === "success" && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {message}
            </Alert>
          )}
          {status === "error" && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {message}
            </Alert>
          )}
        </Box>
      </Box>
    </PageContainer>
  );
}
