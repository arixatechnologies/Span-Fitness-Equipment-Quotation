import { readFile } from "node:fs/promises";
import path from "node:path";

type PdfImageName = "top" | "bottom" | "phoneIconBig" | "phoneIcon" | "webIcon";

type PdfImageCandidate = {
  file: string;
  mime: string;
};

export type PdfChromeImages = {
  top?: string;
  bottom?: string;
  phoneIconBig?: string;
  phoneIcon?: string;
  webIcon?: string;
};

const imageCandidates: Record<PdfImageName, PdfImageCandidate[]> = {
  top: [
    { file: "header-banner.png", mime: "image/png" },
    { file: "top.png", mime: "image/png" },
    { file: "top.jpg", mime: "image/jpeg" },
    { file: "top.jpeg", mime: "image/jpeg" },
    { file: "top.webp", mime: "image/webp" }
  ],
  bottom: [
    { file: "brands-footer.png", mime: "image/png" },
    { file: "bottom.png", mime: "image/png" },
    { file: "bottom.jpg", mime: "image/jpeg" },
    { file: "bottom.jpeg", mime: "image/jpeg" },
    { file: "bottom.webp", mime: "image/webp" }
  ],
  phoneIconBig: [
    { file: "phone-icon-big.png", mime: "image/png" },
    { file: "phone-icon-big.jpg", mime: "image/jpeg" },
    { file: "phone-icon-big.jpeg", mime: "image/jpeg" },
    { file: "phone-icon-big.webp", mime: "image/webp" }
  ],
  phoneIcon: [
    { file: "phone-icon.png", mime: "image/png" },
    { file: "phone-icon.jpg", mime: "image/jpeg" },
    { file: "phone-icon.jpeg", mime: "image/jpeg" },
    { file: "phone-icon.webp", mime: "image/webp" }
  ],
  webIcon: [
    { file: "web-icon.png", mime: "image/png" },
    { file: "web-icon.jpg", mime: "image/jpeg" },
    { file: "web-icon.jpeg", mime: "image/jpeg" },
    { file: "web-icon.webp", mime: "image/webp" }
  ]
};

async function readPdfImage(name: PdfImageName) {
  for (const candidate of imageCandidates[name]) {
    const filePath = path.join(process.cwd(), "public", "pdf", candidate.file);

    try {
      const buffer = await readFile(filePath);
      return `data:${candidate.mime};base64,${buffer.toString("base64")}`;
    } catch (error) {
      if (typeof error === "object" && error && "code" in error && error.code === "ENOENT") {
        continue;
      }

      throw error;
    }
  }

  return undefined;
}

export async function getPdfChromeImages(): Promise<PdfChromeImages> {
  const [top, bottom, phoneIconBig, phoneIcon, webIcon] = await Promise.all([
    readPdfImage("top"),
    readPdfImage("bottom"),
    readPdfImage("phoneIconBig"),
    readPdfImage("phoneIcon"),
    readPdfImage("webIcon")
  ]);

  return { top, bottom, phoneIconBig, phoneIcon, webIcon };
}
