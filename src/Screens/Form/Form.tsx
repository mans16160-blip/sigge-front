import * as React from "react";
import Cookies from "js-cookie";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import { useState, useEffect } from "react";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import Autocomplete from "@mui/material/Autocomplete";
import Rotate90DegreesCwIcon from '@mui/icons-material/Rotate90DegreesCw';
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import { jsPDF } from "jspdf";
// date-fns
//import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
// or for dayjs
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
// or for luxon
//import { AdapterLuxon } from '@mui/x-date-pickers/AdapterLuxon';
// or for moment
//import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import dayjs from "dayjs";
import heic2any from "heic2any";
import { pdfToImages } from "./../../convertPdf.ts"; 
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

import {
  Box,
  Button,
  IconButton,
  FormControl,
  FormLabel,
  FormGroup,
  RadioGroup,
  FormControlLabel,
  Radio,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  Modal,
  Fade,
  Typography,
  Backdrop,
  Switch,
} from "@mui/material";
import CircularProgress, {
  circularProgressClasses,
} from "@mui/material/CircularProgress";
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip";
import { DateValidationError } from "@mui/x-date-pickers/models";
import InputAdornment from "@mui/material/InputAdornment";
import InfoOutlineIcon from "@mui/icons-material/InfoOutline";
import { styled } from "@mui/material/styles";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ZoomInIcon from "@mui/icons-material/ZoomIn";
import ZoomOutIcon from "@mui/icons-material/ZoomOut";
import Pagination from "@mui/material/Pagination";
import AddPhotoAlternateOutlinedIcon from "@mui/icons-material/AddPhotoAlternateOutlined";
import { FaPaperPlane } from "react-icons/fa";
import imageCompression from "browser-image-compression";
import url from "./../../url.ts";
import keycloak from "./../../keycloak.ts";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { validateFile } from "./../../validateFile.ts";
import { extractImage, extractPDF } from "./../../receiptExtractor.ts";
import { pdfFirstPageToImageFile } from "./../../convertPdf.ts";

import PageContainer from "../../Components/PageContainer.tsx";
// Correct worker location for pdfjs-dist v3+
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.js",
  import.meta.url,
).toString();

type Company = {
  company_id: string;
  company_name: string;
};

type Person = {
  user_id: string;
  first_name: string;
  surname: string;
  email: string;
  company_id: string;
  cost_center_id: string;
  company_name: string;
};

type FormProps = {
  mode?: "create" | "edit";
  initialData?: Receipt | null;
  onClose?: () => void;
  onSuccess?: () => void;
};


type Receipt = {
  id: number;
  receipt_id: number;
  creation_date: string;
  receipt_date: string;
  user_name: string;
  tax: number;
  total: number;
  description: string;
  company_card?: boolean | null;
  charged_companies?: string[];
  represented?: string[];
  other?: string;
  image_links?: string[];
};

// Konvertera URL → File
async function urlToFile(url: string, filename = "google-photo.jpg"): Promise<File> {
  const res = await fetch(url, { mode: "cors" });
  const blob = await res.blob();
  const mimeType = blob.type || "image/jpeg";
  return new File([blob], filename, { type: mimeType });
}


export default function Form({ mode = "create", initialData, onClose, onSuccess  }: FormProps) {
  const [formData, setFormData] = useState<Receipt>(
    initialData || {
      id: 0,
      receipt_id: 0,
      creation_date: "",
      receipt_date: "",
      user_name: "",
      tax: 0,
      total: 0,
      description: "",
    }
  );

  useEffect(() => {
  console.log("Editing receipt:", initialData);
  if (mode === "edit" && initialData) {
  setFormData(initialData);

  setDescription(initialData.description || "");
  setTotal(initialData.total?.toString() || "");
  setMoms(initialData.tax?.toString() || "");
  setDate(dayjs(initialData.receipt_date));
  setCompanyCard(initialData.company_card ?? null);
  setSelectedCompanies(initialData.charged_companies || []);
 


  setOther(initialData.other || "");

  if (initialData.image_links && initialData.image_links.length > 0) {
    // Admin får färdiga PNG-bilder (en per PDF-sida)
    setAllPreviews(initialData.image_links);
    setSelectedPreview(initialData.image_links[0]);
    setNumPages(initialData.image_links.length);
    setIsPDF(false); // behandlas som en PDF (så att bläddring visas)
    setPageNumber(1);
    setIsMultiPDF(initialData.image_links.length > 1);
    setIsCustomImage(true);
  } else {
    // fallback om inget finns
    setSelectedImage("https://i.imgur.com/GlLvgfl.png");
    setIsCustomImage(false);
  }
}

}, [mode, initialData]);

  const [skipCookieSave, setSkipCookieSave] = useState(false);
  const [companyCard, setCompanyCard] = useState<boolean | null>(null);
  //const [VISA, setVISA] = useState<boolean | null>(null)
  const [total, setTotal] = useState("");
  const userLocale = navigator.language || "en-US";
  //const [hasNewUpload, setHasNewUpload] = useState(false);
  const decimalSeparator = userLocale.startsWith("sv") ? "," : ".";
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [people, setPeople] = useState<Person[]>([]);
  const [selectedPeople, setSelectedPeople] = useState<(string | Person)[]>([]);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isPDF, setIsPDF] = useState<boolean>(false);
  const [allPreviews, setAllPreviews] = useState<string[]>([]);
  const [readingFile, setReadingFile] = useState<boolean>(false);
  const [pickerError, setPickerError] = useState<DateValidationError | null>(null);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error" | null>(
    null,
  );
  const [moms, setMoms] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [repType, setRepType] = useState<"lunch" | "förtäring">("lunch");
const [numPersons, setNumPersons] = useState<number | "">("");
const [foodCost, setFoodCost] = useState<string>("");
const [alcoholCost, setAlcoholCost] = useState<string>("");
const [tip, setTip] = useState<string>("");
const [snackbarOpen, setSnackbarOpen] = useState(false);




  //const [successMessage, setSuccessMessage] = useState("");
  const [fileType, setFileType] = useState<string | null>(null);
  const transformRef = React.useRef<any>(null);
  const [transformKey, setTransformKey] = useState(0);
  /*const momsValue = moms
.  split('+')
   .map(part => parseFloat(part.trim()))
  .filter(num => !isNaN(num)) // Only keep valid numbers
   .reduce((sum, num) => sum + num, 0);  */

  const [description, setDescription] = useState("");
  const [other, setOther] = useState("");
  const [name, setName] = useState<string>("");
  const [names, setNames] = useState<string[]>([]);
  const [selectedImage, setSelectedImage] = useState<string>(
    "https://i.imgur.com/GlLvgfl.png",
  );
  const [selectedPreview, setSelectedPreview] = useState<string>(
    "https://i.imgur.com/GlLvgfl.png",
  );
  const [isCustomImage, setIsCustomImage] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [isMultiPDF, setIsMultiPDF] = useState<boolean>(false);
  //const [uploadedFile, setUploadedFile] = useState<File | null>(null);  //drag and drop
  const [date, setDate] = useState<dayjs.Dayjs | null>(dayjs());


  // Liten centrerad snackbar som inte blockerar sidan
const CenteredSnackbarModal = ({
  open,
  message,
  messageType,
  onClose,
}: {
  open: boolean;
  message: string;
  messageType: "success" | "error" | null;
  onClose: () => void;
}) => {
  React.useEffect(() => {
    if (open) {
      const timer = setTimeout(() => onClose(), 1000);
      return () => clearTimeout(timer);
    }
  }, [open, onClose]);
  

  return (
    <Modal
      open={open}
      onClose={onClose}
      disableEnforceFocus
      hideBackdrop
      sx={{
        pointerEvents: "none", // tillåt klick bakom
      }}
    >
      <>
        {/* Mjuk mörk overlay bakom (genomklickbar) */}
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.25)",
            backdropFilter: "blur(2px)",
            pointerEvents: "none",
            opacity: open ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
            zIndex: 1,
          }}
        />

        {/* Själva modalen */}
        <Box
          sx={{
            pointerEvents: "auto",
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "white",
            color: messageType === "error" ? "#d32f2f" : "#0277bd",
            border: "2px solid",
            borderColor: messageType === "error" ? "#f28b82" : "#0277bd",
            borderRadius: 3,
            px: 4,
            py: 2.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 1.2,
            minWidth: 260,
            boxShadow: 8,
            textAlign: "center",
            fontWeight: 600,
            fontSize: "1rem",
            opacity: open ? 1 : 0,
            transition: "opacity 0.3s ease-in-out",
            zIndex: 2,
          }}
        >
          {/* Text först, ikon efter */}
          <Box>{message}</Box>
          {messageType === "error" ? (
            <ErrorOutlineIcon sx={{ color: "#d32f2f" }} />
          ) : (
            <CheckCircleIcon sx={{ color: "#0277bd" }} />
          )}
        </Box>
      </>
    </Modal>
  );
};



  useEffect(() => {
    const savedCard = Cookies.get("val_companyCard");
    const savedCompanies = Cookies.get("val_selectedCompanies");
    if (savedCard) setCompanyCard(savedCard === "true");
    if (savedCompanies) setSelectedCompanies(JSON.parse(savedCompanies));
  }, []);

  // Spara
  useEffect(() => {
  if (skipCookieSave) return;
  if (companyCard !== null) Cookies.set("val_companyCard", String(companyCard));
}, [companyCard, skipCookieSave]);

