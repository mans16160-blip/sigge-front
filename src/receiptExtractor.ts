import OpenAI from "openai";
import { validateJSON } from "./jsonValidator.ts";

const imagePromt = `Extract sum, tax, retailer, and date from this receipt. 
Return ONLY a valid JSON object on a single line, no extra spaces or line breaks.
Contain no escaped characters (no \n, no \", no \\) .
Be a single-line JSON string.
Contain no code fences, no backticks, no extra text .
Do not add \`\`\`json or any other formatting.
Do not add \n or \ .
The output must start with { and end with }.
Example of correct output:
{"sum":529,"tax":80.56,"retailer":"Clas Ohlson","date":"2024/02/08"}`;

// Konvertera fil till Base64
function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

// 🟢 Extract från bild
const extractImage = async (
  file: File,
  signal: AbortSignal | undefined,
  apiKey: string
) => {
  const base64Url = await fileToDataURL(file);

  // Skapa klient med nyckeln från backend
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  try {
   const response = await openai.responses.create(
  {
    model: "gpt-4o",
    input: [
      {
        role: "user",
        content: [
          { type: "input_text", text: imagePromt },
          { type: "input_image", image_url: base64Url },
        ],
      },
    ],
  },
  { timeout: 10000, signal }
);

    let raw = response.output_text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
    }
    return await validateJSON(raw);
  } catch (err: any) {
    if (err?.name === "AbortError") return null;
    if (err?.name === "TimeoutError" || /timeout/i.test(String(err?.message))) {
      throw new Error("Image extraction timed out after 10 seconds.");
    }
    throw err;
  }
};

// 🟢 Extract från PDF
const extractPDF = async (
  data: File,
  signal: AbortSignal | undefined,
  apiKey: string
) => {
  const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });

  // Ladda upp fil
  const file = await openai.files.create(
    { file: data, purpose: "user_data" },
    { timeout: 10000, signal }
  );

  try {
    const response = await openai.responses.create(
      {
        model: "gpt-4o",
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: imagePromt },
              { type: "input_file", file_id: file.id },
            ],
          },
        ],
      },
      { timeout: 10000, signal }
    );

    let raw = response.output_text.trim();
    if (raw.startsWith("```")) {
      raw = raw.replace(/```[a-zA-Z]*\n?/, "").replace(/```$/, "").trim();
    }
    return await validateJSON(raw);
  } catch (err: any) {
    if (err?.name === "AbortError") return null;
    if (err?.name === "TimeoutError" || /timeout/i.test(String(err?.message))) {
      throw new Error("PDF extraction timed out after 10 seconds.");
    }
    throw err;
  }
};

export { extractImage, extractPDF };
