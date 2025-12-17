import * as pdfjsLib from "pdfjs-dist";
import "pdfjs-dist/build/pdf.worker.entry";

// 🚀 Din gamla kan ligga kvar – används för bara första sidan
export async function pdfFirstPageToImageFile(pdfFile: File): Promise<File> {
  const pdfUrl = URL.createObjectURL(pdfFile);
  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;
  const page = await pdf.getPage(1);

  const scale = 2;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d")!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvasContext: context, viewport }).promise;

  const blob: Blob = await new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/png"),
  );

  URL.revokeObjectURL(pdfUrl);

  return new File([blob], pdfFile.name.replace(/\.pdf$/i, ".png"), {
    type: "image/png",
  });
}

// 🚀 Ny funktion → konverterar ALLA sidor
export async function pdfToImages(pdfFile: File): Promise<File[]> {
  const pdfUrl = URL.createObjectURL(pdfFile);
  const pdf = await pdfjsLib.getDocument(pdfUrl).promise;

  const files: File[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    const scale = 2;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d")!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: context, viewport }).promise;

    const blob: Blob = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b!), "image/png"),
    );

    files.push(
      new File([blob], `${pdfFile.name.replace(/\.pdf$/i, "")}-page${pageNum}.png`, {
        type: "image/png",
      }),
    );
  }

  URL.revokeObjectURL(pdfUrl);

  return files;
}