useEffect(() => {
  if (skipCookieSave) return;
  Cookies.set("val_selectedCompanies", JSON.stringify(selectedCompanies));
}, [selectedCompanies, skipCookieSave]);

  const isAbort = (e: any) =>
    e?.name === "AbortError" ||
    e?.code === 20 ||
    /aborted/i.test(String(e?.message));

  const errorStyle = {
    transition: "border 0.3s ease",
    border: "2px solid red",
    borderRadius: "4px",
  };
  const [errors, setErrors] = useState({
    total: false,
    moms: false,
    description: false,
    date: false,
    companyCard: false,
    charge: false,
    image: false,
  });
  const controllerRef = React.useRef<AbortController | null>(null);
  const username = keycloak.tokenParsed?.preferred_username;
  const isAuthenticated = keycloak.authenticated;
  const userID = keycloak.tokenParsed?.sub;
  const isAdmin = keycloak.realmAccess?.roles?.includes("admin");
  // OpenAI key
const [openAiKey, setOpenAiKey] = useState<string | null>(null);


  const errorTextStyle = {
    color: "red",
    fontSize: "0.8em",
    opacity: 0,
    transition: "opacity 0.3s ease",
  };

  const errorTextVisible = {
    opacity: 1,
  };
  const min = dayjs().subtract(10, "year").startOf("day");
  const max = dayjs().endOf("day");
  // new controller for this run

  const handleImageClick = () => {
    fileInputRef.current?.click();
  };
  useEffect(() => {
    fetch(`${url}/company`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${keycloak.token}`,
        //"Content-Type": "application/json",
      },
    })
      .then((response) => response.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data.companies || [];
        setCompanies(list);
      })
      .catch((error) => {
        console.error("Error:", error);
        setMessage("Det gick inte hämta företagen: " + error.message);
        setMessageType("error");
      });
  }, []);
  const validateReceiptPayload = ({
    receipt_date,
    creation_date,
    net,
    tax,
    user_id,
    company_card,
    description,
    image_links,
    represented,
    charged_companies,
  }) => {
    return {
      total: isNaN(net) || net <= 0,
      moms: !moms?.trim() || isNaN(tax) || tax < 0,
      description: !description?.trim(),
      date: !receipt_date,
      creationDate: !creation_date,
      userId: !user_id,
      companyCard: company_card === null,
      image: !image_links || image_links.length === 0, // kollar att arrayen inte är tom
      charge:
        !Array.isArray(charged_companies) || charged_companies.length === 0,
      represented:
        showRepresented &&
        (!Array.isArray(represented) || represented.length === 0),
    };
  };
// Hämta användare från backend
  useEffect(() => {
 fetch(`${url}/user`, {
  headers: { Authorization: `Bearer ${keycloak.token}` },
})
  .then((res) => res.json())
  .then((data) => {
    console.log("användare:", data);
    setPeople(data);
  })
  .catch((err) => console.error("Fel vid hämtning av användare:", err));
}, []);

  const [showRepresented, setShowRepresented] = useState<boolean>(
  !!(initialData?.represented && initialData.represented.length > 0)
);

// 💾 Ladda in representerade från initialData när man redigerar
useEffect(() => {
  if (mode !== "edit" || !initialData?.represented) return;
  console.log("🟡 EDIT-MODE AKTIVERAT");
console.log("initialData.represented:", initialData?.represented);
console.log("people:", people);
  if (!Array.isArray(initialData.represented)) return;
  if (people.length === 0) return; // vänta tills alla användare laddats

  // vissa backend svar skickar redan objekt, andra som strängar
  const parsedPeople = initialData.represented
  .map((p: any) => {
    try {
      // om det redan är objekt — använd direkt
      if (typeof p === "object" && p !== null) return p;

      // om det är en sträng som ser ut som JSON, parsa
      if (typeof p === "string" && p.trim().startsWith("{")) {
        return JSON.parse(p);
      }

      // annars är det ett vanligt namn (t.ex. "John")
      const match = people.find(
  (x) => x.first_name === p || `${x.first_name} ${x.surname}` === p
);
      return {
        user_id: match?.user_id || "",
        first_name: match?.first_name || p,
        surname: match?.surname || "",
        company_name: match?.company_name || "",
        email: match?.email || "",
        company_id: match?.company_id || "",
        cost_center_id: match?.cost_center_id || "",
      };
    } catch (err) {
      console.warn("Kunde inte parsa represented-objekt:", p, err);
      return null;
    }
  })
  .filter((p): p is Person => p !== null);

  // ✅ sätt personerna & toggla representation
  if (parsedPeople.length > 0) {
    setSelectedPeople(parsedPeople);
    console.log("✅ parsedPeople:", parsedPeople);
    setShowRepresented(true);
  } else {
    setSelectedPeople([]);
    setShowRepresented(false);
  }
}, [mode, initialData, people]);

// 💡 Lägg till den inloggade användaren i represented endast vid nytt kvitto
useEffect(() => {
  if (mode === "create" && showRepresented && userID) {
    const me = people.find((p) => p.user_id === userID);
    if (me && !selectedPeople.some((p) => typeof p !== "string" && p.user_id === userID)) {
      setSelectedPeople((prev) => [...prev, me]);
    }
  }
}, [mode, showRepresented, userID, people]);



  // Hämta OpenAI-nyckeln från backend (skyddad endpoint)
useEffect(() => {
  if (!isAuthenticated) return; // vänta tills keycloak har loggat in

  const fetchKey = async () => {
    try {
      const response = await fetch(`${url}/key/openai`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch key: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched OpenAI key:", data);

      // Anpassa beroende på backend: om svaret är { key: "..." }
      setOpenAiKey(data.key);
    } catch (err) {
      console.error("Error fetching OpenAI key:", err);
    }
  };
  fetchKey();
}, [isAuthenticated]);

  const handleChange = (companyId: string) => {
    setSelectedCompanies((prev) => {
      const newSelection = prev.includes(companyId)
        ? prev.filter((id) => id !== companyId)
        : [...prev, companyId];

      if (hasSubmitted) {
        setErrors((prevErrors) => ({
          ...prevErrors,
          charge: newSelection.length === 0, // fel om inga val kvar
        }));
      }

      return newSelection;
    });
  };
  const handleFile = async (file: File) => {
    if (!(file instanceof File)) {
      setMessage("Felaktig filtyp: " + file);
      setMessageType("error");
      if (hasSubmitted) {
        setErrors((prev) => ({ ...prev, image: true }));
      }
      return;
    }

    let workingFile = file;

    // Logga filens storlek i MB
console.log("Inkommande filstorlek:", (workingFile.size / 1024 / 1024).toFixed(2), "MB");

// Logga dimensioner om det är en bild
if (workingFile.type.startsWith("image/")) {
  const img = new Image();
  img.onload = () => {
    console.log("Bildens dimensioner:", img.width, "x", img.height, "px");
  };
  img.src = URL.createObjectURL(workingFile);
}

// --- EML-konvertering till PDF ---
if (file.name.toLowerCase().endsWith(".eml")) {
  try {
    console.log("📩 Upptäckte EML-fil:", file.name);

    // Läs in hela .eml som text
    const rawText = await file.text();

    // DEBUG 1 – visa första 500 tecken
    console.log("🧾 Förhandsgranskning av rå .eml:", rawText.slice(0, 500));

    // Försök hitta rubriker och body
    const subjectMatch = rawText.match(/^Subject:\s*(.*)$/im);
    const fromMatch = rawText.match(/^From:\s*(.*)$/im);
    const dateMatch = rawText.match(/^Date:\s*(.*)$/im);

    // Leta efter första tomraden (enkelt sätt att skilja header/body)
    const splitIndex = rawText.indexOf("\n\n");
    const bodyTextRaw = splitIndex > -1 ? rawText.slice(splitIndex + 2) : rawText;

    // DEBUG 2 – visa början på body
    console.log("📜 Hittad body (första 500 tecken):", bodyTextRaw.slice(0, 500));

    // Ta bort HTML-taggar om de finns
    const bodyText = bodyTextRaw.replace(/<[^>]+>/g, "");
    console.log("🧹 Rensad body:", bodyText.slice(0, 300));

    // Plocka ut metadata
    const subject = subjectMatch ? subjectMatch[1].trim() : "(inget ämne)";
    const from = fromMatch ? fromMatch[1].trim() : "okänd avsändare";
    const date = dateMatch ? dateMatch[1].trim() : "";

    console.log("📬 Metadata →", { subject, from, date });

    // --- Skapa PDF ---
    const doc = new jsPDF();
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Ämne: ${subject}`, 10, 10);
    doc.text(`Från: ${from}`, 10, 20);
    if (date) doc.text(`Datum: ${date}`, 10, 30);
    doc.text("------------------------------------------------------", 10, 40);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(bodyText, 180);
    doc.text(lines, 10, 50);

    const pdfBlob = doc.output("blob");
    const pdfFile = new File([pdfBlob], file.name.replace(/\.eml$/, ".pdf"), {
      type: "application/pdf",
    });

    // DEBUG 3 – visa att PDF skapades
    console.log("✅ PDF skapad från EML:", pdfFile);

    // Kör PDF-flödet igen
    await handleFile(pdfFile);

    console.log("📦 Klar med handleFile(pdfFile) – gick vidare utan fel");
    return;
  } catch (err) {
    console.error("❌ Fel vid .eml-konvertering:", err);
    setMessage("Kunde inte läsa e-postfilen.");
    setMessageType("error");
    return;
  }
}




    //  Konvertera HEIC/HEIF → JPG direkt
    if (
      file.type === "image/heic" ||
      file.type === "image/heif" ||
      file.name.toLowerCase().endsWith(".heic") ||
      file.name.toLowerCase().endsWith(".heif")
    ) {
      try {
        const blob = await heic2any({ blob: file, toType: "image/jpeg" });
        workingFile = new File(
          [blob as BlobPart],
          file.name.replace(/\.[^.]+$/, ".jpg"),
          {
            type: "image/jpeg",
          },
        );
      } catch (err) {
        console.error("HEIC-konvertering misslyckades:", err);
        setMessage(
          "Kunde inte konvertera HEIC-bild. Försök med JPG eller PNG.",
        );
        setMessageType("error");
        if (hasSubmitted) {
          setErrors((prev) => ({ ...prev, image: true }));
        }
        return;
      }
    }

    // Validera filtyp på workingFile (inte file)
    const validType = await validateFile(workingFile);
    if (!validType.isValid && validType.error) {
      setMessage(validType.error);
      setMessageType("error");
      if (hasSubmitted) {
        setErrors((prev) => ({ ...prev, image: true }));
      }
      return;
    }

    // Kolla om det är en bild
    if (workingFile.type.startsWith("image/")) {
      const result = await isImageValid(workingFile);
      if (!result.valid) {
        if (result.reason === "tooSmall") {
          setMessage(
            "Bilden är för liten. Bilden måste vara minst 500 px bred och 700 px hög.",
          );
        } else {
          setMessage("Bilden verkar vara korrupt eller oläslig.");
        }
        setMessageType("error");
        if (hasSubmitted) {
          setErrors((prev) => ({ ...prev, image: true }));
        }
        return; // stoppa uppladdningen
      }
    }

    // Kolla PDF
    if (workingFile.type === "application/pdf") {
      const validPdf = await isPdfValid(workingFile);
      if (!validPdf) {
        setMessage("PDF-filen verkar vara korrupt eller oläslig.");
        setMessageType("error");
        if (hasSubmitted) {
          setErrors((prev) => ({ ...prev, image: true }));
        }
        return;
      }
    }

    //  Om vi kommer hit är filen giltig
    setSelectedFile(workingFile);
    setFileType(workingFile.type);
    setIsMultiPDF(false);

    if (workingFile.type === "application/pdf") {
      try {
        const pdfFile = URL.createObjectURL(workingFile);
        const imagePreviews = await pdfToImages(workingFile); // alla sidor som File[]
        const previewUrls = imagePreviews.map(img => URL.createObjectURL(img));

        setAllPreviews(previewUrls);      // spara alla sidor från PDF
        setNumPages(previewUrls.length);  //  antal sidor
        setPageNumber(1);                 // börja på sida 1
        setSelectedPreview(previewUrls[0]);// första som "huvud-preview"
        setSelectedImage(pdfFile);          // fortfarande hela pdf:en
        setNumPages(previewUrls.length);    // spara antal sidor
        setIsPDF(true);
        setPageNumber(1);
        setIsCustomImage(true);
        setReadingFile(true);
        //setHasNewUpload(true);
        controllerRef.current?.abort(); // cancel any previous run
        controllerRef.current = new AbortController();
        const data = await extractPDF(file, controllerRef.current.signal, openAiKey!);
        if (data == null) {
          // ← aborted
          setReadingFile(false);
          return; // ← no message, no console, just exit
        }
        const sum = data.sum.toString();
        const tax = data.tax.toString();
        setTotal(sum);
        setMoms(tax);
        setDescription(data.retailer);
        setDate(dayjs(data.date));
        setReadingFile(false);

        if (hasSubmitted) {
          setErrors((prev) => ({ ...prev, image: false }));
        }
        return;
      } catch (err) {
        if (isAbort(err)) {
          // ← silent cancel
          setReadingFile(false);
          return;
        }
        console.error(err); // real error
        setMessage(String(err?.message || "Något gick fel"));
        setMessageType("error");
        setReadingFile(false);
        return;
      }
    }

    // Hantera bild-preview
    try {
      const imageUrl = URL.createObjectURL(workingFile);
      setAllPreviews([imageUrl]);   // alltid array även för en bild
      setNumPages(1);
      setPageNumber(1);
      setSelectedPreview(imageUrl);
      setSelectedImage(imageUrl);
      setIsCustomImage(true);
      setIsPDF(false);
      setReadingFile(true);

      controllerRef.current?.abort(); // cancel any previous run
      controllerRef.current = new AbortController();
      const data = await extractImage(file, controllerRef.current.signal, openAiKey!);
      const sum = data.sum.toString();
      const tax = data.tax.toString();
      setTotal(sum);
      setMoms(tax);
      setDescription(data.retailer);
      setDate(dayjs(data.date));
      setReadingFile(false);
    } catch (err) {
      if (isAbort(err)) {
        // ← silent cancel
        setReadingFile(false);
        return;
      }
      console.error(err); // real error
      setMessage(String(err?.message || "Något gick fel"));
      setMessageType("error");
      setReadingFile(false);
      return;
    }
    if (hasSubmitted) {
      setErrors((prev) => ({ ...prev, image: false }));
    }
  };

  const parseMomsValue = (input: string): number => {
    const cleaned = input.replace(/\s+/g, "").replace(/,/g, ".");

    if (
      cleaned.startsWith("+") ||
      cleaned.endsWith("+") ||
      cleaned.includes("++")
    ) {
      throw new Error("Felaktig moms inmatning");
    }

    return cleaned
      .split("+")
      .map((part) => parseFloat(part))
      .filter((num) => !isNaN(num))
      .reduce((sum, num) => sum + num, 0);
  };

  const convertImageToJpg = (
    file: File,
    maxWidth = 3000,
    maxHeight = 3000,
  ): Promise<File> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          //Behåll dimensionsförhållandena
          if (width > maxWidth || height > maxHeight) {
            const widthRatio = maxWidth / width;
            const heightRatio = maxHeight / height;
            const scale = Math.min(widthRatio, heightRatio);
            width = Math.floor(width * scale);
            height = Math.floor(height * scale);
          }
          //Skala ner bilden
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) return reject("Kunde inte konvertera till JPG");
              const jpgFile = new File([blob], "converted.jpg", {
                type: "image/jpeg",
              });
              resolve(jpgFile);
            },
            "image/jpeg",
            0.9,
          );
        };

        img.onerror = () => reject("Ogiltig bild");
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject("Kunde inte läsa fil");
      reader.readAsDataURL(file);
    });
  };


  /**
 * Rotera en bildfil med canvas och returnera en ny File
 * @param file - originalbilden
 * @param degrees - rotation i grader (90, 180, 270)
 */
