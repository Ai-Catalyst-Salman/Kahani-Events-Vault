"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { useState } from "react";
import {
  Eye,
  Download,
  IndianRupee,
  Sparkles,
  Heart,
} from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeImageUrl, isGoogleDriveUrl } from "@/lib/imageUtils";

type EventTheme = Database["public"]["Tables"]["event_themes"]["Row"];

interface ThemeCardProps {
  theme: EventTheme;
  index: number;
  isFavorite?: boolean;
  isNew?: boolean;
  onToggleFavorite?: (id: string) => void;
  onView?: (theme: EventTheme) => void;
}

export function ThemeCard({
  theme,
  index,
  isFavorite = false,
  isNew = false,
  onToggleFavorite,
  onView,
}: ThemeCardProps) {
  const [imageError, setImageError] = useState(false);
  const [favHover, setFavHover] = useState(false);

  const displayName = theme.theme_name || theme.title || "Untitled Theme";
  const presentationLink = theme.theme_link || (theme.r2_file_key ? theme.thumbnail_url : null);
  const safeThumbnailUrl = normalizeImageUrl(theme.thumbnail_url);
  const isGD = isGoogleDriveUrl(safeThumbnailUrl);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 24,
        delay: index * 0.04,
      }}
      whileHover={{
        scale: 1.02,
        transition: { type: "spring", stiffness: 400, damping: 20 },
      }}
      className="group relative bg-white rounded-3xl shadow-card hover:shadow-glow-ochre border border-dusty-pink/15 hover:border-soft-gold/40 flex flex-col overflow-hidden transition-all duration-300 w-full h-full cursor-pointer"
      onClick={() => onView?.(theme)}
    >
      {/* ── 1. Top Banner / Preview Image ── */}
      <div className="relative aspect-[16/10] overflow-hidden bg-cream-dark shrink-0">
        {safeThumbnailUrl && !imageError ? (
          <Image
            src={safeThumbnailUrl}
            alt={displayName}
            fill
            unoptimized={isGD}
            className="object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
            onError={() => setImageError(true)}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-cream via-cream-dark to-[#EDE5D8] p-4 text-center">
            <div className="relative w-16 h-12 mb-2 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Kahani Events"
                width={64}
                height={46}
                className="object-contain drop-shadow-xs"
              />
            </div>
            <span className="text-xs font-semibold text-royal-plum/70 tracking-wide uppercase font-bona-nova">
              {theme.category}
            </span>
          </div>
        )}

        {/* Category Pill */}
        <div className="absolute top-3 left-3 z-10">
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-white/95 backdrop-blur-md text-royal-plum text-xs font-bold rounded-full border border-dusty-pink/20 shadow-sm">
            {theme.category}
          </span>
        </div>

        {/* NEW badge */}
        {isNew && !theme.launch_status && (
          <div className="absolute top-3 right-3 z-10">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full shadow-md uppercase tracking-wider bg-emerald-500 text-white shadow-emerald-700/25">
              <Sparkles className="w-3 h-3" />
              New
            </span>
          </div>
        )}

        {/* Launch Status Badge (New / Bestseller) */}
        {theme.launch_status && (
          <div className="absolute top-3 right-3 z-10">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-full shadow-md uppercase tracking-wider ${
                theme.launch_status.toLowerCase() === "bestseller"
                  ? "bg-purple-700 text-white shadow-purple-900/20"
                  : "bg-emerald-600 text-white shadow-emerald-800/20"
              }`}
            >
              <Sparkles className="w-3 h-3" />
              {theme.launch_status}
            </span>
          </div>
        )}

        {/* Favorite Heart Button */}
        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite?.(theme.id);
          }}
          onHoverStart={() => setFavHover(true)}
          onHoverEnd={() => setFavHover(false)}
          whileTap={{ scale: 0.85 }}
          className={`absolute bottom-3 right-3 z-10 p-2 rounded-full backdrop-blur-md transition-all duration-200 cursor-pointer ${
            isFavorite
              ? "bg-red-50/95 border border-red-200 opacity-100 shadow-sm"
              : "bg-white/85 border border-dusty-pink/30 opacity-80 sm:opacity-0 sm:group-hover:opacity-100 hover:bg-white"
          }`}
          title={isFavorite ? "Remove from Favorites" : "Add to Favorites"}
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isFavorite ? "text-red-500" : favHover ? "text-red-400" : "text-dusty-pink"
            }`}
            fill={isFavorite ? "currentColor" : "none"}
          />
        </motion.button>
      </div>

      {/* ── 2. Content Body: Uniform Height Across All Cards ── */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          {/* Theme Title - fixed min height so all cards align evenly */}
          <h3
            className="text-royal-plum font-bold text-base sm:text-lg leading-snug line-clamp-2 min-h-[3rem] group-hover:text-deep-ochre transition-colors duration-200 font-bona-nova"
            title={displayName}
          >
            {displayName}
          </h3>

          {/* Budget / Price */}
          <div className="mt-3 flex items-center justify-between py-2 px-3 rounded-2xl bg-cream/60 border border-dusty-pink/15">
            <span className="text-[11px] font-bold uppercase tracking-wider text-forest-green/70">
              Budget / Price
            </span>
            <div className="flex items-center gap-1 text-royal-plum font-bold text-xs sm:text-sm">
              <IndianRupee className="w-3.5 h-3.5 text-soft-gold flex-shrink-0" />
              <span>{theme.total_event_value || "On Request"}</span>
            </div>
          </div>
        </div>

        {/* ── 3. Action Links: Preview Theme In-Page ── */}
        <div className="pt-4 mt-4 border-t border-dusty-pink/10 flex items-center gap-2">
          {presentationLink ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onView?.(theme);
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-plum-gradient text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-glow-plum transition-all duration-200 cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5" />
              Preview Theme
            </button>
          ) : (
            <span className="flex-1 py-2.5 text-center text-xs text-dusty-pink font-semibold bg-cream/40 rounded-xl">
              Link pending
            </span>
          )}

          {theme.material_download_link && (
            <a
              href={theme.material_download_link}
              download
              title="Download Materials"
              onClick={(e) => {
                e.stopPropagation();
              }}
              className="p-2.5 rounded-xl border border-dusty-pink/20 hover:border-soft-gold text-royal-plum hover:bg-cream transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-deep-ochre" />
            </a>
          )}
        </div>
      </div>

      {/* Ochre glow hover line */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1 bg-gold-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        initial={false}
      />
    </motion.article>
  );
}
