"use client";

import Cropper from "cropperjs";
import {
  ClipboardPaste,
  Copy,
  Crop,
  Download,
  Eraser,
  ExternalLink,
  ImagePlus,
  Link2,
  Loader2,
  Maximize,
  RefreshCcw,
  RotateCcw,
  RotateCw,
  Trash2,
  Upload
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent
} from "react";
import { RequiredMark } from "@/components/required-mark";

const BOARD_SIZE = 1600;
const MAX_SOURCE_SIZE = 25 * 1024 * 1024;
const HISTORY_KEY = "image_tool_history";

type OutputFormat = "image/webp" | "image/jpeg" | "image/png";

type UploadHistoryItem = {
  fileName: string;
  key: string;
  url: string;
  size: number;
  createdAt: string;
};

type ToastState = {
  message: string;
  error: boolean;
};

function extensionFor(format: OutputFormat) {
  if (format === "image/jpeg") return "jpg";
  if (format === "image/png") return "png";
  return "webp";
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;

  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }

  return `${size.toFixed(size >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function cleanBaseFilename(value: string) {
  return (
    value
      .trim()
      .replace(/\.(webp|jpe?g|png)$/i, "")
      .replace(/[<>:"|?*\\/]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "product-image"
  );
}

function defaultFilename(value: string) {
  return cleanBaseFilename(value.replace(/\.[^.]+$/, ""));
}

function readHistory() {
  try {
    const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
    return Array.isArray(value) ? (value as UploadHistoryItem[]).slice(0, 30) : [];
  } catch {
    return [];
  }
}

export function ImageToLinkConverter() {
  const sourceImageRef = useRef<HTMLImageElement>(null);
  const finalCanvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const objectUrlRef = useRef("");
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sourceUrl, setSourceUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("image/webp");
  const [previewInfo, setPreviewInfo] = useState("1600×1600 • WEBP");
  const [finalBlob, setFinalBlob] = useState<Blob | null>(null);
  const [finalLink, setFinalLink] = useState("");
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [pasting, setPasting] = useState(false);
  const [converting, setConverting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((message: string, error = false) => {
    setToast({ message, error });

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => setToast(null), 3200);
  }, []);

  const drawBlankCanvas = useCallback(() => {
    const canvas = finalCanvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;

    canvas.width = BOARD_SIZE;
    canvas.height = BOARD_SIZE;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);
    context.fillStyle = "#3F5F70";
    context.font = "bold 50px Arial, sans-serif";
    context.textAlign = "center";
    context.fillText("Final White Board Preview", BOARD_SIZE / 2, BOARD_SIZE / 2 - 20);
    context.fillStyle = "#64748b";
    context.font = "32px Arial, sans-serif";
    context.fillText("1600 × 1600 • White Background", BOARD_SIZE / 2, BOARD_SIZE / 2 + 46);
  }, []);

  const generateFinalBoard = useCallback(
    async (showReadyMessage = true) => {
      const cropper = cropperRef.current;
      const canvas = finalCanvasRef.current;
      if (!cropper || !canvas) {
        showToast("Upload or paste an image first.", true);
        return null;
      }

      const cropped = cropper.getCroppedCanvas({
        maxWidth: 5000,
        maxHeight: 5000,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: "high"
      });
      const context = canvas.getContext("2d");

      if (!cropped || !context) {
        showToast("Unable to crop this image. Reset and try again.", true);
        return null;
      }

      canvas.width = BOARD_SIZE;
      canvas.height = BOARD_SIZE;
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

      const scale = Math.min(BOARD_SIZE / cropped.width, BOARD_SIZE / cropped.height);
      const width = Math.round(cropped.width * scale);
      const height = Math.round(cropped.height * scale);
      const x = Math.round((BOARD_SIZE - width) / 2);
      const y = Math.round((BOARD_SIZE - height) / 2);
      context.drawImage(cropped, x, y, width, height);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, outputFormat, 1);
      });

      if (!blob) {
        showToast("Unable to create the final image.", true);
        return null;
      }

      setFinalBlob(blob);
      setPreviewInfo(
        `${BOARD_SIZE}×${BOARD_SIZE} • ${extensionFor(outputFormat).toUpperCase()} • ${formatBytes(blob.size)}`
      );

      if (showReadyMessage) {
        showToast("White board preview is ready.");
      }

      return blob;
    },
    [outputFormat, showToast]
  );

  const clearOutputLink = useCallback(() => {
    setFinalLink("");
    setCopied(false);
  }, []);

  const loadImageFile = useCallback(
    (file: File, pasted = false) => {
      if (!file.type.startsWith("image/")) {
        showToast("Please select an image file.", true);
        return;
      }

      if (file.size > MAX_SOURCE_SIZE) {
        showToast("Source image must be 25 MB or smaller.", true);
        return;
      }

      cropperRef.current?.destroy();
      cropperRef.current = null;

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }

      const objectUrl = URL.createObjectURL(file);
      objectUrlRef.current = objectUrl;
      setSourceUrl(objectUrl);
      setFileName((current) => current || defaultFilename(file.name || "product-image"));
      setFinalBlob(null);
      clearOutputLink();
      showToast(pasted ? "Image pasted." : "Image loaded.");
    },
    [clearOutputLink, showToast]
  );

  const onSourceImageLoad = useCallback(() => {
    const image = sourceImageRef.current;
    if (!image) return;

    cropperRef.current?.destroy();
    cropperRef.current = new Cropper(image, {
      viewMode: 1,
      dragMode: "move",
      autoCropArea: 0.9,
      background: false,
      responsive: true,
      checkOrientation: true,
      movable: true,
      zoomable: true,
      rotatable: true,
      scalable: false,
      ready() {
        window.requestAnimationFrame(() => {
          void generateFinalBoard(false);
        });
      }
    });
  }, [generateFinalBoard]);

  useEffect(() => {
    const historyFrame = window.requestAnimationFrame(() => setHistory(readHistory()));
    drawBlankCanvas();

    const onPaste = (event: ClipboardEvent) => {
      const imageItem = Array.from(event.clipboardData?.items || []).find((item) =>
        item.type.startsWith("image/")
      );
      const file = imageItem?.getAsFile();

      if (file) {
        event.preventDefault();
        loadImageFile(file, true);
      }
    };

    document.addEventListener("paste", onPaste);

    return () => {
      document.removeEventListener("paste", onPaste);
      cropperRef.current?.destroy();
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      window.cancelAnimationFrame(historyFrame);
    };
  }, [drawBlankCanvas, loadImageFile]);

  useEffect(() => {
    const previewFrame = window.requestAnimationFrame(() => {
      if (cropperRef.current) {
        void generateFinalBoard(false);
      } else {
        setPreviewInfo(
          `${BOARD_SIZE}×${BOARD_SIZE} • ${extensionFor(outputFormat).toUpperCase()}`
        );
        drawBlankCanvas();
      }
    });

    return () => window.cancelAnimationFrame(previewFrame);
  }, [drawBlankCanvas, generateFinalBoard, outputFormat]);

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) loadImageFile(file);
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer.files?.[0];
    if (file) loadImageFile(file);
  }

  async function pasteImage() {
    if (!navigator.clipboard?.read) {
      showToast("Paste button is unavailable in this browser. Use Ctrl + V.", true);
      return;
    }

    setPasting(true);

    try {
      const clipboardItems = await navigator.clipboard.read();

      for (const clipboardItem of clipboardItems) {
        const imageType = clipboardItem.types.find((type) => type.startsWith("image/"));
        if (!imageType) continue;

        const blob = await clipboardItem.getType(imageType);
        const extension = imageType.split("/")[1]?.replace("jpeg", "jpg") || "png";
        const file = new File([blob], `pasted-image.${extension}`, { type: imageType });
        loadImageFile(file, true);
        return;
      }

      showToast("Clipboard does not contain an image.", true);
    } catch (error) {
      const permissionDenied =
        error instanceof DOMException &&
        (error.name === "NotAllowedError" || error.name === "SecurityError");
      showToast(
        permissionDenied
          ? "Allow clipboard access, then try Paste Image again."
          : "Unable to read an image from the clipboard.",
        true
      );
    } finally {
      setPasting(false);
    }
  }

  function invalidateOutput() {
    setFinalBlob(null);
    clearOutputLink();
  }

  function rotate(degrees: number) {
    cropperRef.current?.rotate(degrees);
    invalidateOutput();
  }

  function applyCrop() {
    cropperRef.current?.crop();
    invalidateOutput();
  }

  function clearCrop() {
    cropperRef.current?.clear();
    invalidateOutput();
  }

  function resetAll() {
    cropperRef.current?.destroy();
    cropperRef.current = null;

    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = "";
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setSourceUrl("");
    setFileName("");
    setFinalBlob(null);
    clearOutputLink();
    setPreviewInfo(`${BOARD_SIZE}×${BOARD_SIZE} • ${extensionFor(outputFormat).toUpperCase()}`);
    drawBlankCanvas();
    showToast("Reset completed.");
  }

  async function downloadImage() {
    const blob = await generateFinalBoard(false);
    if (!blob) return;

    const filename = `${cleanBaseFilename(fileName)}.${extensionFor(outputFormat)}`;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("Image downloaded.");
  }

  function saveHistory(item: UploadHistoryItem) {
    const nextHistory = [item, ...history].slice(0, 30);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    setHistory(nextHistory);
  }

  async function convertToLink() {
    const blob = await generateFinalBoard(false);
    if (!blob) return;

    const baseName = cleanBaseFilename(fileName);
    const filename = `${baseName}.${extensionFor(outputFormat)}`;
    const formData = new FormData();
    formData.append("file", blob, filename);
    formData.append("fileName", baseName);
    setConverting(true);

    try {
      const response = await fetch("/api/image-to-link", {
        method: "POST",
        body: formData
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok || !result.ok || !result.url) {
        throw new Error(result.error || "Unable to convert image to link.");
      }

      const item: UploadHistoryItem = {
        fileName: result.fileName || filename,
        key: result.key || "",
        url: result.url,
        size: Number(result.size) || blob.size,
        createdAt: new Date().toISOString()
      };
      setFinalLink(item.url);
      saveHistory(item);
      showToast("Image link is ready.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to convert image to link.", true);
    } finally {
      setConverting(false);
    }
  }

  async function copyLink(value = finalLink) {
    if (!value) {
      showToast("No image link to copy.", true);
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      showToast("Image link copied.");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      showToast("Clipboard access is unavailable.", true);
    }
  }

  function clearHistory() {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
    showToast("History cleared.");
  }

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Image to Link Converter</h1>
        <p className="text-sm text-slate-500">Prepare product images and create shareable links.</p>
      </div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)] xl:items-start">
        <section className="panel min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase text-navy">Step 1</div>
              <h2 className="mt-1 text-base font-black text-slate-950">Upload and Crop</h2>
            </div>
            <button
              type="button"
              className="btn-secondary w-full sm:w-auto"
              onClick={() => void pasteImage()}
              disabled={pasting}
              aria-busy={pasting}
            >
              {pasting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <ClipboardPaste className="h-4 w-4" aria-hidden="true" />
              )}
              {pasting ? "Pasting..." : "Paste Image"}
            </button>
          </div>

          <label
            htmlFor="image-converter-input"
            className={`flex min-h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed p-5 text-center transition ${
              dragActive
                ? "border-navy bg-mist/20"
                : "border-mist bg-rose/40 hover:border-navy hover:bg-rose"
            }`}
            onDragEnter={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragActive(false);
            }}
            onDrop={onDrop}
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-md bg-mist text-ink">
              <ImagePlus className="h-6 w-6" aria-hidden="true" />
            </span>
            <strong className="text-sm text-slate-950">
              Choose, drop, or paste an image
              <RequiredMark />
            </strong>
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <ClipboardPaste className="h-3.5 w-3.5" aria-hidden="true" />
              Ctrl + V is supported
            </span>
            <input
              ref={fileInputRef}
              id="image-converter-input"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={onFileChange}
            />
          </label>

          {sourceUrl ? (
            <div className="mt-4 min-h-80 overflow-hidden rounded-md border border-line bg-white sm:min-h-96">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={sourceImageRef}
                src={sourceUrl}
                alt="Source image for cropping"
                className="block max-h-[560px] max-w-full"
                onLoad={onSourceImageLoad}
              />
            </div>
          ) : null}

          <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <button
              type="button"
              className="btn-primary col-span-2 sm:w-auto"
              disabled={!sourceUrl}
              onClick={() => void generateFinalBoard()}
              title="Fit to White Board"
            >
              <Maximize className="h-4 w-4" aria-hidden="true" />
              Fit to White Board
            </button>
            <button
              type="button"
              className="btn-secondary px-3"
              disabled={!sourceUrl}
              onClick={() => rotate(-90)}
              title="Rotate Left"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Left</span>
            </button>
            <button
              type="button"
              className="btn-secondary px-3"
              disabled={!sourceUrl}
              onClick={() => rotate(90)}
              title="Rotate Right"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Right</span>
            </button>
            <button
              type="button"
              className="btn-secondary px-3"
              disabled={!sourceUrl}
              onClick={applyCrop}
            >
              <Crop className="h-4 w-4" aria-hidden="true" />
              Crop
            </button>
            <button
              type="button"
              className="btn-secondary px-3"
              disabled={!sourceUrl}
              onClick={clearCrop}
            >
              <Eraser className="h-4 w-4" aria-hidden="true" />
              Clear Crop
            </button>
            <button
              type="button"
              className="btn-danger col-span-2 px-3 sm:w-auto"
              disabled={!sourceUrl}
              onClick={resetAll}
            >
              <RefreshCcw className="h-4 w-4" aria-hidden="true" />
              Reset
            </button>
          </div>
        </section>

        <section className="panel min-w-0 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
            <div>
              <div className="text-xs font-bold uppercase text-navy">Step 2</div>
              <h2 className="mt-1 text-base font-black text-slate-950">Final Preview</h2>
            </div>
            <span className="text-xs font-bold text-slate-500">{previewInfo}</span>
          </div>

          <div className="aspect-square w-full overflow-hidden rounded-md border border-line bg-white p-2 shadow-sm">
            <canvas
              ref={finalCanvasRef}
              width={BOARD_SIZE}
              height={BOARD_SIZE}
              className="h-full w-full rounded-md border border-cloud bg-white"
              aria-label="Final white board preview"
            />
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label htmlFor="image-output-name">
              <span className="field-label">File Name</span>
              <input
                id="image-output-name"
                className="field-input"
                value={fileName}
                onChange={(event) => setFileName(event.target.value)}
                placeholder="product-image"
              />
            </label>
            <label htmlFor="image-output-format">
              <span className="field-label">Output Format</span>
              <select
                id="image-output-format"
                className="field-input"
                value={outputFormat}
                onChange={(event) => setOutputFormat(event.target.value as OutputFormat)}
              >
                <option value="image/webp">WebP</option>
                <option value="image/jpeg">JPG</option>
                <option value="image/png">PNG</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className="btn-secondary w-full"
              disabled={!sourceUrl}
              onClick={() => void downloadImage()}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Download Image
            </button>
            <button
              type="button"
              className="btn-primary w-full"
              disabled={!sourceUrl || converting}
              onClick={() => void convertToLink()}
            >
              {converting ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Upload className="h-4 w-4" aria-hidden="true" />
              )}
              {converting ? "Converting..." : "Convert to Link"}
            </button>
          </div>

          <div className="mt-4 rounded-md border border-line bg-rose/30 p-3">
            <label htmlFor="image-final-link">
              <span className="field-label">Image Link URL</span>
              <textarea
                id="image-final-link"
                className="field-input min-h-20 resize-y"
                value={finalLink}
                readOnly
                placeholder="Final image link will appear here"
              />
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                className="btn-secondary w-full sm:w-auto"
                disabled={!finalLink}
                onClick={() => void copyLink()}
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                {copied ? "Copied" : "Copy"}
              </button>
              <a
                href={finalLink || undefined}
                target="_blank"
                rel="noopener noreferrer"
                className={`btn-secondary w-full sm:w-auto ${
                  finalLink ? "" : "pointer-events-none opacity-50"
                }`}
                aria-disabled={!finalLink}
              >
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Open Image
              </a>
            </div>
          </div>

          {finalBlob ? (
            <div className="mt-3 text-xs font-semibold text-slate-500">
              Ready: {formatBytes(finalBlob.size)}
            </div>
          ) : null}
        </section>
      </div>

      <section className="border-t border-line pt-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-slate-950">Recent Uploads</h2>
            <p className="text-xs text-slate-500">Saved in this browser</p>
          </div>
          <button
            type="button"
            className="btn-secondary px-3"
            disabled={!history.length}
            onClick={clearHistory}
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            Clear History
          </button>
        </div>

        {history.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {history.map((item) => (
              <article
                key={`${item.createdAt}-${item.key}`}
                className="rounded-md border border-line bg-white p-3"
              >
                <div className="truncate font-black text-slate-950">{item.fileName}</div>
                <div className="mt-1 truncate text-xs text-slate-500" title={item.key}>
                  {item.key}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatBytes(item.size)} · {new Date(item.createdAt).toLocaleString()}
                </div>
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    className="btn-secondary px-3 py-1.5"
                    onClick={() => void copyLink(item.url)}
                    title="Copy Link"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary px-3 py-1.5"
                    title="Open Image"
                  >
                    <Link2 className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-md border border-dashed border-line bg-white/60 px-4 py-8 text-center text-sm text-slate-500">
            No uploads yet.
          </div>
        )}
      </section>

      {toast ? (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-[calc(100%-2.5rem)] rounded-md px-4 py-3 text-sm font-bold text-white shadow-lg ${
            toast.error ? "bg-red-700" : "bg-ink"
          }`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
