import React, { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import { BrowserRouter } from "react-router-dom";
import { useKeycloak } from "@react-keycloak/web";
import ProtectedRoute from "./Components/ProtectedRoute.tsx";
import Form from "./Screens/Form/Form.tsx";
import Gallery from "./Screens/Gallery/Gallery.tsx";
import Profile from "./Screens/Profile/Profile.tsx";
import PasswordReset from "./Screens/PasswordReset/PasswordReset.tsx";
import Header from "./Components/Header.tsx";
import { CssBaseline, Box, useMediaQuery, Toolbar } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
const ScaleWrapper = ({ children }) => {
  const isSmallHeight = useMediaQuery("(max-height:800px)");

  return (
    <Box
      sx={{
        transform: isSmallHeight ? "scale(0.80)" : "scale(1)",
        transformOrigin: "top center",
        width: "100%",
      }}
    >
      {children}
    </Box>
  );
};

const App = () => {
  const { keycloak, initialized } = useKeycloak();

  useEffect(() => {
    if (keycloak?.authenticated) {
      const interval = setInterval(() => {
        keycloak.updateToken(60).catch(() => keycloak.logout());
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [keycloak]);

  if (!initialized)
    return (
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "#f7f7f7",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span style={{ fontWeight: 20, fontFamily: "sans-serif" }}>
          Laddar...
        </span>
        <CircularProgress size={24} />
      </Box>
    );
  if (!keycloak.authenticated)
    return (
      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "#f7f7f7",
          display: "flex",
          alignContent: "center",
        }}
      >
        <span style={{ fontWeight: 20, fontFamily: "sans-serif" }}>
          Omdirigerar till inloggning...
        </span>
        <CircularProgress size={24} />
      </Box>
    );

  return (
    <>
      <CssBaseline />
      <Header />
      {/* Den här fyller ut plats för AppBar så att innehållet inte hamnar under */}

      <Box
        sx={{
          minHeight: "100vh",
          backgroundColor: "#f7f7f7",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <ScaleWrapper>
          <Box
            sx={{
              // paddingTop: "64px",
              // paddingBottom: "32px" ,
              flex: 1, //  fyll ut höjden
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Routes>
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Form />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/Gallery"
                element={
                  <ProtectedRoute>
                    <Gallery />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/Profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/PasswordReset"
                element={
                  <ProtectedRoute>
                    <PasswordReset />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </Box>
        </ScaleWrapper>
      </Box>
    </>
  );
};

export default App;