async function rotateImageFile(file: File, degrees: number): Promise<File> {
  const img = new Image();
  const blobUrl = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject("Kunde inte skapa canvas");

      // beräkna ny storlek vid 90°/270° rotation
      if (degrees % 180 === 0) {
        canvas.width = img.width;
        canvas.height = img.height;
      } else {
        canvas.width = img.height;
        canvas.height = img.width;
      }

      // flytta canvas och rotera
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((degrees * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject("Kunde inte skapa blob");
          const rotatedFile = new File([blob], file.name, { type: file.type });
          URL.revokeObjectURL(blobUrl);
          resolve(rotatedFile);
        },
        file.type,
        0.95,
      );
    };

    img.onerror = () => reject("Kunde inte läsa bild");
    img.src = blobUrl;
  });
}


  const checkMagicNumber = async (file: File): Promise<boolean> => {
    const buffer = await file.slice(0, 8).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // PNG
    if (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    )
      return true;
    // JPG
    if (bytes[0] === 0xff && bytes[1] === 0xd8) return true;
    // GIF
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
      return true;

    return false;
  };

  const hasValidJpegEnd = async (file: File): Promise<boolean> => {
    const size = file.size;
    if (size < 2) return false;

    const buffer = await file.slice(size - 2, size).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // JPEG ska sluta med 0xFF 0xD9
    return bytes[0] === 0xff && bytes[1] === 0xd9;
  };

  // Kolla om en bild verkligen går att läsa (ej korrupt)
  const isImageValid = async (
    file: File,
  ): Promise<{ valid: boolean; reason?: string }> => {
    try {
      // 1. Header check
      const headerOk = await checkMagicNumber(file);
      if (!headerOk) return { valid: false, reason: "wrongExtension" };

      // 2. Försök avkoda
      const bitmap = await createImageBitmap(file);
      const { width, height } = bitmap;
      bitmap.close();

      if (width < 500 || height < 700) {
        return { valid: false, reason: "tooSmall" };
      }

      // 3. Extra JPEG check → måste sluta med FF D9
      if (file.type === "image/jpeg") {
        const jpegEndOk = await hasValidJpegEnd(file);
        if (!jpegEndOk) return { valid: false, reason: "truncated" };
      }

      return { valid: true };
    } catch (err) {
      console.error("Korrupt bild:", err);
      return { valid: false, reason: "corrupt" };
    }
  };

  const isPdfValid = async (file: File): Promise<boolean> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
      // Om vi kan läsa metadata → PDF är OK
      return pdf.numPages > 0;
    } catch (error) {
      console.error("Korrupt PDF:", error);
      return false;
    }
  };

  const fileToDataUri = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  /*  const saveAsLocalFile = (file: File) => {
  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = file.name; // file name for saving
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  console.log('saved')
};*/

  const uploadImage = async () => {
    const file = selectedFile;

    if (!file) {
      return { error: true, message: "Ingen fil vald" };
    }

    try {
      //Obsolet när PDF:er behandlas i en annan funktion
      /*  if (file.type === "application/pdf") {
      // För PDF: läs filen som base64 direkt
      const base64Uri = await fileToDataUri(file);

      const formData = new FormData();
      formData.append("uri", base64Uri);

      const response = await fetch(`${url}/image`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      return result;
    }*/

      // För bilder: fortsätt som tidigare
      //Komprimera bilden kraftigare
      let compressedFile = file;

      // Konvertera till JPG om det är bild men inte redan jpg
      if (file.type.startsWith("image/")) {
        const processedFile = await convertImageToJpg(selectedFile);

        // ✅ hoppa över komprimering om filen redan är "lagom"
        if (processedFile.size < 8 * 1024 * 1024) { 
          // mindre än 8 MB → behåll originalet
          compressedFile = processedFile;
        } else {
          // större → komprimera
          compressedFile = await imageCompression(processedFile, {
            maxSizeMB: 10,
            maxWidthOrHeight: 4000,
            initialQuality: 0.95,
            useWebWorker: true,
          });
        }
      }

   
      // Om bilden har roterats i gränssnittet — rotera själva filen innan uppladdning
    if (rotation !== 0 && compressedFile.type.startsWith("image/")) {
      console.log("Rotating image file before upload:", rotation);
      compressedFile = await rotateImageFile(compressedFile, rotation);
    }

      // Konvertera till base64 URI
      const base64Uri = await fileToDataUri(compressedFile);

      if (!base64Uri) {
        throw new Error("Misslyckades att konvertera bild till base64.");
      }

      // Skicka till backend
      const formData = new FormData();
      formData.append("file", compressedFile);

      const response = await fetch(`${url}/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log("Upload success:", result);
      return result;
    } catch (error: any) {
      console.error("Upload error:", error);
      setMessage("Upload error: " + error);
      setMessageType("error");

      return { error: true, message: error.message };
    }
  };

  const clearForm = () => {
  setSkipCookieSave(true);

  const lastCard = companyCard;
  const lastCompanies = selectedCompanies;

  setTotal("");
  setMoms("");
  setDescription("");
  setOther("");
  setName("");
  setNames([]);
  //setCompanyCard(null);
  //setSelectedCompanies([]);
  setShowRepresented(false);
  setSelectedPeople([]);
  setSelectedImage("https://i.imgur.com/GlLvgfl.png");
  setIsCustomImage(false);
  setZoom(1);
  setPosition({ x: 0, y: 0 });
  setDate(dayjs());
  setSelectedFile(null);
  setNumPages(0);
  setIsPDF(false);
  setIsMultiPDF(false);
  setErrors({
    total: false,
    moms: false,
    description: false,
    date: false,
    companyCard: false,
    charge: false,
    image: false,
  });

 // Spara de senaste valen i cookies (utan att useEffect stör)
  Cookies.set("val_companyCard", String(lastCard));
  Cookies.set("val_selectedCompanies", JSON.stringify(lastCompanies));

  // Läs in cookies igen direkt efter clear
  const savedCard = Cookies.get("val_companyCard");
  const savedCompanies = Cookies.get("val_selectedCompanies");
  if (savedCard) setCompanyCard(savedCard === "true");
  if (savedCompanies) setSelectedCompanies(JSON.parse(savedCompanies));

  // Slå på cookielagring igen *efter* att React hunnit uppdatera state
  setTimeout(() => setSkipCookieSave(false), 300);
};

const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  setIsSubmitting(true);
  setHasSubmitted(true);

  // 🔹 Extra koll för representation
  if (showRepresented && name.trim() !== "") {
    setMessage("Du har skrivit in ett namn men inte lagt till det. Lägg till eller rensa innan du skickar in kvittot.");
    setMessageType("error");
    setIsSubmitting(false);
    return;
  }

  // 🔹 Validera decimaltecken
  if (total.includes(",") && total.includes(".")) {
    setMessage("Du kan bara använda en typ av decimaltecken i totalbeloppet.");
    setMessageType("error");
    setIsSubmitting(false);
    return;
  }
  if (moms.includes(",") && moms.includes(".")) {
    setMessage("Du kan bara använda en typ av decimaltecken i momsbeloppet.");
    setMessageType("error");
    setIsSubmitting(false);
    return;
  }

  const momsValue = parseMomsValue(moms);
  const normalizedTotal = parseFloat(
    total.replace(",", ".").replace(/\s+/g, "")
  );

  let extraErrors: Partial<typeof errors> = {};
  if (normalizedTotal === 0) extraErrors.total = true;
  if (momsValue > normalizedTotal) extraErrors.moms = true;

  const net = normalizedTotal - momsValue;

  // Baspayload utan image_links
  const basePayload = {
    receipt_date: date?.format("YYYY-MM-DD"),
    creation_date:
      mode === "edit" && initialData?.creation_date
        ? initialData.creation_date
        : new Date().toISOString().split("T")[0],
    net,
    tax: momsValue,
    user_id: userID,
    company_card: Boolean(companyCard),
    description,
    represented: showRepresented
  ? selectedPeople.map((p) => {
      if (typeof p === "string") {
        // egen inmatning
        return { custom: p };
      }
      // backend-person
      return {
        user_id: p.user_id,
        first_name: p.first_name,
        surname: p.surname,
        company_name: p.company_name,
      };
    })
  : [],
    charged_companies: selectedCompanies,
    other,
  };

  // 🔹 Hantera bilder
  let imageLinks: string[] = initialData?.image_links || [];

  if (selectedFile) {
    const uploadResult = await uploadImage();
    console.log("Upload result:", uploadResult);

    if (uploadResult?.links?.length > 0) {
      imageLinks = uploadResult.links;
    } else {
      setErrors((prev) => ({ ...prev, image: true }));
      setIsSubmitting(false);
      return;
    }

    // Cache-busta alla länkar
    imageLinks = imageLinks.map((link) => `${link}?t=${Date.now()}`);
  } else if (!initialData?.image_links || initialData.image_links.length === 0) {
    // ✅ Endast fel om ingen bild alls finns
    setErrors((prev) => ({ ...prev, image: true }));
    setIsSubmitting(false);
    return;
  }

  // 🔹 Slutlig payload med korrekta image_links
  const finalPayload = {
    ...basePayload,
    image_links: imageLinks,
  };

  // 🔹 Validera EFTER att image_links är satt
  const validationErrors = validateReceiptPayload({
  ...finalPayload,
  description, // 👈 se till att det är din state, inte något som backend kanske fyller i
});
  const mergedErrors = { ...validationErrors, ...extraErrors };
  setErrors(mergedErrors);

  if (Object.values(mergedErrors).some(Boolean)) {
    console.warn("Validation failed", mergedErrors);
    setIsSubmitting(false);
    return;
  }

  try {
    const endpoint =
      mode === "edit" && initialData
        ? `${url}/receipt/${initialData.receipt_id}`
        : `${url}/receipt`;

    const method = mode === "edit" ? "PUT" : "POST";

    console.log("➡️ Skickar till:", endpoint);
    console.log("➡️ Metod:", method);
    console.log("➡️ Payload:", finalPayload);

    const response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${keycloak.token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(finalPayload),
    });

    const text = await response.text();
    console.log("⬅Backend svar:", response.status, text);

    if (!response.ok) {
      throw new Error(`Server error: ${response.status} - ${text}`);
    }

    const result = JSON.parse(text);
    console.log("Result:", result);

    setMessage(mode === "edit" ? "Kvitto uppdaterat!" : "Kvitto inskickat!");
    setMessageType("success");
    setSnackbarOpen(true);

    setTimeout(() => {
    clearForm();
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onSuccess) onSuccess();
    if (mode === "edit" && onClose) onClose();
  }, 500);

  } catch (error) {
    console.error("Fel vid kvittoinlämning:", error);
    setMessage("Fel vid kvittoinlämning: " + error);
    setMessageType("error");
  } finally {
    setIsSubmitting(false);
  }
};




  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;

    
    // Låt alltid handleFile sköta HEIC-konvertering, validering och preview
    await handleFile(file);
  };

  const removeName = (indexToRemove: number) => {
    setNames((prev) => prev.filter((_, index) => index !== indexToRemove));
  };
  const handleAddName = () => {
    if (name.trim() === "") return;
    setNames((prev) => [...prev, name.trim()]);
    setName("");
  };



  const CustomTooltip = styled(({ className, ...props }: TooltipProps) => (
    <Tooltip {...props} classes={{ popper: className }} />
  ))(({ theme }) => ({
    [`& .${tooltipClasses.tooltip}`]: {
      backgroundColor: theme.palette.common.white,
      color: "rgba(0, 0, 0, 0.87)",
      boxShadow: theme.shadows[1],

      //maxWidth: 200,
      whiteSpace: "normal",

      [theme.breakpoints.up("sm")]: {
        fontSize: "0.6rem",
        maxWidth: 180,
      },
      [theme.breakpoints.up("md")]: {
        fontSize: "0.7rem",
        maxWidth: 200,
      },
      [theme.breakpoints.up("lg")]: {
        fontSize: "0.8rem",
        maxWidth: 220,
      },
      [theme.breakpoints.up("xl")]: {
        fontSize: "1rem",
        maxWidth: 250,
      },
    },
  }));

  const cardText = "Välj det kort som betalningen gjordes med.";

  const debitText =
    "Välj det bolag som ska debiteras, om det är flera bolag som berörs av köpet så klickar du i samtliga.";

  const representText =
    "Om du behöver lägga till representerade, exempelvis för en middag, klickar du i switchen och fyller i de berördas namn samt vilket företag de kommer ifrån. Annars låter du denna vara orörd.";

  const [dragOver, setDragOver] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = React.useRef({ x: 0, y: 0 });
  const touchStart = React.useRef({ x: 0, y: 0 });
  const [lastTouchDistance, setLastTouchDistance] = useState<number | null>(
    null,
  );
  const mouseDownPos = React.useRef({ x: 0, y: 0 });

  //för att kunna zooma
  const transformStyle = {
    position: "absolute" as const,
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transformOrigin: "center center",
    pointerEvents: "none",
  };

  return (
    <>
    <PageContainer>
      
      {/*Wrap jsx with react fragment*/}
      <Box
        sx={{
          //Height: "100%",
          //minHeight: "60vh",
          //minWidth: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          //boxSizing: "border-box", // detta gör att padding räknas in i höjden
          //overflow: "hidden", // för att ta bort scroll
          
        }}
      >
        <Stack
          sx={{
            //marginTop: { xs: 2, md: 4, lg: 3 },
            padding: 1,
            marginLeft: "auto",
            marginRight: "auto",
            display: "flex",
            //backgroundColor: 'blue',
            flexDirection: { xs: "column", sm: "column", md: "row" }, // Stapla på små skärmar, rad på stora
            flexWrap: "wrap",
            gap: 2, // Lägg till spacing mellan boxarna
            width: "100vw",
            maxWidth: {
              xs: "100%",
              sm: "600px",
              md: "1000px",
              lg: "1400px",
              xl: "1600px",
            },
          }}
        >
          {/* första rutan*/}
          <Box
            sx={{
              flex: 1.5,
              minWidth: 0,
              height: {
                xs: "auto",
                md: "70vh",
              },
              minHeight: {
                xs: "600px",
                //md: "600px",
              },
              overflowY: readingFile ? "hidden" : { xs: "visible", md: "auto" },
              boxSizing: "border-box",
              padding: 3,
              borderRadius: 2,
              boxShadow: 3,
              backgroundColor: "white",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <Stack direction="column" alignItems="center" sx={{ flexGrow: 1 }}>
              <>
                {readingFile ? (
                  <>
                      <Box
                        sx={{
                          position: "relative",
                          width: "100%",
                          height: isPDF ? "80%" : "68%",
                          display: "flex",
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        {/* Själva bilden */}
                        <Box
                          component="img"
                          src={selectedPreview}
                          alt=""
                          draggable={false}
                          sx={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "fill",
                            display: "block",
                            pointerEvents: "none",
                            filter: "grayscale(60%) brightness(0.6)",
                          }}
                        />

                        {/* Overlay (centrerad) */}
                        <Box
                          sx={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            textAlign: "center",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            bgcolor: "rgba(255, 255, 255, 0.25)", // halvtransparent vit
                            backdropFilter: "blur(10px)",          // glas-effekt
                            border: "1px solid rgba(255,255,255,0.4)",
                            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
                            borderRadius: "16px",
                            padding: { xs: 2, sm: 3 },           //  Mindre padding
                            minWidth: { xs: "160px", sm: "220px" }, 
                            color: "white",
                          }}
                        >
                          <Typography
                            sx={{
                              fontWeight: "bold",
                              fontFamily: "sans-serif",
                              mb: 1,
                              color: "#0277bd",
                              fontSize: { sm: "1.4rem", md: "1.6rem" },
                              //textShadow: "2px 2px 6px rgba(0,0,0,0.7)",
                            }}
                          >
                            Läser av kvitto...
                          </Typography>

                          <CircularProgress
                            thickness={5}
                            size={40}
                            sx={{
                              color: "#0277bd",
                              mb: 1,
                              filter: "drop-shadow(2px 2px 4px rgba(0,0,0,0.5))",
                            }}
                          />

                          <Button
                            onClick={() => {
                              controllerRef.current?.abort();
                              setReadingFile(false);
                            }}
                            sx={{
                              mt: 1,
                              color: "#0277bd",
                              textTransform: "none",
                              fontWeight: "bold",
                              border: "1px solid rgba(255,255,255,0.6)",
                              borderRadius: "999px",
                              px: 3,
                              "&:hover": {
                                backgroundColor: "rgba(255,255,255,0.2)",
                              },
                            }}
                          >
                            AVBRYT
                          </Button>
                        </Box>

                      </Box>

                  </>
                ) : (
                  <>
                    <Box //Hantera allt med bilden, klicka, zooma, lägga till etc
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragOver(true);
                      }}
                      onDragLeave={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                      }}
                      onDrop={(e) => { 
                        e.preventDefault(); 
                        setDragOver(false); 
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) { 
                          handleFile(e.dataTransfer.files[0]); 
                        } 
                      }}
                      onMouseDown={(e) => {
                        if (isCustomImage) {
                          e.preventDefault();
                          setDragging(true);
                          dragStart.current = {
                            x: e.clientX - position.x,
                            y: e.clientY - position.y,
                          };
                          mouseDownPos.current = { x: e.clientX, y: e.clientY };
                        }
                      }}
                      onMouseMove={(e) => {
                        if (isCustomImage && dragging) {
                          const dx = e.clientX - dragStart.current.x;
                          const dy = e.clientY - dragStart.current.y;
                          setPosition({ x: dx, y: dy });
                        }
                      }}
                      onMouseUp={(e) => {
                        if (dragging) {
                          setDragging(false);
                          const dx = Math.abs(
                            e.clientX - mouseDownPos.current.x,
                          );
                          const dy = Math.abs(
                            e.clientY - mouseDownPos.current.y,
                          );

                          if (dx < 5 && dy < 5 && !isCustomImage) {
                            handleImageClick();
                          }
                        } else {
                          if (!isCustomImage) {
                            handleImageClick();
                          }
                        }
                      }}
                      onMouseLeave={() => setDragging(false)}
                      onTouchStart={(e) => {
                        if (isCustomImage) {
                          if (e.touches.length === 1) {
                            touchStart.current = {
                              x: e.touches[0].clientX - position.x,
                              y: e.touches[0].clientY - position.y,
                            };
                          } else if (e.touches.length === 2) {
                            const dx =
                              e.touches[0].clientX - e.touches[1].clientX;
                            const dy =
                              e.touches[0].clientY - e.touches[1].clientY;
                            setLastTouchDistance(Math.hypot(dx, dy));
                          }
                        }
                      }}
                      onTouchMove={(e) => {
                        if (isCustomImage) {
                          if (e.touches.length === 1) {
                            setPosition({
                              x: e.touches[0].clientX - touchStart.current.x,
                              y: e.touches[0].clientY - touchStart.current.y,
                            });
                          } else if (e.touches.length === 2) {
                            const dx =
                              e.touches[0].clientX - e.touches[1].clientX;
                            const dy =
                              e.touches[0].clientY - e.touches[1].clientY;
                            const newDistance = Math.hypot(dx, dy);
                            if (lastTouchDistance) {
                              const scaleChange =
                                newDistance / lastTouchDistance;
                              setZoom((prev) =>
                                Math.min(Math.max(prev * scaleChange, 1), 3),
                              );
                            }
                            setLastTouchDistance(newDistance);
                          }
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (e.touches.length < 2) {
                          setLastTouchDistance(null);
                        }
                      }}
                      //design
                      sx={{
                        backgroundColor: dragOver ? "#e0f7fa" : "white",

                        border: dragOver
                          ? "2px dashed #0277bd"
                          : hasSubmitted && errors.image
                            ? "2px solid red"
                            : "1px dashed #c7c7c7",
                        flexGrow: 1,
                        width: "100%",
                        minHeight: { xs: 300, sm: 400, md: "90%" },
                        maxHeight: { xs: 500, sm: 600 },
                        position: "relative",
                        cursor:
                          isCustomImage && zoom > 1
                            ? dragging
                              ? "grabbing"
                              : "grab"
                            : "pointer",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        transition: "border 0.3s ease",
                        overflow: "hidden",
                        userSelect: "none",
                        touchAction: "none",
                        ...(errors.image ? errorStyle : {}),
                      }}
                    >
                      {!isCustomImage && (
                        <Box
                          display="flex"
                          flexDirection="column"
                          alignItems="center"
                        >
                          <AddPhotoAlternateOutlinedIcon
                            sx={{
                              fontSize: {
                                xs: 150,
                                sm: 200,
                                md: 150,
                                lg: 200,
                                xl: 250,
                              },
                              color: "#c7c7c7",
                            }}
                          />
                          {dragOver ? (
                            <Typography
                              variant="body1"
                              sx={{
                                color: "#0277bd",
                                fontWeight: "bold",
                                mt: 1,
                              }}
                            >
                              Släpp din fil här
                            </Typography>
                          ) : (
                            <Typography
                              variant="body2"
                              align="center"
                              sx={{ color: "#c7c7c7", mt: 1 }}
                            >
                              Här kan du dra och släppa en fil <br /> eller
                              klicka på knappen nedan
                            </Typography>
                          )}
                        </Box>
                      )}

                     {isCustomImage && (
                      

                       <TransformWrapper
                       key={transformKey}
                        wheel={{
                          step: 0.2,
                          disabled: false,          //aktiverar scrollhjul
                          smoothStep: 0.005,        //gör det mjukare
                          activationKeys: [],       //ta bort krav på Ctrl
                          excluded: [],             //inga element undantas
                        }}
                        pinch={{ step: 0.2 }}
                        doubleClick={{ disabled: true }}
                        panning={{ velocityDisabled: true }}
                        minScale={1}
                        maxScale={4}
                        limitToBounds={false}
                      >
                        <TransformComponent
                          wrapperStyle={{
                            width: "100%",
                            height: "100%",
                            overflow: "hidden",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                          contentStyle={{
                            width: "100%",
                            height: "100%",
                            touchAction: "none",
                          }}
                        >
                          <>


                          
                            {isPDF ? (
                          <Document
                            file={selectedFile} // 
                            onLoadSuccess={({ numPages }) => {
                              setNumPages(numPages);
                              setIsMultiPDF(numPages > 1);
                            }}
                          >
                            <Box
                          sx={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom}) rotate(${rotation}deg)`,
                            transition: dragging ? "none" : "transform 0.2s ease",
                            pointerEvents: "none",
                          }}
                        >
                          <Page
                            pageNumber={pageNumber}
                            width={420}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                          />
                        </Box>
                          </Document>
                        ) : (
                              //vanlig bild
                            <Box
                              component="img"
                              src={allPreviews[pageNumber - 1] || selectedImage}
                              alt="Uploaded"
                              sx={{
                                position: "absolute",
                                top: "50%",
                                left: "50%",
                                height: "100%",       // fyll alltid dropzonens höjd
                                width: "auto",        // proportionerlig bredd
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain",
                                transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom}) rotate(${rotation}deg)`,
                                transition: dragging
                                  ? "none"
                                  : "transform 0.2s ease",
                                pointerEvents: "none",
                              }}
                            />
                          )}
                           </>
                         </TransformComponent>
                          {/* Close */}
                          <IconButton
                            size="small"
                            onMouseDown={(e) => e.stopPropagation()}
                            onMouseUp={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedImage(
                                "https://i.imgur.com/GlLvgfl.png",
                              );
                              setIsCustomImage(false);
                              setZoom(1);
                              setPosition({ x: 0, y: 0 });
                              setSelectedFile(null);

                                if (fileInputRef.current)
                                  fileInputRef.current.value = "";

                                if (hasSubmitted) {
                                  setErrors((prev) => ({
                                    ...prev,
                                    image: true,
                                  })); // ❌ ingen fil = fel
                                }
                              }}
                              sx={{
                                position: "absolute",
                                top: 8,
                                right: 8,
                                backgroundColor: "rgba(255,255,255,0.7)",
                                "&:hover": {
                                  backgroundColor: "rgba(255,255,255,0.9)",
                                },
                                pointerEvents: "auto",
                              }}
                            >
                              <CloseIcon />
                            </IconButton>

                          {/* turn and Zoom and reset  */}
                          <Stack
                            direction="column"
                            spacing={1}
                            sx={{
                              position: "absolute",
                              bottom: 10,
                              right: 10,
                              backgroundColor: "rgba(255,255,255,0.7)",
                              borderRadius: "6px",
                              p: 0.5,
                            }}
                          >
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRotation((prev) => (prev + 90) % 360); // rotera 90 grader
                              }}
                            >
                              <Rotate90DegreesCwIcon /> 
                            </IconButton>
                            <IconButton
                              size="small"
                              onMouseDown={(e) => e.stopPropagation()}
                              onMouseUp={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoom((prev) => Math.min(prev + 0.2, 3));
                              }}
                            >
                              <ZoomInIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onMouseDown={(e) => e.stopPropagation()}
                              onMouseUp={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoom((prev) => Math.max(prev - 0.2, 1));
                                if (zoom <= 1.1) setPosition({ x: 0, y: 0 });
                              }}
                            >
                              <ZoomOutIcon />
                            </IconButton>
                            <IconButton
                              size="small"
                              onMouseDown={(e) => e.stopPropagation()}
                              onMouseUp={(e) => e.stopPropagation()}
                              onClick={(e) => {
                                e.stopPropagation();
                                setRotation(0);
                                setZoom(1);
                                setPosition({ x: 0, y: 0 });
                                setTransformKey((prev) => prev + 1); 
                              }}
                            >
                              <RestartAltIcon />
                            </IconButton>
                          </Stack>

                            {isMultiPDF && (
                              <Stack
                                direction="row" //
                                spacing={1}
                                sx={{
                                  position: "absolute",
                                  bottom: 10,
                                  left: "50%",
                                  transform: "translateX(-50%)",
                                  display: "flex",
                                  justifyContent: "center",
                                  alignItems: "center",
                                  borderRadius: "6px",
                                  p: 0.5,
                                }}
                              >
                                <Pagination
                                  count={numPages} // Antal sidor från react-pdf
                                  page={pageNumber} // Nuvarande sida
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onMouseUp={(e) => e.stopPropagation()}
                                  onChange={(e, value) => {
                                    e.stopPropagation();
                                    setPageNumber(value);
                                  }}
                                  // håll navi minimal
                                  siblingCount={1}
                                  boundaryCount={1} // keep first & last always visible
                                  size="small"
                                  color="primary"
                                  // inga “första/sista”-knappar
                                  showFirstButton={false}
                                  showLastButton={false}
                                  // styla så den inte wrappar och håller fast höjd
                                  sx={{
                                    "& .MuiPagination-ul": {
                                      flexWrap: "nowrap",
                                    }, // ingen radbrytning
                                    "& .MuiPaginationItem-root": {
                                      minWidth: 28,
                                      height: 28,
                                      fontSize: 12,
                                      margin: 0, // samma höjd/marginal för alla
                                    },
                                    "& .Mui-selected": { margin: 0 }, // undvik hopphöjd
                                  }}
                                />
                              </Stack>
                            )}
                         
                        </TransformWrapper> 
                        )}

                        <input
                          type="file"
                          accept="image/*,.heic,.heif,.pdf,.eml"
                          capture="environment" // opens back camera by default
                          ref={fileInputRef}
                          style={{ display: "none" }}
                          onChange={handleFileChange}
                        />
                      </Box>{" "}
                      {hasSubmitted && errors.image && (
                        <p style={{ ...errorTextStyle, ...errorTextVisible }}>
                          Ogiltig fil, försök igen
                        </p>
                      )}
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleImageClick}
                        sx={{
                          mt: 2,
                          mb: 2,
                          fontWeight: "bold",
                          color: "#0277bd",
                          borderRadius: "999px",
                        }}
                      >
                        Ladda upp fil
                      </Button>
                    </>
                  )}
                </>
              </Stack>
            </Box>

            {/* andra rutan*/}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                height: {
                  xs: "auto",
                  md: "70vh",
                },
                minHeight: {
                  xs: "auto",
                  md: "600px",
                },
                overflowY: {
                  xs: "visible",
                  md: "auto",
                },
                boxSizing: "border-box",
                padding: 3,
                borderRadius: 2,
                boxShadow: 3,
                backgroundColor: "white",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <TextField
                label="Beskrivning"
                required
                variant="filled"
                size="small"
                value={description}
                onChange={(e) => {
                  const input = e.target.value;
                  setDescription(input);

                  if (hasSubmitted) {
                    setErrors((prev) => ({
                      ...prev,
                      description: !input.trim(),
                    }));
                  }
                }}
                disabled={readingFile}
                error={errors.description && hasSubmitted}
                helperText={
                  errors.description && hasSubmitted
                    ? "Beskrivning är obligatorisk"
                    : "Ex. Friskvård, kurs, resa"
                }
                slotProps={{
                  htmlInput: { maxLength: 100 }, // nya sättet istället för inputProps
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <span style={{ fontSize: "0.75rem", color: "#666" }}>
                          {description.length}/100
                        </span>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  transition: "border 0.3s ease",
                  ...(errors.description && errorStyle),
                  "& .MuiFilledInput-root:hover": {
                    backgroundColor: "#bbdefb",
                  },
                }}
              />

              <TextField
                label="Summa"
                required
                variant="filled"
                size="small"
                value={total}
                onChange={(e) => {
                  const input = e.target.value;

                  if (/^\d*[.,]?\d{0,2}$/.test(input)) {
                    const num = parseFloat(input);
                    if (input === "" || (!isNaN(num) && num <= 9999999.99)) {
                      setTotal(input);
                      if (hasSubmitted) {
                        const normalizedTotal =
                          parseFloat(
                            input.replace(",", ".").replace(/\s+/g, ""),
                          ) || 0;

                        setErrors((prev) => ({
                          ...prev,
                          total: !input.trim() || normalizedTotal === 0,
                        }));
                      }
                    }
                  }
                }}
                disabled={readingFile}
                error={errors.total && hasSubmitted}
                helperText={
                  errors.total && hasSubmitted
                    ? parseFloat(
                        total.replace(",", ".").replace(/\s+/g, ""),
                      ) === 0
                      ? "Summan måste vara större än 0"
                      : "Fyll i det totala beloppet på kvittot"
                    : "Fyll i det totala beloppet på kvittot"
                }
                sx={{
                  marginTop: { xs: 4, md: 2, lg: 4 },
                  transition: "border 0.3s ease",
                  ...(errors.total && errorStyle),
                  "& .MuiFilledInput-root:hover": {
                    backgroundColor: "#bbdefb",
                  },
                }}
                type="text"
                slotProps={{ input: { inputMode: "numeric" } }}
              />

              <TextField
                label="Moms"
                required
                variant="filled"
                size="small"
                value={moms}
                onChange={(e) => {
                  const input = e.target.value;

                  // Regex: flera termer, varje med ev. decimaler
                  const momsRegex =
                    /^(\d*[.,]?\d{0,2})(\s*\+\s*\d*[.,]?\d{0,2})*$/;

                  if (momsRegex.test(input)) {
                    const num = parseFloat(input);
                    if (input === "" || (!isNaN(num) && num <= 9999999.99)) {
                      setMoms(input); // alltid tillåt input (så man kan rätta till)

                      if (hasSubmitted) {
                        const momsValue = parseMomsValue(input);
                        const normalizedTotal =
                          parseFloat(
                            total.replace(",", ".").replace(/\s+/g, ""),
                          ) || 0;

                        setErrors((prev) => ({
                          ...prev,
                          moms:
                            !input.trim() || // tomt
                            isNaN(momsValue) || // ej giltigt nummer
                            momsValue > normalizedTotal, // större än summa
                        }));
                      }
                    }
                  }
                }}
                disabled={readingFile}
                error={errors.moms && hasSubmitted}
                helperText={
                  errors.moms && hasSubmitted
                    ? parseMomsValue(moms) >
                      (parseFloat(
                        total.replace(",", ".").replace(/\s+/g, ""),
                      ) || 0)
                      ? "Moms kan inte vara större än summan"
                      : "Fyll i det totala momsbeloppet på kvittot"
                    : "Fyll i det totala momsbeloppet på kvittot"
                }
                sx={{
                  marginTop: { xs: 4, md: 2, lg: 4 },
                  transition: "border 0.3s ease",
                  ...(errors.moms && errorStyle),
                  "& .MuiFilledInput-root:hover": {
                    backgroundColor: "#bbdefb",
                  },
                }}
                type="text"
                slotProps={{ input: { inputMode: "numeric" } }}
              />

              <TextField
                label="Övrigt"
                variant="filled"
                size="small"
                value={other}
                onChange={(e) => setOther(e.target.value)}
                disabled={readingFile}
                helperText={
                  <>
                    <span>
                      Skriv in utländsk valuta (ex. USD) eller annan viktig
                      information{" "}
                    </span>
                  </>
                }
                slotProps={{
                  htmlInput: { maxLength: 150 }, // nya sättet istället för inputProps
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <span style={{ fontSize: "0.75rem", color: "#666" }}>
                          {other.length}/150
                        </span>
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  marginTop: { xs: 4, md: 2, lg: 4 },
                  transition: "border 0.3s ease",
                  "& .MuiFilledInput-root:hover": {
                    backgroundColor: "#bbdefb",
                  },
                }}
              />

              <LocalizationProvider dateAdapter={AdapterDayjs}>
                <DatePicker
                  label="Datum"
                  value={date}
                  onChange={(newValue) => {
                    if (!newValue) {
                      setDate(null);
                      if (hasSubmitted) {
                        setErrors((prev) => ({ ...prev, date: true }));
                      }
                      return;
                    }

                    if (newValue.isBefore(min, "day")) {
                      setDate(min);
                      if (hasSubmitted) {
                        setErrors((prev) => ({ ...prev, date: true }));
                      }
                      return;
                    }

                    if (newValue.isAfter(max, "day")) {
                      setDate(max);
                      if (hasSubmitted) {
                        setErrors((prev) => ({ ...prev, date: true }));
                      }
                      return;
                    }

                    // ✅ giltigt datum
                    setDate(newValue);
                    if (hasSubmitted) {
                      setErrors((prev) => ({ ...prev, date: false }));
                    }
                  }}
                  format="YYYY-MM-DD"
                  minDate={dayjs().subtract(10, "year")}
                  maxDate={dayjs()}
                  disableFuture
                  disabled={readingFile}
                  onError={(reason) => {
                    setPickerError(reason);
                    if (hasSubmitted) {
                      setErrors((prev) => ({ ...prev, date: !!reason }));
                    }
                  }}
                  slotProps={{
                    textField: {
                      error: (!!pickerError || errors.date) && hasSubmitted, // bara efter submit
                      helperText:
                        pickerError === "invalidDate"
                          ? "Ogiltigt datum"
                          : pickerError === "minDate"
                            ? `Datumet får inte vara äldre än ${min.format("YYYY-MM-DD")}`
                            : pickerError === "maxDate"
                              ? "Datumet får inte vara i framtiden"
                              : errors.date && hasSubmitted
                                ? "Fyll i fältet"
                                : "Välj det datum som står på kvittot",

                      sx: {
                        marginTop: { xs: 4, md: 6 }, // mer spacing
                      },
                    },
                  }}
                />
              </LocalizationProvider>
            </Box>

            {/* tredje rutan*/}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                height: {
                  xs: "auto",
                  md: "70vh",
                },
                minHeight: {
                  xs: "auto",
                  md: "600px",
                },
                overflowY: {
                  xs: "visible",
                  md: "auto",
                },
                boxSizing: "border-box",
                padding: 3,
                borderRadius: 2,
                boxShadow: 3,
                backgroundColor: "white",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* VISA / Eget utlägg */}
              <FormControl
                component="fieldset"
                sx={{
                  marginTop: 1,
                  alignItems: "flex-start",
                }}
              >
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.6, // mellanrum mellan text och ikon
                  }}
                >
                  <FormLabel
                    component="legend"
                    required
                    sx={{
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      color: "black",
                    }}
                  >
                    Kort
                  </FormLabel>

                  <CustomTooltip title={cardText} placement="right">
                    <InfoOutlineIcon
                      sx={{
                        color: "#0277bd",
                        fontSize: "0.9rem",
                        cursor: "pointer", // visar att den är klickbar
                        position: "relative",
                        top: "-4px", // flytta upp en aning
                      }}
                    />
                  </CustomTooltip>
                </Box>

                <RadioGroup
                  name="companyCardOption"
                  value={
                    companyCard === true
                      ? "Option1"
                      : companyCard === false
                        ? "Option2"
                        : ""
                  }
                  onChange={(e) => {
                    setCompanyCard(e.target.value === "Option1");
                    if (hasSubmitted) {
                      setErrors((prev) => ({
                        ...prev,
                        companyCard: e.target.value === "", // inget valt
                      }));
                    }
                  }}
                  sx={{
                    border: "2px solid",
                    borderColor:
                      hasSubmitted && errors.companyCard ? "red" : "white",
                    borderRadius: "8px",
                    padding: 1,
                  }}
                >
                  <FormControlLabel
                    value="Option1"
                    control={<Radio />}
                    label="Företagskort"
                  />
                  <FormControlLabel
                    value="Option2"
                    control={<Radio />}
                    label="Eget utlägg"
                  />
                </RadioGroup>

                {hasSubmitted && errors.companyCard && (
                  <p style={{ ...errorTextStyle, ...errorTextVisible }}>
                    Välj ett alternativ
                  </p>
                )}
              </FormControl>

              {/* Vem som ska debiteras */}
              <FormControl
                component="fieldset"
                sx={{
                  marginTop: 4,
                  alignItems: "flex-start",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                  <FormLabel
                    component="legend"
                    required
                    sx={{
                      fontSize: "1.1rem",
                      fontWeight: "bold",
                      color: "black",
                    }}
                  >
                    Debitering
                  </FormLabel>
                  <CustomTooltip title={debitText} placement="right">
                    <InfoOutlineIcon
                      sx={{
                        color: "#0277bd",
                        fontSize: "0.9rem",
                        cursor: "pointer",
                        position: "relative",
                        top: "-4px",
                      }}
                    />
                  </CustomTooltip>
                </Box>

                <FormGroup
                  sx={{
                    border: "2px solid",
                    borderColor:
                      hasSubmitted && errors.charge ? "red" : "white",
                    borderRadius: "8px",
                    padding: 1,
                  }}
                >
                  {companies.map((company) => (
                    <FormControlLabel
                      key={company.company_id}
                      control={
                        <Checkbox
                          checked={selectedCompanies.includes(
                            company.company_id,
                          )}
                          onChange={() => handleChange(company.company_id)}
                        />
                      }
                      label={company.company_name}
                    />
                  ))}
                </FormGroup>

                {hasSubmitted && errors.charge && (
                  <p style={{ ...errorTextStyle, ...errorTextVisible }}>
                    Välj minst ett bolag
                  </p>
                )}
              </FormControl>

              <Box
                sx={{
                  display: "flex",
                  //justifyContent: "space-between",
                  alignItems: "center",
                  flexDirection: "row",
                  mt: 4,
                  gap: 0,
                }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={showRepresented}
                      onChange={(e) => setShowRepresented(e.target.checked)}
                      color="primary"
                    />
                  }
                  label={
                    showRepresented ? "Representation" : "Representation"
                  }
                  sx={{ mr: 0 }}
                />
                <CustomTooltip title={representText} placement="right" sx={{}}>
                  <IconButton size="small" sx={{ p: 0.25, ml: 0.5 }}>
                    <InfoOutlineIcon
                      sx={{
                        color: "#0277bd",
                        fontSize: "0.9rem",
                        cursor: "pointer", // visar att den är klickbar
                        position: "relative",
                        top: "-4px", // flytta upp en aning
                      }}
                    />
                  </IconButton>
                </CustomTooltip>
              </Box>

              {!showRepresented && selectedPeople.length > 0 && (
                <Typography sx={{ color: "red", fontSize: "0.85rem", mt: 1 }}>
                  Namnen kommer inte skickas med eftersom representation är av.
                </Typography>
              )}
              {showRepresented && (
                  <>
                    <p
                      style={{
                        paddingTop: "10px",
                        fontSize: "1rem",
                        textAlign: "left",
                      }}
                    >
                      Skriv i förnamn, efternamn samt företag:
                    </p>

                    <Autocomplete
                      multiple
                      freeSolo
                      forcePopupIcon={true}
                      popupIcon={<ArrowDropDownIcon />}
                      options={[...people].sort((a, b) =>
                        a.first_name.localeCompare(b.first_name, "sv")
                      )}
                      groupBy={(option) =>
                        typeof option === "object" && option !== null
                          ? option.first_name[0].toUpperCase()
                          : (option as string)[0]?.toUpperCase()
                      }
                      getOptionLabel={(p) => {
                        if (typeof p === "object" && p !== null) {
                          return `${p.first_name} ${p.surname} - ${p.company_name}`;
                        }
                        return p as string;
                      }}
                      value={selectedPeople}
                      onChange={(e, newValue) => setSelectedPeople(newValue)}
                      isOptionEqualToValue={(option, value) => {
                        if (typeof option === "string" || typeof value === "string") {
                          return option === value;
                        }
                        return option.user_id === value.user_id;
                      }}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label={`Namn (${selectedPeople.length})`}
                          variant="filled"
                          required
                          size="small"
                          placeholder="Skriv för att söka..."
                          sx={{
                            "& .MuiAutocomplete-input": {
                              flex: "0 0 100%",
                              minWidth: "100%",
                            },
                          }}
                        />
                      )}
                      slots={{
                        paper: (props) => (
                          <Box
                            {...props}
                            sx={{
                              backgroundColor: "white",
                              border: "2px solid #0277bd",
                              borderRadius: "8px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                              "& .MuiAutocomplete-option": {
                                fontSize: "0.8rem",
                                padding: "2px 6px",
                              },
                              "& .MuiAutocomplete-groupLabel": {
                                fontSize: "0.7rem",
                                fontWeight: "bold",
                              },
                            }}
                          />
                        ),
                      }}
                    />
                  </>
                )}

            </Box>
          </Stack>
        </Box>
        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            {isSubmitting ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography>Skickar...</Typography>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Button
                type="submit"
                size="large"
                variant="contained"
                endIcon={<FaPaperPlane />}
                sx={{
                  fontWeight: "bold",
                  backgroundColor: "#0277bd",
                  borderRadius: "999px",
                  "&:hover": {
                    backgroundColor: "#01579b",
                  },
                }}
              >
                SKICKA IN
              </Button>
            )}
          </Box>
        </Box>
        {/* Snackbar för success meddelanden */}
          <CenteredSnackbarModal
            open={snackbarOpen}
            message={message}
            messageType={messageType}
            onClose={() => setSnackbarOpen(false)}
          />

      </PageContainer>
    </>
  );
}
