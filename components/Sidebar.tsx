"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Heart,
  Clock,
  LayoutGrid,
  ChevronLeft,
  ChevronRight,
  Star,
  Sparkles,
  X,
} from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";

type EventTheme = Database["public"]["Tables"]["event_themes"]["Row"];

interface SidebarProps {
  themes: EventTheme[];
  favorites: string[];
  recentlyViewed: EventTheme[];
  activeThemeId?: string;
  onSelectTheme: (theme: EventTheme) => void;
  onToggleFavorite: (id: string) => void;
  /** Mobile: controlled open state from parent */
  mobileOpen?: boolean;
  onMobileClose?: () => void;
  activeSection?: "all" | "bestseller" | "favorites" | "recent";
  onSelectSection?: (section: "all" | "bestseller" | "favorites" | "recent") => void;
}

const SIDEBAR_STORAGE_KEY = "kv_sidebar_collapsed";

// Only "NEW" if launch_status is explicitly set to "New"
const isNew = (theme: EventTheme) => {
  return theme.launch_status?.toLowerCase() === "new";
};

export function Sidebar({
  themes,
  favorites,
  recentlyViewed,
  activeThemeId,
  onSelectTheme,
  onToggleFavorite,
  mobileOpen = false,
  onMobileClose,
  activeSection: controlledSection,
  onSelectSection,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [internalSection, setInternalSection] = useState<"all" | "bestseller" | "favorites" | "recent">("all");

  const activeSection = controlledSection ?? internalSection;
  const setActiveSection = (section: "all" | "bestseller" | "favorites" | "recent") => {
    setInternalSection(section);
    onSelectSection?.(section);
  };

  // Persist collapsed state (desktop only)
  useEffect(() => {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      localStorage.setItem(SIDEBAR_STORAGE_KEY, String(!prev));
      return !prev;
    });
  };

  const favoriteThemes = themes.filter((t) => favorites.includes(t.id));
  const bestsellerThemes = themes.filter((t) => t.launch_status?.toLowerCase() === "bestseller");
  const newThemes = themes
    .filter((t) => t.launch_status?.toLowerCase() === "new")
    .sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())
    .slice(0, 5);

  const sectionItems =
    activeSection === "bestseller"
      ? bestsellerThemes
      : activeSection === "favorites"
      ? favoriteThemes
      : activeSection === "recent"
      ? recentlyViewed
      : newThemes;

  const navItems = [
    { id: "all" as const, label: "All Themes", icon: LayoutGrid, count: themes.length },
    { id: "bestseller" as const, label: "Bestsellers", icon: Sparkles, count: bestsellerThemes.length },
    { id: "favorites" as const, label: "Favorites", icon: Heart, count: favoriteThemes.length },
    { id: "recent" as const, label: "Recently Viewed", icon: Clock, count: recentlyViewed.length },
  ];

  /* ─── Shared inner content (used in both desktop & mobile) ─── */
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-dusty-pink/10 min-h-[60px] shrink-0">
        <AnimatePresence>
          {(!collapsed || isMobile) && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-2"
            >
              <Star className="w-4 h-4 text-royal-plum shrink-0" fill="currentColor" />
              <span className="text-sm font-bold text-royal-plum font-bona-nova">Quick Access</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile close button */}
        {isMobile ? (
          <button
            onClick={onMobileClose}
            className="ml-auto flex items-center justify-center w-7 h-7 rounded-lg bg-cream-dark hover:bg-dusty-pink/20 text-royal-plum transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : (
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.94 }}
            onClick={toggleCollapse}
            className="ml-auto flex items-center justify-center w-7 h-7 rounded-lg bg-cream-dark hover:bg-dusty-pink/20 text-royal-plum transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </motion.button>
        )}
      </div>

      {/* Nav Tabs */}
      <div className="flex flex-col gap-1 px-2 py-3 shrink-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          const showLabel = !collapsed || isMobile;
          return (
            <motion.button
              key={item.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-left w-full ${
                isActive
                  ? "bg-royal-plum text-white shadow-glow-plum"
                  : "hover:bg-cream-dark text-forest-green"
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? "text-white" : "text-royal-plum"
                }`}
                fill={item.id === "favorites" ? "currentColor" : "none"}
              />
              <AnimatePresence>
                {showLabel && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center justify-between flex-1 overflow-hidden"
                  >
                    <span className="text-xs font-semibold whitespace-nowrap">{item.label}</span>
                    {item.count > 0 && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          isActive ? "bg-white/20 text-white" : "bg-cream-dark text-royal-plum/70"
                        }`}
                      >
                        {item.count}
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="mx-3 border-t border-dusty-pink/10 shrink-0" />

      {/* Theme List — scrollable */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        <AnimatePresence mode="wait">
          {sectionItems.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-10 px-2 text-center"
            >
              {(!collapsed || isMobile) && (
                <>
                  {activeSection === "bestseller" ? (
                    <>
                      <Sparkles className="w-8 h-8 text-purple-400/50 mb-2" />
                      <p className="text-[11px] text-dusty-pink font-medium">
                        No bestsellers yet.<br />Themes with Bestseller badge appear here.
                      </p>
                    </>
                  ) : activeSection === "favorites" ? (
                    <>
                      <Heart className="w-8 h-8 text-dusty-pink/40 mb-2" />
                      <p className="text-[11px] text-dusty-pink font-medium">
                        No favorites yet.<br />Click ♥ on any theme.
                      </p>
                    </>
                  ) : activeSection === "recent" ? (
                    <>
                      <Clock className="w-8 h-8 text-dusty-pink/40 mb-2" />
                      <p className="text-[11px] text-dusty-pink font-medium">
                        No recently viewed.<br />Open a theme to track it.
                      </p>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-8 h-8 text-emerald-500/40 mb-2" />
                      <p className="text-[11px] text-dusty-pink font-medium">
                        No new themes yet.<br />Themes with New badge appear here.
                      </p>
                    </>
                  )}
                </>
              )}
            </motion.div>
          ) : (
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="flex flex-col gap-0.5"
            >
              {sectionItems.map((theme, idx) => {
                const displayName = theme.theme_name || theme.title || "Untitled";
                const isActiveTheme = theme.id === activeThemeId;
                const isFav = favorites.includes(theme.id);
                const newTheme = isNew(theme);
                const showLabel = !collapsed || isMobile;

                return (
                  <motion.div
                    key={theme.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(idx * 0.02, 0.3) }}
                    className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 ${
                      isActiveTheme
                        ? "bg-cream-dark border border-soft-gold/30"
                        : "hover:bg-cream-dark/70"
                    }`}
                    onClick={() => {
                      onSelectTheme(theme);
                      onMobileClose?.();
                    }}
                  >
                    {/* Left accent bar */}
                    <div
                      className={`w-1.5 h-8 rounded-full shrink-0 transition-colors ${
                        isActiveTheme
                          ? "bg-soft-gold"
                          : "bg-dusty-pink/30 group-hover:bg-dusty-pink/60"
                      }`}
                    />

                    {showLabel && (
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {newTheme && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-500 text-white text-[9px] font-bold rounded-full uppercase tracking-wide">
                              <Sparkles className="w-2 h-2" />
                              New
                            </span>
                          )}
                          <p
                            className={`text-[11px] font-semibold truncate ${
                              isActiveTheme ? "text-royal-plum" : "text-forest-green"
                            }`}
                          >
                            {displayName}
                          </p>
                        </div>
                        <p className="text-[10px] text-dusty-pink truncate">{theme.category}</p>
                      </div>
                    )}

                    {/* Fav button */}
                    {showLabel && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(theme.id);
                        }}
                        title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                        className={`shrink-0 p-1 rounded-lg hover:bg-red-50 transition-all cursor-pointer ${
                          isFav ? "opacity-100" : "opacity-60 sm:opacity-0 sm:group-hover:opacity-100"
                        }`}
                      >
                        <Heart
                          className={`w-3 h-3 ${isFav ? "text-red-400" : "text-dusty-pink"}`}
                          fill={isFav ? "currentColor" : "none"}
                        />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      {(!collapsed || isMobile) && (
        <div className="px-4 py-3 border-t border-dusty-pink/10 shrink-0">
          <p className="text-[10px] text-dusty-pink/60 font-medium text-center">
            {activeSection === "all"
              ? `${newThemes.length} new ${newThemes.length === 1 ? "theme" : "themes"}`
              : `${sectionItems.length} ${sectionItems.length === 1 ? "theme" : "themes"}`}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* ═══════════════════════════════════════════
          DESKTOP SIDEBAR — fixed height, never scrolls
      ═══════════════════════════════════════════ */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 260 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden lg:flex flex-col h-full bg-white/90 backdrop-blur-xl border-r border-dusty-pink/15 shrink-0 overflow-hidden"
      >
        <SidebarContent />
      </motion.aside>

      {/* ═══════════════════════════════════════════
          MOBILE SIDEBAR — slide-in drawer overlay
      ═══════════════════════════════════════════ */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={onMobileClose}
            />

            {/* Drawer panel */}
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-2xl border-r border-dusty-pink/15 flex flex-col lg:hidden"
            >
              <SidebarContent isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
