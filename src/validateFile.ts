const DEFAULT_MAX_BYTES = 10 * 1024 * 1024; // 10 MB

const VALID_FILE_TYPES = [
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

// --- helpers ---
const readBytes = async (file: File, start: number, length: number) => {
  const buf = await file.slice(start, start + length).arrayBuffer();
  return new Uint8Array(buf);
};

// Minimal header check
const hasValidSignature = async (file: File) => {
  const head = await readBytes(file, 0, 12);
  const td = new TextDecoder();

  if (file.type === "image/jpeg") {
    return head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  }
  if (file.type === "image/png") {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return sig.every((b, i) => head[i] === b);
  }
  if (file.type === "image/gif") {
    const txt = td.decode(head.slice(0, 6));
    return txt === "GIF87a" || txt === "GIF89a";
  }
  if (file.type === "image/webp") {
    const riff = td.decode(head.slice(0, 4));
    const webp = td.decode(head.slice(8, 12));
    return riff === "RIFF" && webp === "WEBP";
  }
  if (file.type === "application/pdf") {
    return td.decode(head.slice(0, 5)) === "%PDF-";
  }
  return true;
};

// Tail checks for truncation
const checkJpegEOI = async (file: File) => {
  if (file.size < 2) return false;
  const tail = await readBytes(file, file.size - 2, 2);
  return tail[0] === 0xff && tail[1] === 0xd9;
};

const checkPngIEND = async (file: File) => {
  if (file.size < 12) return false;
  const tail = await readBytes(file, file.size - 12, 12);
  const sig = [
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ];
  return sig.every((b, i) => tail[i] === b);
};

const checkGifTrailer = async (file: File) => {
  if (file.size < 1) return false;
  const last = await readBytes(file, file.size - 1, 1);
  return last[0] === 0x3b;
};

const checkWebpRiffSize = async (file: File) => {
  if (file.size < 12) return false;
  const head = await readBytes(file, 0, 12);
  const td = new TextDecoder();
  const riff = td.decode(head.slice(0, 4));
  const webp = td.decode(head.slice(8, 12));
  if (riff !== "RIFF" || webp !== "WEBP") return false;
  const sizeLE = head[4] | (head[5] << 8) | (head[6] << 16) | (head[7] << 24);
  return sizeLE + 8 === file.size;
};

// Decode test
type DecodeResult = { ok: boolean; error?: string };

const tryDecodeImage = (file: File) =>
  new Promise<DecodeResult>((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const ok = img.naturalWidth > 0 && img.naturalHeight > 0;
      URL.revokeObjectURL(url);
      resolve({ ok });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ ok: false, error: "Image is broken or unreadable." });
    };
    img.src = url;
  });

// Optional PDF deep parse
const tryParsePdf = async (file: File, pdfjsLib: any) => {
  if (!pdfjsLib) return { ok: true };
  try {
    const data = await file.arrayBuffer();
    await pdfjsLib.getDocument({ data }).promise;
    return { ok: true };
  } catch {
    return { ok: false, error: "PDF is corrupt or unreadable." };
  }
};

// --- main validator ---
export const validateFile = async (
  file: File | null | undefined,
  {
    allowedTypes = VALID_FILE_TYPES,
    maxBytes = DEFAULT_MAX_BYTES,
    pdfjsLib = null,
  }: { allowedTypes?: string[]; maxBytes?: number; pdfjsLib?: any } = {},
) => {
  if (!file) {
    return { isValid: false, error: "No file provided." };
  }

  if (!allowedTypes.includes(file.type)) {
    return {
      isValid: false,
      error: `Unsupported file type: ${file.type || "unknown"}`,
    };
  }

  if (file.size === 0) {
    return { isValid: false, error: "File is empty." };
  }
  if (file.size > maxBytes) {
    return {
      isValid: false,
      error: `File is too large (max ${Math.round(maxBytes / (1024 * 1024))} MB).`,
    };
  }
  //Avvakta med dessa till de är bättre konfigurerade
  /*if (!(await hasValidSignature(file))) {
    return { isValid: false, error: "File signature does not match its type." };
  }

  // Tail truncation checks
  if (file.type === "image/jpeg" && !(await checkJpegEOI(file))) {
    return {
      isValid: false,
      error: "JPEG appears truncated (missing EOI marker).",
    };
  }
  if (file.type === "image/png" && !(await checkPngIEND(file))) {
    return {
      isValid: false,
      error: "PNG appears truncated (missing IEND chunk).",
    };
  }
  if (file.type === "image/gif" && !(await checkGifTrailer(file))) {
    return {
      isValid: false,
      error: "GIF appears truncated (missing trailer byte).",
    };
  }
  if (file.type === "image/webp" && !(await checkWebpRiffSize(file))) {
    return {
      isValid: false,
      error: "WEBP RIFF size mismatch (possible truncation).",
    };
  }*/

  if (file.type.startsWith("image/")) {
    const decoded = await tryDecodeImage(file);
    if (!decoded.ok)
      return { isValid: false, error: decoded.error || "Image decode failed." };
  } else if (file.type === "application/pdf") {
    const parsed = await tryParsePdf(file, pdfjsLib);
    if (!parsed.ok) return { isValid: false, error: parsed.error };
  }

  return { isValid: true };
};
