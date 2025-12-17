import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Divider,
  Stack,
  CircularProgress,
} from "@mui/material";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import PageContainer from "../../Components/PageContainer.tsx";
import url from "./../../url.ts";
import keycloak from "./../../keycloak.ts";

type Report = {
  report_id: string;
  total: number;
  creation_date: string;
};

export default function Profile() {
  const username = keycloak.tokenParsed?.preferred_username;
  const email = keycloak.tokenParsed?.email || `${username}@example.com`;
  const token = keycloak.token;

  const [receipts, setReceipts] = useState<Report[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!username || !token) return;
    const userId = keycloak.tokenParsed?.sub;
    fetch(`${url}/receipt/user/${userId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setReceipts(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Fel vid hämtning av rapporter:", err);
        setLoading(false);
      });
  }, [username, token]);

  const totalReceipts = receipts.length;
  const totalSum = receipts.reduce((sum, r) => sum + (r.total || 0), 0);
  const formatDate = (date: Date) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const latestDate = receipts
    .map((r) => new Date(r.creation_date))
    .sort((a, b) => b.getTime() - a.getTime())[0];

  const formattedDate = latestDate ? formatDate(latestDate) : "–";

  return (
    <PageContainer>
      <Box
        sx={{
          //minHeight: "100%",
          //px: { xs: 2, sm: 3 }, // <-- lägger till padding på små skärmar
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: 4,
          //boxSizing: "border-box",
          //overflow: "hidden",
        }}
      >
        <Box
          sx={{
            backgroundColor: "white",
            padding: 4,
            borderRadius: 2,
            boxShadow: 3,
            width: "auto",
            //maxWidth: { xs: "auto", md: "80vh" },
            height: "auto", //{ xs: "auto", md: "70vh" },
            //overflow: "hidden",
          }}
        >
          <Stack alignItems="center">
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <AccountCircleIcon
                sx={{
                  width: 80,
                  height: 80,
                  color: "#0277bd",
                  mb: 6, // Stort mellanrum under ikon
                }}
              />

              <Typography
                variant="h5"
                mb={3}
                sx={{
                  //overflowWrap: "anywhere",
                  //wordBreak: "break-word",
                  fontSize: { xs: "1rem", sm: "1.25rem", md: "1.5rem" }, // mindre på xs
                }}
              >
                Användarnamn:&nbsp;{username}
              </Typography>

              <Typography
                variant="body1"
                color="text.secondary"
                mb={1}
                sx={{
                  fontSize: { xs: "1.2rem", md: "1.4rem" }, // mindre på xs
                }}
              >
                Email:&nbsp;{email}
              </Typography>
            </Box>

            <Divider sx={{ width: "100%", padding: 2 }} />

            {/* Statistikdel  */}
            <Box sx={{ width: "100%" }}>
              <Typography
                variant="h5"
                marginTop={2}
                marginBottom={4}
                fontWeight={"bold"}
                sx={{
                  fontSize: { xs: "1.2rem", md: "1.4rem" }, // mindre på xs
                }}
              >
                Din statistik
              </Typography>

              {loading ? (
                <CircularProgress size={24} />
              ) : (
                <>
                  <Typography
                    variant="body2"
                    marginBottom={3}
                    sx={{
                      fontSize: { xs: "1rem", md: "1.25rem" }, // mindre på xs
                    }}
                  >
                    <Box component="span" fontWeight="bold">
                      Antal rapporterade kvitton:
                    </Box>{" "}
                    {totalReceipts} st
                  </Typography>

                  {/* 
                <Typography variant="body2" marginBottom={2} fontSize={18}>
                  <Box component="span" fontWeight="bold">
                    Total rapporterad summa:
                  </Box>{" "}
                  {totalSum.toLocaleString("sv-SE")} kr
                </Typography> 
                */}

                  <Typography
                    variant="body2"
                    sx={{
                      //overflowWrap: "anywhere",
                      //wordBreak: "break-word",
                      fontSize: { xs: "1rem", md: "1.25rem" }, // mindre på xs
                    }}
                  >
                    <Box component="span" fontWeight="bold">
                      Senaste inlämningen gjord:
                    </Box>{" "}
                    {formattedDate}
                  </Typography>
                </>
              )}
            </Box>
          </Stack>
        </Box>
      </Box>
    </PageContainer>
  );
}
