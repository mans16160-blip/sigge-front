import * as React from "react";
import { FaFile } from "react-icons/fa";
import { useEffect, useState, useRef } from "react";
import { svSE as locale } from "@mui/x-data-grid/locales";
import Form from "../Form/Form.tsx";
import {
  Box,
  Stack,
  TextField,
  IconButton,
  CircularProgress,
  Snackbar,
  Alert,
  Modal,
  
} from "@mui/material";

import {
  DataGrid,
  GridColDef,
  Toolbar,
  ToolbarButton,
  useGridApiRef,
  ColumnsPanelTrigger,
} from "@mui/x-data-grid";
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from "@mui/material";

import Tooltip from "@mui/material/Tooltip";
import CloseIcon from '@mui/icons-material/Close';
import ViewColumnIcon from "@mui/icons-material/ViewColumn";
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PageContainer from "../../Components/PageContainer.tsx";
import url from "./../../url.ts";
import keycloak from "./../../keycloak.ts";

type Receipt = {
  id: number;
  receipt_id: number;
  creation_date: string; // När kvittot skickades in
  receipt_date: string; // Själva köpedatumet
  user_name: string;
  tax: number;
  total: number;
  description: string;
};

type UserMap = { [key: string]: string };

function CustomToolbar() {
  return (
    <Toolbar>
      <Box sx={{ flex: 1, display: "flex", justifyContent: "flex-start" }}>
        <Tooltip title="Välj vilka kolumner som ska visas">
          <ColumnsPanelTrigger
            render={
              <ToolbarButton>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    fontSize: "0.875rem",
                    textTransform: "none",
                  }}
                >
                  <ViewColumnIcon fontSize="small" sx={{ mr: 0.5 }} />
                  Kolumner
                </Box>
              </ToolbarButton>
            }
          />
        </Tooltip>
      </Box>
    </Toolbar>
  );
}

// =========================
// Svensk översättning
// =========================
const LOCALE = "sv-SE";

