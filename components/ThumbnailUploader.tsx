"use client";

import { useState, useEffect, useRef, ChangeEvent, DragEvent } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  ImageIcon,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { normalizeImageUrl, isGoogleDriveUrl } from "@/lib/imageUtils";
import { uploadFileToR2, formatFileSize } from "@/lib/r2Upload";
import { maxBytesForFolder } from "@/lib/security/uploadPolicy";

interface ThumbnailUploaderProps {
  value: string;
  onChange: (url: string) => void;
  disabled?: boolean;
}

export function ThumbnailUploader({
  value,
  onChange,
  disabled = false,
}: ThumbnailUploaderProps) {
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string>("");
  const [uploadedFileSize, setUploadedFileSize] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [imgStatus, setImgStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadSeq = useRef(0);
  const uploadAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      uploadAbort.current?.abort();
    };
  }, []);

  const normalizedUrl = normalizeImageUrl(value);
  const isGD = isGoogleDriveUrl(value);
  const isR2Stored = value && (value.includes(".r2.") || value.includes(".r2.dev"));

  // When value changes, verify image can load
  useEffect(() => {
    if (!normalizedUrl) {
      setImgStatus("idle");
      return;
    }
    let cancelled = false;
    setImgStatus("loading");

    const testImg = new window.Image();
    const timer = window.setTimeout(() => {
      if (!cancelled) setImgStatus("error");
      testImg.src = "";
    }, 12000);
    testImg.onload = () => {
      if (cancelled) return;
      window.clearTimeout(timer);
      setImgStatus("success");
    };
    testImg.onerror = () => {
      if (cancelled) return;
      window.clearTimeout(timer);
      setImgStatus("error");
    };
    testImg.src = normalizedUrl;

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      testImg.onload = null;
      testImg.onerror = null;
    };
  }, [normalizedUrl]);

  const handleFile = async (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const allowed = ["jpg", "jpeg", "png", "webp", "gif"];
    if (extension === "svg" || file.type === "image/svg+xml" || !allowed.includes(extension)) {
      setErrorMessage("Please select a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (file.size <= 0 || file.size > maxBytesForFolder("thumbnails")) {
      setErrorMessage("Cover images must be 8 MB or smaller.");
      return;
    }

    uploadAbort.current?.abort();
    const controller = new AbortController();
    uploadAbort.current = controller;
    const seq = ++uploadSeq.current;

    setErrorMessage(null);
    setIsUploading(true);
    setUploadProgress(0);
    setUploadedFileName(file.name);
    setUploadedFileSize(file.size);

    try {
      const result = await uploadFileToR2(
        file,
        "thumbnails",
        (progress) => {
          if (seq === uploadSeq.current) setUploadProgress(progress.percent);
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
    setUploadProgress(0);
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
    setErrorMessage(null);
    setImgStatus("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-3">
      {/* Mode toggle */}
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold text-royal-plum/70 uppercase tracking-wider">
          Cover Image Source
        </span>
        <div className="flex items-center gap-1 p-0.5 bg-cream rounded-xl border border-dusty-pink/25 text-xs">
          <button
            type="button"
            onClick={() => setUploadMode("file")}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
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
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
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
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
            onChange={onFileInputChange}
            className="hidden"
            disabled={disabled || isUploading}
          />

          {/* DROPZONE */}
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
                    Click to browse or drag & drop cover image
                  </p>
                  <p className="text-[11px] text-forest-green/70 mt-0.5">
                    PNG, JPG, WebP, or GIF up to 8 MB. Stored directly on Cloudflare R2.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* UPLOADING PROGRESS */}
          {isUploading && (
            <div className="p-5 rounded-2xl border border-dusty-pink/25 bg-white shadow-xs space-y-3">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-plum-gradient text-white flex items-center justify-center shrink-0">
                    <ImageIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-royal-plum truncate">{uploadedFileName}</p>
                    <p className="text-[10px] text-forest-green/70">
                      Uploading to Cloudflare R2 ({formatFileSize(uploadedFileSize)})
                    </p>
                  </div>
                </div>
                <span className="font-bold text-royal-plum shrink-0">{uploadProgress}%</span>
              </div>

              {/* Bar */}
              <div className="w-full h-2 bg-cream-dark rounded-full overflow-hidden border border-dusty-pink/20">
                <motion.div
                  className="h-full bg-plum-gradient rounded-full transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <div className="flex justify-end">
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

          {/* ERROR ALERT */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="p-3 bg-red-50/90 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-900"
              >
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-red-800">Upload Issue</p>
                  <p className="text-[11px] text-red-700 mt-0.5">{errorMessage}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setErrorMessage(null)}
                  className="text-red-500 hover:text-red-800 p-1"
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
            placeholder="Paste a public https image link"
            maxLength={2000}
            disabled={disabled}
            className="w-full px-4 py-3 pr-10 bg-cream/50 border border-dusty-pink/30 rounded-2xl text-royal-plum font-semibold placeholder:text-dusty-pink/60 focus:outline-none focus:ring-2 focus:ring-soft-gold/40 text-xs sm:text-sm shadow-xs"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-dusty-pink hover:text-royal-plum transition-colors"
              title="Clear Link"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* ─── LIVE PREVIEW BOX (SHARED ACROSS BOTH MODES) ─── */}
      {normalizedUrl && !isUploading && (
        <div className="p-3.5 rounded-2xl border border-dusty-pink/20 bg-white shadow-xs transition-all">
          {imgStatus === "loading" && (
            <div className="flex items-center gap-3 py-1">
              <Loader2 className="w-5 h-5 animate-spin text-royal-plum shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-royal-plum">Checking image link...</p>
                <p className="text-[11px] text-forest-green/70 truncate">Verifying access with image host</p>
              </div>
            </div>
          )}

          {imgStatus === "success" && (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative w-16 h-12 rounded-xl overflow-hidden bg-cream-dark shrink-0 border border-dusty-pink/20 shadow-xs">
                  <Image
                    src={normalizedUrl}
                    alt="Preview"
                    fill
                    unoptimized={isGD}
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>Thumbnail verified</span>
                    </div>
                    {isR2Stored && (
                      <span className="px-2 py-0.5 rounded-md bg-soft-gold/15 text-deep-ochre text-[9px] font-bold tracking-wider uppercase border border-soft-gold/30 shrink-0">
                        Cloudflare R2
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-forest-green/70 truncate mt-0.5">
                    Card will display this cover image on the showroom
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={normalizedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl text-dusty-pink hover:text-royal-plum hover:bg-cream transition-colors"
                  title="Open full image in new tab"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
                {uploadMode === "file" && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl text-dusty-pink hover:text-royal-plum hover:bg-cream transition-colors"
                    title="Replace image"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-2 rounded-xl text-dusty-pink hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Remove image"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {imgStatus === "error" && (
            <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-950 leading-relaxed">
                  <p className="font-bold mb-1 text-sm text-royal-plum">
                    Image Preview Blocked
                  </p>
                  {isGD ? (
                    <div className="space-y-1.5 text-[11px] text-forest-green">
                      <p>
                        Google Drive blocked this image because file access is set to{" "}
                        <strong className="text-red-700">Restricted</strong>.
                      </p>
                      <div className="bg-white/80 p-2.5 rounded-lg border border-amber-200/60 font-medium">
                        <p className="font-bold text-royal-plum mb-0.5">How to fix in Google Drive:</p>
                        <ol className="list-decimal list-inside space-y-0.5 text-forest-green/90">
                          <li>Open Google Drive and right-click your image file.</li>
                          <li>Click <strong>Share</strong>.</li>
                          <li>Under <strong>General access</strong>, change from <em>Restricted</em> to <strong>&quot;Anyone with the link&quot;</strong>.</li>
                          <li>Click <strong>Done</strong>.</li>
                        </ol>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-forest-green">
                      The image URL could not be loaded. Please ensure the link is publicly accessible.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
