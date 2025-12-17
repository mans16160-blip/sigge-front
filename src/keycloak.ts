import Keycloak from "keycloak-js";

function getEnvVar(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

const keycloak = new Keycloak({
  url: getEnvVar("REACT_APP_KEYCLOAK_URL"),
  realm: getEnvVar("REACT_APP_KEYCLOAK_REALM"),
  clientId: getEnvVar("REACT_APP_KEYCLOAK_CLIENT_ID"),
});

export default keycloak;
