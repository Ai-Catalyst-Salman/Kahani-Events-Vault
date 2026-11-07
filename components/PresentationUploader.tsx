"use client";

import { useState, useRef, ChangeEvent, DragEvent, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Eye,
  FileCheck,
  Maximize2,
  Minimize2,
  Download,
  Loader2,
} from "lucide-react";
import {
  uploadFileToR2,
  formatFileSize,
  saveRemoteFile,
  UploadProgressInfo,
} from "@/lib/r2Upload";
import { maxBytesForFolder } from "@/lib/security/uploadPolicy";
import { safeHttpsUrl, safePresentationEmbed } from "@/lib/security/urls";

interface PresentationUploaderProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

function isPdfFile(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

export function PresentationUploader({
  value,
  onChange,
  disabled = false,
}: PresentationUploaderProps) {
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progressInfo, setProgressInfo] = useState<UploadProgressInfo | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileSize, setUploadedFileSize] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // In-Page Modal Viewer State
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const uploadSeq = useRef(0);
  const uploadAbort = useRef<AbortController | null>(null);
  const downloadAbort = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      uploadAbort.current?.abort();
      downloadAbort.current?.abort();
    };
  }, []);

  // Enter Full Screen across the entire window/monitor using HTML5 Fullscreen API
  const enterFullscreen = async () => {
    try {
      const el = modalContainerRef.current || document.documentElement;
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) {
          await el.requestFullscreen();
        } else if ((el as any).webkitRequestFullscreen) {
          await (el as any).webkitRequestFullscreen();
        }
      }
    } catch {
      // Graceful fallback to CSS fullscreen
    }
    setIsFullscreen(true);
  };

  // Exit Full Screen
  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      }
    } catch {
      // Ignore
    }
    setIsFullscreen(false);
  };

  // Close Modal Completely
  const handleCloseModal = async () => {
    await exitFullscreen();
    setIsPreviewOpen(false);
  };

  // Listen for native Fullscreen API changes (e.g. user presses Esc)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const hasFullscreen = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(hasFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
    };
  }, []);

  // Close or exit fullscreen when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isPreviewOpen) {
        if (isFullscreen || document.fullscreenElement) {
          exitFullscreen();
        } else {
          handleCloseModal();
        }
      }
    };
    if (isPreviewOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isPreviewOpen, isFullscreen]);

  // Reset fullscreen when closed
  useEffect(() => {
    if (!isPreviewOpen) {
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen();
        } catch {
          // Ignore
        }
      }
      setIsFullscreen(false);
    }
  }, [isPreviewOpen]);

  const handleFile = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const allowed = ["pdf", "ppt", "pptx"];
    if (!allowed.includes(extension) || file.size <= 0 || file.size > maxBytesForFolder("presentations")) {
      setErrorMessage(
        file.size > maxBytesForFolder("presentations")
          ? "Presentations must be 80 MB or smaller."
          : "Please select a valid presentation file (.pdf, .ppt, or .pptx)."
      );
      return;
    }

    uploadAbort.current?.abort();
    const controller = new AbortController();
    uploadAbort.current = controller;
    const seq = ++uploadSeq.current;

    setErrorMessage(null);
    setIsUploading(true);
    setProgressInfo(null);
    setUploadedFileName(file.name);
    setUploadedFileSize(file.size);

    try {
      const result = await uploadFileToR2(
        file,
        "presentations",
        (progress) => {
          if (seq === uploadSeq.current) setProgressInfo(progress);
        },
        { signal: controller.signal }
      );

      if (seq !== uploadSeq.current) return;
      if (result.publicUrl) onChange(result.publicUrl);
    } catch (err) {
      if (seq !== uploadSeq.current || (err instanceof DOMException && err.name === "AbortError")) return;
      setErrorMessage(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      if (seq === uploadSeq.current) setIsUploading(false);
    }
  };

  const cancelUpload = () => {
    uploadSeq.current += 1;
    uploadAbort.current?.abort();
    setIsUploading(false);
    setProgressInfo(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const onFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) handleFile(file);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!disabled && !isUploading) setIsDragging(true);
  };

  const onDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isUploading) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleClear = () => {
    uploadSeq.current += 1;
    uploadAbort.current?.abort();
    onChange("");
    setIsUploading(false);
    setUploadedFileName("");
    setUploadedFileSize(0);
    setProgressInfo(null);
    setErrorMessage(null);
    setIsPreviewOpen(false);
    setIsFullscreen(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isR2Stored =
    value && (value.includes(".r2.") || value.includes(".r2.dev"));
  const embedSrc = safePresentationEmbed(value);
  const isPdf = embedSrc ? isPdfFile(embedSrc) || isPdfFile(value) : false;

  // Direct trigger download in the same tab (strictly no target="_blank")
  const handleDownload = async () => {
    const downloadUrl = safeHttpsUrl(value);
    if (!downloadUrl || isDownloading) return;
    downloadAbort.current?.abort();
    const controller = new AbortController();
    downloadAbort.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    setIsDownloading(true);
    const ext = isPdf ? ".pdf" : ".pptx";
    const downloadName = (uploadedFileName || "presentation_deck").replace(/\.[^/.]+$/, "") + ext;
    try {
      await saveRemoteFile(downloadUrl, downloadName, controller.signal);
    } catch (err) {
      if (controller.signal.aborted) return;
      if (err instanceof Error && err.message === "too_large") {
        setErrorMessage("That file is too large to download in the browser.");
        return;
      }
      if (!controller.signal.aborted) {
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = downloadName;
        a.rel = "noopener noreferrer";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } finally {
      window.clearTimeout(timeout);
      if (mounted.current) setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-royal-plum/70 uppercase tracking-wider">
          Presentation Deck (PDF / PPT / PPTX)
        </span>
        <div className="flex items-center gap-1 p-0.5 bg-cream rounded-xl border border-dusty-pink/25 text-xs">
          <button
            type="button"
            onClick={() => setUploadMode("file")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              uploadMode === "file"
                ? "bg-royal-plum text-white shadow-xs"
                : "text-forest-green hover:text-royal-plum"
            }`}
          >
            Direct Upload (R2)
          </button>
          <button
            type="button"
            onClick={() => setUploadMode("url")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
              uploadMode === "url"
                ? "bg-royal-plum text-white shadow-xs"
                : "text-forest-green hover:text-royal-plum"
            }`}
          >
            Paste Link
          </button>
        </div>
      </div>

      {uploadMode === "file" ? (
        <div className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"
            onChange={onFileInputChange}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {/* DRAG AND DROP ZONE */}
          {!value && !isUploading && (
            <motion.div
              whileHover={{ scale: disabled ? 1 : 1.005 }}
              whileTap={{ scale: disabled ? 1 : 0.995 }}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => !disabled && fileInputRef.current?.click()}
              className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed cursor-pointer text-center transition-all duration-200 ${
                isDragging
                  ? "border-royal-plum bg-royal-plum/5 shadow-md"
                  : "border-dusty-pink/35 bg-white/70 hover:bg-white hover:border-soft-gold"
              } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <div className="flex flex-col items-center justify-center gap-2.5">
                <div className="w-12 h-12 rounded-2xl bg-cream-dark border border-dusty-pink/20 flex items-center justify-center text-royal-plum shadow-xs">
                  <UploadCloud className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-bold text-royal-plum">
                    Click to browse or drag & drop presentation deck
                  </p>
                  <p className="text-[11px] text-forest-green/70 mt-0.5">
                    Supports high-res PDF and PowerPoint (.pptx). Stored on Cloudflare R2 with inline preview.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ASYNCHRONOUS PROGRESS BAR (FOR 35MB+ FILES) */}
          {isUploading && (
            <div className="p-5 rounded-2xl border border-dusty-pink/25 bg-white shadow-card space-y-3.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-plum-gradient text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-royal-plum truncate">
                      {uploadedFileName}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-forest-green/80 mt-0.5">
                      <span>
                        {progressInfo
                          ? `${progressInfo.formattedLoaded} / ${progressInfo.formattedTotal}`
                          : formatFileSize(uploadedFileSize)}
                      </span>
                      {progressInfo?.formattedSpeed && (
                        <>
                          <span className="text-dusty-pink">•</span>
                          <span className="font-semibold text-deep-ochre">
                            {progressInfo.formattedSpeed}
                          </span>
                        </>
                      )}
                      {progressInfo?.estimatedSecondsRemaining &&
                      progressInfo.estimatedSecondsRemaining > 0 ? (
                        <>
                          <span className="text-dusty-pink">•</span>
                          <span>~{progressInfo.estimatedSecondsRemaining}s left</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-sm font-bold text-royal-plum font-bona-nova">
                    {progressInfo?.percent ?? 0}%
                  </span>
                </div>
              </div>

              {/* Smooth Progress Bar */}
              <div className="w-full h-2.5 bg-cream-dark rounded-full overflow-hidden border border-dusty-pink/20 p-0.5">
                <motion.div
                  className="h-full bg-plum-gradient rounded-full transition-all duration-200"
                  style={{ width: `${progressInfo?.percent ?? 2}%` }}
                />
              </div>

              <div className="flex items-center justify-center">
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="px-3 py-1.5 rounded-xl border border-dusty-pink/30 text-royal-plum text-[11px] font-bold hover:bg-cream"
                >
                  Cancel upload
                </button>
              </div>
            </div>
          )}

          {/* UPLOADED FILE STATUS CARD */}
          {value && !isUploading && (
            <div className="p-4 rounded-2xl border border-dusty-pink/25 bg-white shadow-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-royal-plum truncate">
                      {uploadedFileName || value.split("/").pop() || "Presentation Ready"}
                    </span>
                    {isR2Stored && (
                      <span className="px-2 py-0.5 rounded-md bg-soft-gold/15 text-deep-ochre text-[9px] font-bold tracking-wider uppercase border border-soft-gold/30 shrink-0">
                        Cloudflare R2
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 shrink-0" /> Ready for in-page presentation preview
                  </p>
                </div>
              </div>

              {/* Actions: In-page Preview only, NO new tabs */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    if (!embedSrc) {
                      setErrorMessage("This link can't be previewed. Use an https PDF, PowerPoint, or Google Drive file link.");
                      return;
                    }
                    setIsPreviewOpen(true);
                  }}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-royal-plum text-white shadow-glow-plum hover:bg-royal-plum/90 transition-all cursor-pointer"
                  title="Open in-page preview"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 rounded-xl text-dusty-pink hover:text-royal-plum hover:bg-cream transition-colors cursor-pointer"
                  title="Replace Presentation"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleClear}
                  className="p-2 rounded-xl text-dusty-pink hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  title="Remove Presentation"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ERROR ALERT */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3.5 bg-red-50/90 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-900"
              >
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-red-800">Upload Issue</p>
                  <p className="text-[11px] text-red-700 mt-0.5">{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-red-500 hover:text-red-800 p-1 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* MANUAL URL INPUT MODE */
        <div className="relative">
          <input
            type="url"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Paste an https PDF, PowerPoint, or Google Drive link"
            maxLength={2000}
            disabled={disabled}
            className="w-full px-4 py-3 pr-24 bg-cream/50 border border-dusty-pink/30 rounded-2xl text-royal-plum font-semibold placeholder:text-dusty-pink/60 focus:outline-none focus:ring-2 focus:ring-soft-gold/40 text-xs sm:text-sm shadow-xs"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {value && (
              <button
                type="button"
                onClick={() => {
                  if (!embedSrc) {
                    setErrorMessage("This link can't be previewed. Use an https PDF, PowerPoint, or Google Drive file link.");
                    return;
                  }
                  setIsPreviewOpen(true);
                }}
                className="px-2.5 py-1 bg-royal-plum text-white text-xs font-bold rounded-lg shadow-xs hover:bg-royal-plum/90 transition-all cursor-pointer flex items-center gap-1"
                title="Preview"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Preview</span>
              </button>
            )}
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1.5 text-dusty-pink hover:text-royal-plum transition-colors cursor-pointer"
                title="Clear Link"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* ─── IN-PAGE PREVIEW MODAL (ENTIRE WINDOW FULLSCREEN & IN-TAB DOWNLOAD) ─── */}
      <AnimatePresence>
        {isPreviewOpen && embedSrc && (
          <div
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-all ${
              isFullscreen ? "p-0" : "p-0 sm:p-3 md:p-6"
            }`}
            onClick={isFullscreen ? undefined : handleCloseModal}
          >
            <motion.div
              ref={modalContainerRef}
              initial={{ opacity: 0, scale: 0.97, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 8 }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
              className={`bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-200 ${
                isFullscreen
                  ? "fixed inset-0 z-[100] w-full h-full w-screen h-screen rounded-none border-none m-0 relative"
                  : "w-full h-full sm:h-[94vh] sm:max-h-[96vh] sm:max-w-6xl rounded-none sm:rounded-3xl border border-dusty-pink/25 relative"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ─── FLOATING FULLSCREEN CONTROLS (ONLY VISIBLE IN FULLSCREEN) ─── */}
              {isFullscreen && (
                <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-[120] flex items-center gap-1.5 sm:gap-2 bg-royal-plum/90 hover:bg-royal-plum text-white backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-2xl border border-white/20 transition-all">
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                    title="Download Presentation"
                  >
                    {isDownloading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">
                      {isDownloading ? "Downloading..." : "Download"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={exitFullscreen}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-soft-gold hover:bg-soft-gold/90 text-royal-plum text-xs font-bold transition-all cursor-pointer shadow-xs"
                    title="Exit Full Screen (Esc)"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                    <span>Exit Full Screen</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="p-1 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
                    title="Close Preview"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Modal Header (HIDDEN IN FULLSCREEN) */}
              {!isFullscreen && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3.5 sm:px-6 py-2 sm:py-3 bg-cream border-b border-dusty-pink/20 gap-2 shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-plum-gradient text-white flex items-center justify-center shrink-0 shadow-xs">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] text-forest-green font-semibold">
                          {isPdf ? "PDF Document" : "PowerPoint Deck"}
                        </span>
                      </div>
                      <h3 className="text-sm sm:text-base font-bold text-royal-plum font-bona-nova truncate">
                        {uploadedFileName || "Presentation Deck Preview"}
                      </h3>
                    </div>
                  </div>

                  {/* Header Action Buttons: Full Screen, Download, Close */}
                  <div className="flex items-center gap-1.5 sm:gap-2 justify-end shrink-0">
                    {/* Full Screen in entire window */}
                    <button
                      type="button"
                      onClick={enterFullscreen}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap bg-white border border-dusty-pink/30 hover:border-royal-plum text-royal-plum hover:bg-cream-dark"
                      title="Full Screen in entire window"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-royal-plum shrink-0" />
                      <span className="text-[11px] sm:text-xs">Full Screen</span>
                    </button>

                    {/* Download in this tab */}
                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="px-3 py-1.5 rounded-xl bg-plum-gradient text-white text-xs font-bold flex items-center gap-1.5 shadow-sm hover:shadow-glow-plum transition-all cursor-pointer whitespace-nowrap disabled:opacity-60"
                      title="Download Presentation"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                      ) : (
                        <Download className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span className="text-[11px] sm:text-xs">
                        {isDownloading ? "Downloading..." : "Download"}
                      </span>
                    </button>

                    {/* Close Preview Button */}
                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-dusty-pink/30 hover:border-royal-plum text-royal-plum text-xs font-bold flex items-center gap-1 bg-white hover:bg-cream-dark transition-all cursor-pointer shrink-0"
                      title="Close Preview"
                    >
                      <X className="w-4 h-4 text-royal-plum" />
                      <span className="hidden sm:inline">Close</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Modal Body: Responsive Iframe Canvas (Full height fill) */}
              <div className="flex-1 w-full bg-cream-dark/40 relative overflow-hidden min-h-0">
                <iframe
                  src={embedSrc}
                  className="w-full h-full border-none bg-white block absolute inset-0"
                  referrerPolicy="no-referrer"
                  allowFullScreen
                  title="Presentation Preview"
                />
              </div>

              {/* Modal Footer (HIDDEN IN FULLSCREEN) */}
              {!isFullscreen && (
                <div className="px-3.5 sm:px-6 py-2 sm:py-2.5 bg-cream border-t border-dusty-pink/20 flex items-center justify-between shrink-0">
                  <span className="text-[10px] sm:text-[11px] text-forest-green/70 font-medium hidden sm:inline">
                    Presentation preview. Full Screen expands to the entire screen.
                  </span>
                  <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
                    <button
                      type="button"
                      onClick={enterFullscreen}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 border border-dusty-pink/30 hover:border-royal-plum text-royal-plum text-xs font-bold rounded-xl bg-white hover:bg-cream-dark transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Full Screen</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownload}
                      disabled={isDownloading}
                      className="px-3 sm:px-4 py-1.5 sm:py-2 bg-white border border-dusty-pink/30 hover:border-soft-gold text-royal-plum text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {isDownloading ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Download className="w-3.5 h-3.5 text-deep-ochre" />
                      )}
                      <span>Download</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCloseModal}
                      className="px-4 sm:px-5 py-1.5 sm:py-2 bg-plum-gradient text-white text-xs font-bold rounded-xl shadow-glow-plum hover:shadow-lg transition-all cursor-pointer uppercase tracking-wider"
                    >
                      Close
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
