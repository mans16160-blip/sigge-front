import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Stack,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
} from "@mui/material";
import url from "./../../url.ts";

export default function LoginScreen() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = username.trim();
    const trimmedPassword = password.trim();

    fetch(`${url}/users/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: trimmedUsername,
        password: trimmedPassword,
      }),
    })
      .then((response) => {
        return response.json().then((data) => {
          if (!response.ok || data.error) {
            throw new Error(data.error || "Login failed");
          }
          return data;
        });
      })
      .then((data) => {
        navigate("/Form"); //för att fetmarkera, skapa ny förstasida här istället?
      })
      .catch((error) => {
        console.error("Error:", error);
        setError(error.message);
        setTimeout(() => setError(""), 5000);
      });
  };

  return (
    <Box
      sx={{
        minHeight: "80vh",
        Width: "80vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        boxSizing: "border-box",
        overflow: "hidden",
        p: { xs: 2, sm: 3 }, // lite padding på små skärmar
      }}
    >
      <Stack
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          p: 2,
          flexDirection: "column",
          //marginTop: 10,
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontFamily: "Raleway, sans-serif",
            fontWeight: 700,
            //mt: 5,
            mb: 5,
          }}
        >
          Välkommen till SiggeM
        </Typography>

        <Typography
          variant="h6"
          sx={{
            fontFamily: "Raleway, sans-serif",
            fontWeight: 400,
            mb: 4,
          }}
        >
          Logga in för att registrera kvitton eller se din historik
        </Typography>

        <Paper
          elevation={4}
          sx={{
            width: "80%",
            maxWidth: 400,
            p: 4,
            borderRadius: 3,
          }}
        >
          <Typography
            variant="h5"
            fontWeight="bold"
            gutterBottom
            textAlign="center"
          >
            Logga in
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            component="form"
            onSubmit={handleSubmit}
            display="flex"
            flexDirection="column"
            gap={2}
          >
            <TextField
              label="Användarnamn"
              variant="outlined"
              fullWidth
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <TextField
              label="Lösenord"
              variant="outlined"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              size="large"
              sx={{
                borderRadius: "999px",
                backgroundColor: "#0277bd",
                "&:hover": {
                  backgroundColor: "#01579b",
                },
              }}
            >
              Logga in
            </Button>
          </Box>
        </Paper>
      </Stack>
    </Box>
  );
}