function formatNumber(value: number | string) {
  if (typeof Intl !== "undefined" && Intl.NumberFormat) {
    try {
      const result = new Intl.NumberFormat(LOCALE).format(Number(value));
      return result === "NaN" ? String(value) : result;
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function paginationDisplayedRows({
  from,
  to,
  count,
  estimated,
}: {
  from: number;
  to: number;
  count: number;
  estimated?: number;
}) {
  if (!estimated) {
    return `${formatNumber(from)}–${formatNumber(to)} av ${
      count !== -1 ? formatNumber(count) : `mer än ${formatNumber(to)}`
    }`;
  }

  const estimatedLabel =
    estimated && estimated > to
      ? `ungefär ${formatNumber(estimated)}`
      : `mer än ${formatNumber(to)}`;

  return `${formatNumber(from)}–${formatNumber(to)} av ${
    count !== -1 ? formatNumber(count) : estimatedLabel
  }`;
}

const localeText = {
  ...locale.components.MuiDataGrid.defaultProps.localeText,
  footerPaginationRowsPerPage: "Rader per sida:",
  footerPaginationDisplayedRows: paginationDisplayedRows,
};

export default function Gallery() {
  const apiRef = useGridApiRef();
  const [columnVisibilityModel, setColumnVisibilityModel] = useState({});
  const gridHostRef = useRef<HTMLDivElement | null>(null);
  const [receiptData, setReceiptData] = useState<Receipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [loadingPdfIds, setLoadingPdfIds] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const roles = keycloak.tokenParsed?.realm_access?.roles || [];
  const isAdmin = roles.includes("admin");

  const fetchReceipts = async () => {
  const userId = keycloak.tokenParsed?.sub;
  const roles = keycloak.tokenParsed?.realm_access?.roles || [];
  const isAdmin = roles.includes("admin");

  const endpoint = isAdmin ? "/receipt" : `/receipt/user/${userId}`;

  try {
    const res = await fetch(`${url}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${keycloak.token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) throw new Error("Fel vid hämtning av kvitton");
    const data = await res.json();

    //console.log("📥 Backend skickar:", data); // 👈 Här ser du allt som kommer in


    const userIds = [...new Set(data.map((r: any) => r.user_id))];
    const userNameMap: UserMap = {};

    await Promise.all(
      userIds.map(async (uid: any) => {
        userNameMap[uid] = await fetchUserName(uid);
      }),
    );

  const transformed = data.map((item: any) => {
  //console.log("Company charge raw:", item.company_charge);

  return {
    id: item.receipt_id,
    receipt_id: item.receipt_id,
    creation_date: item.creation_date,
    receipt_date: item.receipt_date,
    user_name: userNameMap[item.user_id] || item.user_id,
    tax: item.tax,
    total: item.tax + item.net,
    description: item.description,
    company_card: item.company_card,
    charged_companies: item.company_charge?.map((c: any) => c.company_id) || [],

    represented: Array.isArray(item.represented)
      ? item.represented.map((r: any) => r.user_name) : [],
    other: item.other,
    image_links: Array.isArray(item.images) ? item.images : [],
  };
});

    const sortedReceipts = transformed.sort(
      (a, b) => b.receipt_id - a.receipt_id,
    );
    setReceiptData(sortedReceipts);
    setLoading(false);
  } catch (err) {
    console.error("Error loading receipts:", err);
    setFetchError(
      `Error loading receipts: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
    setLoading(false);
  }
};

const handleDelete = async (id: number) => {
    //if (!window.confirm("Är du säker på att du vill radera kvittot?")) return;

    try {
      const res = await fetch(`${url}/receipt/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
        },
      });

      if (res.ok) {
        setReceiptData((prev) => prev.filter((r) => r.id !== id));
      } else {
        console.error("Kunde inte radera kvitto");
      }
    } catch (err) {
      console.error("Fel vid radering:", err);
    }
  };

  const today = new Date().toISOString().split("T")[0];
  const getDefaultStartDate = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return thirtyDaysAgo.toISOString().split("T")[0]; // format: yyyy-mm-dd
  };

  const [startDate, setStartDate] = useState(getDefaultStartDate());
  const [endDate, setEndDate] = useState(today);

  const fetchUserName = async (userId: string): Promise<string> => {
    try {
      const response = await fetch(`${url}/user/${userId}`, {
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("User not found");
      const user = await response.json();
      return user.first_name;
    } catch (error) {
      console.warn("Could not fetch user name for", userId);
      return userId;
    }
  };
  const forceGridResize = () => {
    // Funka i v5/v6
    (apiRef.current as any)?.updateDimensions?.();
    // Fallback om metoden inte finns: trigga global resize
    window.dispatchEvent(new Event("resize"));
  };
  useEffect(() => {
    const id = requestAnimationFrame(forceGridResize);
    return () => cancelAnimationFrame(id);
  }, []);

  // Reagera på storleksändring av wrappen (inkl. indirekt från scale)
  useEffect(() => {
    if (!gridHostRef.current) return;
    const ro = new ResizeObserver(() => forceGridResize());
    ro.observe(gridHostRef.current);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
  fetchReceipts();
}, []);

  // Tvinga omräkning efter mount (efter att scale har applicerats)
  useEffect(() => {
    const id = requestAnimationFrame(forceGridResize);
    return () => cancelAnimationFrame(id);
  }, []);

  // Reagera på storleksändring av wrappen (inkl. indirekt från scale)
  useEffect(() => {
    if (!gridHostRef.current) return;
    const ro = new ResizeObserver(() => forceGridResize());
    ro.observe(gridHostRef.current);
    return () => ro.disconnect();
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  const highlightText = (text: string, query: string) => {
    if (!query) return text;
    const safeText = String(text ?? ""); // garanterar att det är en sträng
    const parts = safeText.split(new RegExp(`(${query})`, "gi"));
    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <mark key={i}>{part}</mark>
          ) : (
            <span key={i}>{part}</span>
          ),
        )}
      </>
    );
  };
  const filteredReceipts = receiptData.filter((item) => {
    const values = Object.values(item).join(" ").toLowerCase();
    const matchesSearch = values.includes(searchTerm.toLowerCase());

    const receiptDate = new Date(item.creation_date);
    const fromValid = startDate ? new Date(startDate) <= receiptDate : true;
    const toValid = endDate ? receiptDate <= new Date(endDate) : true;

    return matchesSearch && fromValid && toValid;
  });
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString; // fallback if invalid

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0"); // 0-based index
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };
async function openPDFBufferWhenReady(id: number) {
  setLoadingPdfIds((prev) => new Set(prev).add(id));

  try {
    const resp = await fetch(`${url}/receipt/${id}/pdf`, {
      headers: {
        Authorization: `Bearer ${keycloak.token}`,
      },
    });

    if (!resp.ok) {
      throw new Error(`Misslyckades hämta signed URL (${resp.status})`);
    }

    const data = await resp.json();

    // ✅ backend returnerar "signedUrl"
    const pdfUrl = data.signedUrl || data.url;
    if (!pdfUrl) {
      throw new Error("Ingen signed URL returnerades från servern");
    }

    window.open(pdfUrl, "_blank", "noopener,noreferrer");
  } catch (err: any) {
    console.error("Fel vid öppning av PDF:", err);
    setPdfError(err.message || "Kunde inte öppna PDF");
  } finally {
    setLoadingPdfIds((prev) => {
      const updated = new Set(prev);
      updated.delete(id);
      return updated;
    });
  }
}



 
  //const isAdmin = keycloak?.tokenParsed?.realm_access?.roles?.includes("admin");

  const columns: GridColDef[] = [
    {
      field: "user_name",
      headerName: "Användare",
      flex: 1,
      minWidth: 100,
      renderCell: (params) => highlightText(params.value, searchTerm),
    },
    {
      field: "description",
      headerName: "Beskrivning",
      flex: 1,
      minWidth: 120,
      sortable: false,
      renderCell: (params) => highlightText(params.value, searchTerm),
    },
    {
      field: "total",
      headerName: "Summa",
      flex: 1,
      minWidth: 100,
      renderCell: (params) =>
        highlightText(String(Math.round(params.value * 100) / 100), searchTerm),
    },
    {
      field: "receipt_date",
      headerName: "Kvittodatum",
      flex: 1,
      minWidth: 120,
      sortComparator: (a, b) =>
        new Date(a as string).getTime() - new Date(b as string).getTime(),
      renderCell: (params) =>
        highlightText(formatDate(params.value as string), searchTerm),
    },
    {
      field: "creation_date",
      headerName: "Rapporterat datum",
      flex: 1,
      minWidth: 120,
      sortComparator: (a, b) =>
        new Date(a as string).getTime() - new Date(b as string).getTime(),
      renderCell: (params) =>
        highlightText(formatDate(params.value as string), searchTerm),
    },
    {
      field: "actions",
      headerName: "PDF",
      flex: 0.5,
      minWidth: 100,
      sortable: false,
      renderCell: (params) =>
        loadingPdfIds.has(params.row.receipt_id) ? (
          <CircularProgress size={24} />
        ) : (
          <IconButton
            onClick={() => openPDFBufferWhenReady(params.row.receipt_id)}
          >
            <FaFile />
          </IconButton>
        ),
    },
    {
      field: "admin_actions",
      headerName: "",
      flex: 0.4,
      minWidth: 50,
      sortable: false,
      renderCell: (params) =>
        isAdmin ? (
          <Tooltip title="Redigera">
          <IconButton
            size="small"
            onClick={() => setEditingReceipt(params.row)}
          >
            <EditIcon/>
          </IconButton>
          </Tooltip>
        ) : null,
    },

    {
      field: "delete",
      headerName: "",
      flex: 0.4,
      minWidth: 50,
      sortable: false,
      renderCell: (params) =>
        isAdmin ? (
          <Tooltip title="Radera">
          <IconButton
            size="small"
            color="error"
            onClick={() => setDeleteId(params.row.receipt_id)}
          >
            <DeleteIcon/>
          </IconButton>
          </Tooltip>
        ) : null,
    }

   
  ];
   if (!isAdmin) {
  // ta bort alla admin-kolumner om inte admin
  const adminFields = ["admin_actions", "delete"];
  adminFields.forEach((field) => {
    const index = columns.findIndex((c) => c.field === field);
    if (index !== -1) columns.splice(index, 1);
  });
}

  if (loading) return <p>Loading...</p>;

  return (
    <>
      <PageContainer>
        <Box
          sx={{
            //Height: "100vh",
            //minwidth: "100%",
            //px: { xs: 2, sm: 2 }, // <-- lägger till padding på små skärmar
            //overflowX: "auto", // ← Tillåter horisontell scroll
            //overflowY: "hidden",  //  stoppa onödig scroll

            //backgroundColor: 'blue',
            display: "flex",
            //pt: "64px",
            //marginBottom: "10%",
            //marginTop: "5%",
          }}
        >
          <Box
            sx={{
              //minWidth: "100%", // ← gör att scroll kan triggas
              width: {
                xs: "100%",
                xl: "1400px",
              },
              margin: "0 auto",
              padding: 1,
              backgroundColor: "white",
              borderRadius: 2,
              boxShadow: 3,
            }}
          >
            <Stack
              direction="row"
              spacing={2}
              alignItems="center"
              marginTop={2}
              marginBottom={2}
            >
              <TextField
                label="Sök..."
                variant="outlined"
                value={searchTerm}
                onChange={handleSearchChange}
                sx={{ width: "40%" }} // större sökfält
              />

              <Box
                sx={{ width: "20px" }} //Lite space mellan sök och datum
              />
              <TextField
                label="Start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: endDate },
                }}
                sx={{ width: "30%" }} // mindre datumfält
              />

              <TextField
                label="Slut"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                slotProps={{
                  inputLabel: { shrink: true },
                  htmlInput: { max: today },
                }}
                sx={{ width: "30%" }} // mindre datumfält
              />
            </Stack>

            <Box
              ref={gridHostRef}
              sx={{
                //maxHeight: "calc(100vh - 200px)", //200px = plats för header + sökfält + lite luft
                flex: 1,
                width: "100%",
                p: 2,
                boxSizing: "border-box",
                //overflowX: "hidden",   //  stoppa extra scroll
                //overflowY: "auto",     //  tillåt bara vertikal scroll
                overflow: "hidden",
              }}
            >
              <DataGrid //Själva innehållsdelen med raderna
                apiRef={apiRef}
                rows={filteredReceipts}
                columns={columns}
                localeText={localeText}
                sx={{
                  maxHeight: "calc(100vh - 200px)",
                  padding: 2,
                  width: "100%", // grid ska aldrig bli större än containern
                  minWidth: 0, // viktig för att inte tvinga overflow
                  fontSize: {
                    xs: "0.7rem", // mobil
                    sm: "0.8rem", // surfplatta
                    md: "0.9rem", // desktop
                  },
                  borderRadius: 2,
                  borderColor: "darkgray",
                  "& .MuiDataGrid-row": {
                    backgroundColor: "#fff",
                    fontSize: "1rem", // Textstorlek
                    "&:hover": {
                      backgroundColor: "#f5f5f5", // Hoverfärg
                    },
                    "&:nth-of-type(even)": {
                      backgroundColor: "#fafafa", // Varannan rad
                    },
                  },

                  "& .MuiDataGrid-columnHeaders": {
                    backgroundColor: "#f9f9f9",
                    height: { xs: 40, sm: 50, md: 60 },
                    borderBottom: "2px solid #ddd",
                  },
                  "& .MuiDataGrid-columnHeaderTitle": {
                    fontWeight: "bold", // Lägg här för att garantera att titeln får fontWeight
                    fontSize: {
                      xs: "0.75rem",
                      sm: "0.9rem",
                      md: "1rem",
                      lg: "1.1rem",
                    },
                    color: "#333",
                  },

                "& .MuiDataGrid-row:hover": {
                  backgroundColor: "#bbdefb",
                },
                "& .MuiDataGrid-footerContainer": {
                  backgroundColor: "#f0f0f0",
                },
                 "& .MuiTablePagination-selectLabel": {
                  display: { xs: "none", sm: "block" }, // dölj "Rows per page" på små skärmar
                },
                
                "& .MuiTablePagination-select": {
                  display: "inline-flex !important", // 🔥 tvinga fram dropdown
                  minWidth: "48px", // gör den liten
                  p: 0,
                },
                "& .MuiSelect-select": {
                  fontSize: "0.8rem", // mindre text
                  p: "2px 8px",
                },
                
               
                
              }}
              initialState={{
                sorting: {
                  sortModel: [
                    { field: "creation_date", sort: "desc" }, // primär sortering
                    { field: "receipt_date", sort: "desc" },  // sekundär sortering
                  
                  ], // default sortering
                },
                pagination: { paginationModel: { pageSize: 10 } },
                
              }}
              
              sortingOrder={["asc", "desc"]} // bara stigande/fallande
              pageSizeOptions={[5, 10, 25, 50, 100]}
              disableRowSelectionOnClick

           
 
            slots={{ toolbar: CustomToolbar }}
            showToolbar
            

            />
          </Box>
        </Box>
      </Box>

        <Snackbar
          open={!!fetchError}
          autoHideDuration={5000}
          onClose={() => setFetchError(null)}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
        >
          <Alert
            onClose={() => setFetchError(null)}
            severity="error"
            sx={{ width: "100%" }}
          >
            {fetchError}
          </Alert>
        </Snackbar>

      <Snackbar
        open={!!pdfError}
        autoHideDuration={5000}
        onClose={() => setPdfError(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setPdfError(null)}
          severity="error"
          sx={{ width: "100%" }}
        >
          {pdfError}
        </Alert>
      </Snackbar>

      <Modal
        open={!!editingReceipt}
        onClose={() => setEditingReceipt(null)}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: { xs: "90%", sm: "80%", md: "95%", xl: "80%" },
            bgcolor: "background.paper",
            boxShadow: 24,
            
            maxHeight: "90vh",
           // maxWidth: "100vh",
            overflow: "auto"
          }}
        >

         
          <IconButton
            onClick={() => setEditingReceipt(null)}
            sx={{
              position: "absolute",
              top: 8,
              right: 8,
            }}
          >
            <CloseIcon />
          </IconButton>

          {editingReceipt && (
            <Form
              mode="edit"
              initialData={editingReceipt}
              onClose={() => setEditingReceipt(null)}
              onSuccess={fetchReceipts}
            />
          )}
        </Box>
      </Modal>

      <Dialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
      >
        <DialogTitle>Bekräfta radering</DialogTitle>
        <DialogContent>
          Är du säker på att du vill radera detta kvitto?
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteId(null)}>Avbryt</Button>
          <Button
            color="error"
            onClick={() => {
              if (deleteId !== null) {
                handleDelete(deleteId);
                setDeleteId(null);
              }
            }}
          >
            Radera
          </Button>
        </DialogActions>
      </Dialog>
      </PageContainer>
    </>
  );
}
