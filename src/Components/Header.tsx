import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@mui/material";
import {
  Stack,
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
} from "@mui/material";
import AccountCircle from "@mui/icons-material/AccountCircle";
import { useState } from "react";
import { useLocation } from "react-router-dom";
import keycloak from "../keycloak.ts";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

export default function Header() {
  const navigate = useNavigate();

  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleForm = () => {
    navigate("/");
  };

  const handleGallery = () => {
    navigate("/Gallery");
  };

  const handleProfile = () => {
    navigate("/Profile");
  };

  const location = useLocation();

  const isAuthenticated = keycloak.authenticated;
  const handleChangePassword = () => {
    navigate("/PasswordReset");
  };

  const handleLogout = async () => {
    try {
      await keycloak.logout();
    } catch (error) {
      console.error("Fel vid utloggning:", error);
      setLogoutError("Ett fel uppstod vid utloggning. Försök igen.");
    }
  };

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };
  const handleClose = () => {
    setAnchorEl(null);
  };

  return (
    <AppBar position="fixed" sx={{ backgroundColor: "white", display: "flex" }}>
      <Toolbar
        sx={{
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          px: { xs: 1, sm: 2, md: 3 },
          py: { xs: 0.5, sm: 1 },
        }}
      >
        {/* Vänster: Logo + text */}
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography
            variant="h5"
            sx={{
              fontWeight: "bold",
              color: "#0277bd",
              letterSpacing: 1,
              fontSize: { xs: "1rem", sm: "1.4rem", md: "1.8rem" },
            }}
          >
            Sigge
          </Typography>
          <Box
            component="img"
            src="/mLogo.png"
            sx={{
              width: { xs: 20, sm: 30, md: 40 },
              height: { xs: 20, sm: 30, md: 40 },
            }}
          />
        </Stack>

        {/* Höger: Menyknappar + ikon */}
        <Stack direction="row" alignItems="center" spacing={{ xs: 1, sm: 2 }}>
          {isAuthenticated && (
            <>
              <Button
                onClick={handleForm}
                sx={{
                  fontSize: { xs: "0.7rem", sm: "0.9rem" },
                  padding: { xs: "2px 6px", sm: "6px 12px" },
                  fontWeight: location.pathname === "/" ? "bold" : "normal",
                  color: "#0277bd",
                }}
              >
                Redovisa kvitto
              </Button>
              <Button
                onClick={handleGallery}
                sx={{
                  fontSize: { xs: "0.7rem", sm: "0.9rem" },
                  padding: { xs: "2px 6px", sm: "6px 12px" },
                  fontWeight:
                    location.pathname === "/Gallery" ? "bold" : "normal",
                  color: "#0277bd",
                }}
              >
                Historik
              </Button>
              <IconButton
                size="large"
                onClick={handleClick}
                sx={{
                  color: "#0277bd",
                  p: { xs: 0.5, sm: 1 },
                }}
              >
                <AccountCircle sx={{ fontSize: { xs: 28, sm: 36, md: 40 } }} />
              </IconButton>
            </>
          )}
        </Stack>
      </Toolbar>

      <Menu
        id="profile-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        anchorOrigin={{
          vertical: "bottom",
          horizontal: "right",
        }}
        transformOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <MenuItem
          onClick={() => {
            handleClose();
            handleProfile();
          }}
        >
          Profil
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleClose();
            handleChangePassword();
          }}
        >
          Ändra lösenord
        </MenuItem>
        <MenuItem
          onClick={() => {
            handleClose();
            handleLogout();
          }}
        >
          Logga ut
        </MenuItem>
      </Menu>

      <Snackbar
        open={!!logoutError}
        autoHideDuration={5000}
        onClose={() => setLogoutError(null)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert
          onClose={() => setLogoutError(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {logoutError}
        </Alert>
      </Snackbar>
    </AppBar>
  );
}
