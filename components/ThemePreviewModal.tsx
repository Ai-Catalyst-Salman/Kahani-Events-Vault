"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  X,
  FileText,
  IndianRupee,
  Heart,
  Sparkles,
  MapPin,
  Users,
  Download,
  Tag,
  Maximize2,
  Minimize2,
  Loader2,
} from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeImageUrl, isGoogleDriveUrl } from "@/lib/imageUtils";
import { safeHttpsUrl, safePresentationEmbed } from "@/lib/security/urls";
import { saveRemoteFile } from "@/lib/r2Upload";

type EventTheme = Database["public"]["Tables"]["event_themes"]["Row"];

interface ThemePreviewModalProps {
  theme: EventTheme | null;
  isOpen: boolean;
  onClose: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
}

function isPdfFile(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith(".pdf");
  } catch {
    return false;
  }
}

export function ThemePreviewModal({
  theme,
  isOpen,
  onClose,
  isFavorite = false,
  onToggleFavorite,
}: ThemePreviewModalProps) {
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const downloadAbort = useRef<AbortController | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
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
      // Graceful fallback to CSS fullscreen if browser blocks API
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

  // Close Preview Completely
  const handleClose = async () => {
    await exitFullscreen();
    onClose();
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

  // Close or exit fullscreen on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        if (isFullscreen || document.fullscreenElement) {
          exitFullscreen();
        } else {
          handleClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, isFullscreen]);

  // Reset fullscreen when closed
  useEffect(() => {
    if (!isOpen) {
      if (document.fullscreenElement) {
        try {
          document.exitFullscreen();
        } catch {
          // Ignore
        }
      }
      setIsFullscreen(false);
    }
  }, [isOpen]);

  if (!theme) return null;

  const displayName = theme.theme_name || theme.title || "Untitled Theme";
  const presentationLink = safeHttpsUrl(
    theme.theme_link || (theme.r2_file_key ? theme.thumbnail_url : null)
  );
  const safeThumbnailUrl = normalizeImageUrl(theme.thumbnail_url);
  const isGD = isGoogleDriveUrl(safeThumbnailUrl);
  const embedSrc = safePresentationEmbed(
    theme.theme_link || (theme.r2_file_key ? theme.thumbnail_url : null)
  );
  const materialHref = safeHttpsUrl(theme.material_download_link);

  const ext = presentationLink && isPdfFile(presentationLink) ? ".pdf" : ".pptx";
  const downloadFilename = `${displayName.replace(/[^a-zA-Z0-9_-]/g, "_")}${ext}`;

  const handleDownload = async () => {
    if (!presentationLink || isDownloading) return;
    downloadAbort.current?.abort();
    const controller = new AbortController();
    downloadAbort.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), 20000);
    setIsDownloading(true);
    try {
      await saveRemoteFile(presentationLink, downloadFilename, controller.signal);
    } catch (err) {
      if (controller.signal.aborted || (err instanceof Error && err.message === "too_large")) return;
      if (!controller.signal.aborted) {
        const a = document.createElement("a");
        a.href = presentationLink;
        a.download = downloadFilename;
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
    <AnimatePresence>
      {isOpen && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-all ${
            isFullscreen ? "p-0" : "p-0 sm:p-3 md:p-6"
          }`}
          onClick={isFullscreen ? undefined : handleClose}
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
                {presentationLink && (
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
                )}

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
                  onClick={handleClose}
                  className="p-1 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition-all cursor-pointer"
                  title="Close Preview"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ─── RESPONSIVE HEADER (HIDDEN IN FULLSCREEN) ─── */}
            {!isFullscreen && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between px-3.5 sm:px-6 py-2 sm:py-3 bg-cream border-b border-dusty-pink/20 gap-2 shrink-0">
                {/* Title & Category */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-plum-gradient text-white flex items-center justify-center shrink-0 shadow-xs">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                      <span className="px-2 py-0.5 rounded-full bg-white border border-dusty-pink/25 text-royal-plum text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                        {theme.category}
                      </span>
                      {theme.launch_status && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-700 text-white text-[9px] sm:text-[10px] font-bold uppercase tracking-wider">
                          <Sparkles className="w-2 h-2" />
                          {theme.launch_status}
                        </span>
                      )}
                    </div>
                    <h2 className="text-sm sm:text-base md:text-lg font-bold text-royal-plum font-bona-nova truncate">
                      {displayName}
                    </h2>
                  </div>
                </div>

                {/* ACTION BUTTONS: FULL SCREEN & DOWNLOAD */}
                <div className="flex items-center gap-1.5 sm:gap-2 justify-end shrink-0">
                  {/* 1. FULL SCREEN (ENTIRE WINDOW) BUTTON */}
                  <button
                    type="button"
                    onClick={enterFullscreen}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs whitespace-nowrap bg-white border border-dusty-pink/30 hover:border-royal-plum text-royal-plum hover:bg-cream-dark"
                    title="Full Screen in entire window"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-royal-plum shrink-0" />
                    <span className="text-[11px] sm:text-xs">Full Screen</span>
                  </button>

                  {/* 2. DOWNLOAD BUTTON */}
                  {presentationLink && (
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
                  )}

                  {/* Favorite Toggle */}
                  {onToggleFavorite && (
                    <button
                      type="button"
                      onClick={() => onToggleFavorite(theme.id)}
                      className={`p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                        isFavorite
                          ? "bg-red-50 border-red-200 text-red-500"
                          : "bg-white border-dusty-pink/25 text-dusty-pink hover:text-red-400"
                      }`}
                      title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
                    >
                      <Heart className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill={isFavorite ? "currentColor" : "none"} />
                    </button>
                  )}

                  {/* Close Button */}
                  <button
                    type="button"
                    onClick={handleClose}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl border border-dusty-pink/30 hover:border-royal-plum text-royal-plum text-xs font-bold flex items-center gap-1 bg-white hover:bg-cream-dark transition-all cursor-pointer shrink-0"
                    title="Close Preview"
                  >
                    <X className="w-4 h-4 text-royal-plum" />
                    <span className="hidden sm:inline">Close</span>
                  </button>
                </div>
              </div>
            )}

            {/* ─── METADATA STRIP (RESPONSIVE) ─── */}
            {!isFullscreen && (
              <div className="px-3.5 sm:px-6 py-1.5 sm:py-2 bg-cream/50 border-b border-dusty-pink/15 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs shrink-0">
                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-forest-green/80">
                  {theme.total_event_value && (
                    <div className="inline-flex items-center gap-1 font-bold text-royal-plum">
                      <IndianRupee className="w-3 h-3 text-soft-gold" />
                      <span>{theme.total_event_value}</span>
                    </div>
                  )}

                  {theme.client_persona && (
                    <div className="hidden xs:flex items-center gap-1">
                      <Users className="w-3 h-3 text-soft-gold" />
                      <span className="font-semibold text-royal-plum truncate max-w-[150px] sm:max-w-none">
                        {theme.client_persona}
                      </span>
                    </div>
                  )}

                  {theme.ideal_venue && (
                    <div className="hidden sm:flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-soft-gold" />
                      <span className="truncate max-w-[140px] sm:max-w-none">{theme.ideal_venue}</span>
                    </div>
                  )}

                  {theme.keywords && (
                    <div className="hidden md:flex items-center gap-1">
                      <Tag className="w-3 h-3 text-soft-gold" />
                      <span className="truncate max-w-[200px] text-forest-green/75">
                        {theme.keywords}
                      </span>
                    </div>
                  )}
                </div>

                {materialHref && (
                  <a
                    href={materialHref}
                    rel="noopener noreferrer"
                    download
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-white border border-dusty-pink/30 hover:border-soft-gold text-royal-plum text-[10px] sm:text-xs font-bold rounded-lg transition-all cursor-pointer ml-auto"
                  >
                    <Download className="w-3 h-3 text-deep-ochre" />
                    <span>Materials Pack</span>
                  </a>
                )}
              </div>
            )}

            {/* ─── PRESENTATION VIEWER IFRAME (RESPONSIVE FULL HEIGHT) ─── */}
            <div className="flex-1 w-full bg-cream-dark/40 relative overflow-hidden min-h-0">
              {embedSrc ? (
                <iframe
                  src={embedSrc}
                  className="w-full h-full border-none bg-white block absolute inset-0"
                  referrerPolicy="no-referrer"
                  allowFullScreen
                  title={displayName}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-cream/30">
                  {safeThumbnailUrl && (
                    <div className="relative w-36 sm:w-48 h-24 sm:h-32 rounded-2xl overflow-hidden shadow-card border border-dusty-pink/20 mb-3">
                      <Image
                        src={safeThumbnailUrl}
                        alt={displayName}
                        fill
                        unoptimized={isGD}
                        className="object-cover"
                      />
                    </div>
                  )}
                  <h3 className="text-sm sm:text-base font-bold text-royal-plum font-bona-nova mb-1">
                    Presentation Deck Pending
                  </h3>
                  <p className="text-[11px] sm:text-xs text-forest-green/70 max-w-sm">
                    This theme&apos;s presentation deck is currently being curated. Please check back shortly.
                  </p>
                </div>
              )}
            </div>

            {/* ─── RESPONSIVE FOOTER (HIDDEN IN FULLSCREEN) ─── */}
            {!isFullscreen && (
              <div className="px-3.5 sm:px-6 py-2 sm:py-2.5 bg-cream border-t border-dusty-pink/20 flex items-center justify-between shrink-0">
                <span className="text-[10px] sm:text-[11px] text-forest-green/70 font-medium hidden sm:inline">
                  In-tab presentation view. Full Screen expands within this browser tab.
                </span>
                <div className="flex items-center gap-2 ml-auto w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleClose}
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
  );
}
