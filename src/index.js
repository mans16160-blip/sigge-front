import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ReactKeycloakProvider } from "@react-keycloak/web";
import keycloak from "./keycloak.ts";
import App from "./App";

const currentPath =
  window.location.pathname && window.location.pathname !== "/login"
    ? window.location.pathname
    : "/"; // se till att /login aldrig används

createRoot(document.getElementById("root")).render(
  <ReactKeycloakProvider
    authClient={keycloak}
    initOptions={{
      onLoad: "login-required",
      redirectUri: window.location.origin + currentPath,
    }}
  >
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ReactKeycloakProvider>,
);
