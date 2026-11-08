"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeCard } from "@/components/ThemeCard";
import { SearchBar } from "@/components/SearchBar";
import { Sidebar } from "@/components/Sidebar";
import { ThemePreviewModal } from "@/components/ThemePreviewModal";
import { searchThemes } from "@/lib/searchUtils";
import type { Database } from "@/lib/supabase/database.types";
import {
  Layers,
  ArrowUpDown,
  SlidersHorizontal,
  PanelLeftOpen,
  Sparkles,
  Heart,
  Clock,
  Search,
  X,
} from "lucide-react";
import {
  ThemeFilterPopover,
  FilterValues,
  INITIAL_FILTERS,
} from "@/components/ThemeFilterPopover";

type EventTheme = Database["public"]["Tables"]["event_themes"]["Row"];

interface DashboardClientProps {
  themes: EventTheme[];
  userEmail: string;
  categoriesList?: string[];
}

const DEFAULT_CATEGORIES = [
  "Haldi & Carnival",
  "Mayra & Mehendi",
  "Sangeet",
  "Wedding",
  "Birthday & Anniversary",
  "Engagement & Reception",
  "Cocktail party",
  "Divine",
  "Garba night",
];

const FAVORITES_KEY = "kv_favorites";
const RECENTLY_VIEWED_KEY = "kv_recently_viewed";
const MAX_RECENT = 20;

const isNewTheme = (theme: EventTheme) => {
  return theme.launch_status?.toLowerCase() === "new";
};

export function DashboardClient({
  themes,
  userEmail,
  categoriesList,
}: DashboardClientProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [recentlyViewed, setRecentlyViewed] = useState<EventTheme[]>([]);
  const [highlightedId, setHighlightedId] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest">("newest");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<EventTheme | null>(null);
  const [filters, setFilters] = useState<FilterValues>(INITIAL_FILTERS);

  // ── Load persisted state ──────────────────────────────────────
  useEffect(() => {
    try {
      const savedFavs = localStorage.getItem(FAVORITES_KEY);
      if (savedFavs) {
        const parsed = JSON.parse(savedFavs);
        if (Array.isArray(parsed)) {
          const ids = parsed
            .map((item) => (typeof item === "string" ? item : item?.id))
            .filter(Boolean);
          setFavorites(ids);
        }
      }

      const savedRecent = localStorage.getItem(RECENTLY_VIEWED_KEY);
      if (savedRecent) {
        const parsed = JSON.parse(savedRecent);
        if (Array.isArray(parsed)) {
          const recentThemes = parsed
            .map((item) => {
              const id = typeof item === "string" ? item : item?.id;
              return themes.find((t) => t.id === id);
            })
            .filter(Boolean) as EventTheme[];
          setRecentlyViewed(recentThemes);
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [themes]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleToggleFavorite = useCallback((id: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(id)
        ? prev.filter((f) => f !== id)
        : [...prev, id];
      try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
      return updated;
    });
  }, []);

  const handleSelectTheme = useCallback((theme: EventTheme) => {
    setHighlightedId(theme.id);
    setPreviewTheme(theme);

    setRecentlyViewed((prev) => {
      const filtered = prev.filter((t) => t.id !== theme.id);
      const updated = [theme, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem(
          RECENTLY_VIEWED_KEY,
          JSON.stringify(updated.map((t) => t.id))
        );
      } catch {
        // Ignore storage errors
      }
      return updated;
    });

    // If currently filtered and the theme wouldn't be visible, switch to "All"
    setActiveCategory((currentCat) => {
      if (
        currentCat === "All" ||
        currentCat === "Favorites" ||
        currentCat === "Recently Viewed"
      ) {
        return currentCat;
      }
      if (
        currentCat === "Bestsellers" &&
        theme.launch_status?.toLowerCase() === "bestseller"
      ) {
        return currentCat;
      }
      if (theme.category?.toLowerCase() === currentCat.toLowerCase()) {
        return currentCat;
      }
      return "All";
    });

    // Scroll card into view (main scroll container)
    setTimeout(() => {
      const el = document.getElementById(`theme-card-${theme.id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-soft-gold", "ring-offset-2");
        setTimeout(() => {
          el.classList.remove("ring-2", "ring-soft-gold", "ring-offset-2");
          setHighlightedId(undefined);
        }, 2000);
      }
    }, 120);
  }, []);

  // ── Derived data ─────────────────────────────────────────────
  const masterCategories = useMemo(() => {
    const fromProps =
      categoriesList && categoriesList.length > 0
        ? categoriesList
        : DEFAULT_CATEGORIES;
    const fromThemes = themes.map((t) => t.category).filter(Boolean);
    const combined = Array.from(new Set([...fromProps, ...fromThemes]));
    return ["All", ...combined];
  }, [categoriesList, themes]);

  // Pure categories strictly for top category bar (NO bestseller, NO favorites, NO recently viewed)
  const pureCategories = useMemo(() => {
    const excluded = new Set([
      "all",
      "bestseller",
      "bestsellers",
      "favorite",
      "favorites",
      "liked",
      "recently viewed",
      "recent",
      "recently_viewed",
    ]);

    const fromProps = categoriesList && categoriesList.length > 0 ? categoriesList : DEFAULT_CATEGORIES;
    const fromThemes = themes.map((t) => t.category).filter(Boolean) as string[];
    const set = new Set<string>();

    [...fromProps, ...fromThemes].forEach((cat) => {
      const trimmed = cat?.trim();
      if (trimmed && !excluded.has(trimmed.toLowerCase())) {
        set.add(trimmed);
      }
    });

    return ["All", ...Array.from(set)];
  }, [categoriesList, themes]);

  const categoryCounts = useMemo(() => {
    const map: Record<string, number> = {
      All: themes.length,
    };
    themes.forEach((t) => {
      if (t.category) {
        const k = t.category.trim();
        map[k] = (map[k] || 0) + 1;
      }
    });
    return map;
  }, [themes]);

  const availablePersonas = useMemo(() => {
    const list = themes.map((t) => t.client_persona).filter(Boolean) as string[];
    return Array.from(new Set(list));
  }, [themes]);

  const hasActiveFilters = useMemo(() => {
    return (
      filters.status !== "all" ||
      filters.persona !== "all" ||
      filters.selectedColors.length > 0 ||
      filters.hasPitchDeck ||
      filters.hasExecutedPpts
    );
  }, [filters]);

  const sortedThemes = useMemo(() => {
    return [...themes].sort((a, b) => {
      const da = new Date(a.created_at).getTime();
      const db = new Date(b.created_at).getTime();
      return sortOrder === "newest" ? db - da : da - db;
    });
  }, [themes, sortOrder]);

  const bestsellerCount = useMemo(() => {
    return themes.filter((t) => t.launch_status?.toLowerCase() === "bestseller").length;
  }, [themes]);

  const favoritesCount = useMemo(() => {
    return themes.filter((t) => favorites.includes(t.id)).length;
  }, [themes, favorites]);

  const sidebarSection = useMemo<"all" | "bestseller" | "favorites" | "recent">(() => {
    if (activeCategory === "Bestsellers") return "bestseller";
    if (activeCategory === "Favorites") return "favorites";
    if (activeCategory === "Recently Viewed") return "recent";
    return "all";
  }, [activeCategory]);

  const handleSelectSection = useCallback((sec: "all" | "bestseller" | "favorites" | "recent") => {
    if (sec === "bestseller") {
      setActiveCategory("Bestsellers");
    } else if (sec === "favorites") {
      setActiveCategory("Favorites");
    } else if (sec === "recent") {
      setActiveCategory("Recently Viewed");
    } else {
      setActiveCategory("All");
    }
  }, []);

  const categoryThemes = useMemo(() => {
    let baseList = sortedThemes;
    if (activeCategory === "Recently Viewed") {
      baseList = recentlyViewed;
    } else if (activeCategory === "Bestsellers") {
      baseList = baseList.filter(
        (t) => t.launch_status?.toLowerCase() === "bestseller"
      );
    } else if (activeCategory === "Favorites") {
      baseList = baseList.filter((t) => favorites.includes(t.id));
    } else if (activeCategory !== "All") {
      baseList = baseList.filter(
        (t) => t.category?.toLowerCase() === activeCategory.toLowerCase()
      );
    }

    // Apply Filter Popover selections
    if (filters.status === "bestseller") {
      baseList = baseList.filter(
        (t) => t.launch_status?.toLowerCase() === "bestseller"
      );
    } else if (filters.status === "new") {
      baseList = baseList.filter(
        (t) => isNewTheme(t) || t.launch_status?.toLowerCase() === "new"
      );
    }

    if (filters.persona !== "all") {
      baseList = baseList.filter((t) =>
        t.client_persona?.toLowerCase().includes(filters.persona.toLowerCase())
      );
    }

    if (filters.selectedColors.length > 0) {
      baseList = baseList.filter((t) => {
        if (!t.color_palette || !Array.isArray(t.color_palette)) return false;
        const lowerPalette = t.color_palette.map((c) => c.toLowerCase());
        return filters.selectedColors.some((c) =>
          lowerPalette.includes(c.toLowerCase())
        );
      });
    }

    if (filters.hasPitchDeck) {
      baseList = baseList.filter((t) => Boolean(t.theme_link || t.r2_file_key));
    }

    if (filters.hasExecutedPpts) {
      baseList = baseList.filter((t) => Boolean(t.executed_ppts_link));
    }

    return baseList;
  }, [sortedThemes, recentlyViewed, activeCategory, favorites, filters]);

  // Millisecond precision search with supreme theme name priority
  const { results: filteredThemes, elapsedMs } = useMemo(() => {
    return searchThemes(categoryThemes, search);
  }, [categoryThemes, search]);

  // ── Grid columns: adapt based on sidebar presence ─────────────
  // xl with sidebar: max 3 cols; without sidebar (collapsed): 4 cols
  const gridCols =
    "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4";

  return (
    /*
     * Outer wrapper: full viewport height minus navbar (64px).
     * overflow-hidden so the sidebar never scrolls with the page.
     * The main content area gets overflow-y-auto so only IT scrolls.
     */
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">

      {/* ════════════════════════════════════
          DESKTOP: Fixed Sidebar (lg+)
      ════════════════════════════════════ */}
      <Sidebar
        themes={sortedThemes}
        favorites={favorites}
        recentlyViewed={recentlyViewed}
        activeThemeId={highlightedId}
        onSelectTheme={handleSelectTheme}
        onToggleFavorite={handleToggleFavorite}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        activeSection={sidebarSection}
        onSelectSection={handleSelectSection}
      />

      {/* ════════════════════════════════════
          MAIN CONTENT — scrolls independently
      ════════════════════════════════════ */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* ── Hero Section ── */}
        <section className="px-4 sm:px-6 lg:px-8 pt-8 pb-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
          >
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl font-bold text-royal-plum leading-tight tracking-tight font-bona-nova">
              Kahani Ke Kisse
            </h1>
            <p className="mt-2 text-forest-green/80 text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-medium">
              Jashn aapka, kisse hamare
            </p>
          </motion.div>

          {/* Mobile sidebar toggle button */}
          <motion.div
            className="flex justify-start mt-4 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-dusty-pink/25 text-royal-plum text-xs font-semibold hover:border-soft-gold/50 hover:bg-cream-dark transition-all shadow-card"
            >
              <PanelLeftOpen className="w-4 h-4 text-royal-plum" />
              Quick Access
            </button>
          </motion.div>

          {/* ── Categories Pill Bar (Pure categories ONLY: no Bestseller, no Favorites, no Recently Viewed) ── */}
          <motion.div
            className="mt-6 mb-3 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26, delay: 0.08 }}
          >
            <div className="flex items-center gap-2 overflow-x-auto pb-2 px-1 justify-start sm:justify-center scrollbar-none flex-nowrap sm:flex-wrap">
              {pureCategories.map((cat) => {
                const isActive = activeCategory.toLowerCase() === cat.toLowerCase();
                const count = categoryCounts[cat] ?? 0;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer select-none border ${
                      isActive
                        ? "bg-royal-plum text-white border-royal-plum shadow-glow-plum scale-[1.02]"
                        : "bg-white text-forest-green/90 hover:text-royal-plum hover:bg-cream-dark border-dusty-pink/25 hover:border-soft-gold/50 shadow-xs"
                    }`}
                  >
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold leading-none ${
                        isActive
                          ? "bg-white/25 text-white"
                          : "bg-cream-dark text-royal-plum/70"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            className="mt-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26, delay: 0.12 }}
          >
            <SearchBar
              value={search}
              onChange={setSearch}
              placeholder="Search by theme name, keywords, persona, or venue..."
              resultCount={search ? filteredThemes.length : undefined}
              elapsedMs={search ? elapsedMs : undefined}
            />
          </motion.div>
        </section>

        {/* ── Results Header ── */}
        <div className="px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-4 border-b border-dusty-pink/15"
          >
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-soft-gold shrink-0" />
              <p className="text-xs sm:text-sm text-forest-green/80 font-medium">
                <span className="hidden sm:inline">Category: </span>
                <span className={`font-bold ${
                  activeCategory === "Bestsellers"
                    ? "text-purple-800"
                    : activeCategory === "Favorites"
                    ? "text-rose-700"
                    : activeCategory === "Recently Viewed"
                    ? "text-deep-ochre"
                    : "text-royal-plum"
                }`}>
                  {activeCategory}
                </span>
                <span className="text-forest-green/60"> ({filteredThemes.length} available)</span>
              </p>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {/* Sort Dropdown */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowSortMenu((s) => !s)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-royal-plum px-2.5 sm:px-3 py-1.5 rounded-xl border border-dusty-pink/20 hover:border-soft-gold/40 bg-white hover:bg-cream-dark transition-all"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">
                    {sortOrder === "newest" ? "Newest First" : "Oldest First"}
                  </span>
                </motion.button>

                <AnimatePresence>
                  {showSortMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 28 }}
                      className="absolute right-0 mt-2 w-40 bg-white/95 backdrop-blur-xl rounded-2xl shadow-card-hover border border-dusty-pink/15 py-1.5 z-30"
                      onMouseLeave={() => setShowSortMenu(false)}
                    >
                      {(["newest", "oldest"] as const).map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setSortOrder(opt);
                            setShowSortMenu(false);
                          }}
                          className={`w-full flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
                            sortOrder === opt
                              ? "text-royal-plum bg-cream font-bold"
                              : "text-forest-green hover:bg-cream"
                          }`}
                        >
                          <SlidersHorizontal className="w-3 h-3" />
                          {opt === "newest" ? "Newest First" : "Oldest First"}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* ── Filtration Form (Replaces static "Live Catalog") ── */}
              <ThemeFilterPopover
                filters={filters}
                onChange={setFilters}
                availablePersonas={availablePersonas}
                totalFilteredCount={filteredThemes.length}
              />
            </div>
          </motion.div>

          {/* ── Removable Active Filter Chips Bar ── */}
          <AnimatePresence>
            {hasActiveFilters && (
              <motion.div
                initial={{ opacity: 0, y: -6, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -6, height: 0 }}
                className="flex flex-wrap items-center gap-2 mb-4 pb-2"
              >
                <span className="text-forest-green/70 font-semibold text-[11px] uppercase tracking-wider">
                  Active filters:
                </span>

                {filters.status !== "all" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-soft-gold/15 text-royal-plum text-xs font-semibold border border-soft-gold/30">
                    <span>
                      Status:{" "}
                      <strong>
                        {filters.status === "bestseller" ? "Bestseller" : "New Launch"}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, status: "all" }))}
                      className="hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.persona !== "all" && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-soft-gold/15 text-royal-plum text-xs font-semibold border border-soft-gold/30">
                    <span>
                      Persona: <strong>{filters.persona}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, persona: "all" }))}
                      className="hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.selectedColors.map((color) => (
                  <span
                    key={color}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-soft-gold/15 text-royal-plum text-xs font-semibold border border-soft-gold/30"
                  >
                    <span>
                      Color: <strong>{color}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          selectedColors: f.selectedColors.filter((c) => c !== color),
                        }))
                      }
                      className="hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}

                {filters.hasPitchDeck && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-soft-gold/15 text-royal-plum text-xs font-semibold border border-soft-gold/30">
                    <span>Has Pitch Deck</span>
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, hasPitchDeck: false }))}
                      className="hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.hasExecutedPpts && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-soft-gold/15 text-royal-plum text-xs font-semibold border border-soft-gold/30">
                    <span>Has Executed PPTs</span>
                    <button
                      type="button"
                      onClick={() => setFilters((f) => ({ ...f, hasExecutedPpts: false }))}
                      className="hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                <button
                  type="button"
                  onClick={() => setFilters(INITIAL_FILTERS)}
                  className="text-xs text-rose-600 hover:text-rose-700 font-bold ml-1 cursor-pointer underline"
                >
                  Clear all
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── Theme Cards Grid ── */}
        <div className="px-4 sm:px-6 lg:px-8 pb-10">
          <AnimatePresence mode="popLayout">
            {filteredThemes.length > 0 ? (
              <motion.div
                layout
                className={`grid ${gridCols} gap-4 sm:gap-5 lg:gap-6`}
              >
                {filteredThemes.map((theme, index) => (
                  <div
                    key={theme.id}
                    id={`theme-card-${theme.id}`}
                    className="transition-all duration-300 rounded-3xl h-full flex flex-col"
                  >
                    <ThemeCard
                      theme={theme}
                      index={index}
                      isFavorite={favorites.includes(theme.id)}
                      isNew={isNewTheme(theme)}
                      onToggleFavorite={handleToggleFavorite}
                      onView={handleSelectTheme}
                    />
                  </div>
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="text-center py-16 sm:py-20 bg-white/50 rounded-3xl border border-dusty-pink/15 px-6"
              >
                {activeCategory === "Favorites" ? (
                  <>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-rose-50 border border-rose-200/60 flex items-center justify-center mx-auto mb-4">
                      <Heart className="w-7 h-7 text-rose-500 fill-rose-100" />
                    </div>
                    <h3 className="text-royal-plum font-bold text-base sm:text-lg mb-1.5 font-bona-nova">
                      No Favorites Saved Yet
                    </h3>
                    <p className="text-forest-green/70 text-xs sm:text-sm max-w-xs sm:max-w-md mx-auto mb-5">
                      Click the heart icon (♥) on any presentation card to save it here for fast pitch access.
                    </p>
                    <button
                      onClick={() => setActiveCategory("All")}
                      className="px-4 py-2 bg-royal-plum text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-glow-plum transition-all cursor-pointer"
                    >
                      Browse All Themes
                    </button>
                  </>
                ) : activeCategory === "Recently Viewed" ? (
                  <>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-amber-50 border border-amber-200/60 flex items-center justify-center mx-auto mb-4">
                      <Clock className="w-7 h-7 text-deep-ochre" />
                    </div>
                    <h3 className="text-royal-plum font-bold text-base sm:text-lg mb-1.5 font-bona-nova">
                      No Recently Viewed Themes
                    </h3>
                    <p className="text-forest-green/70 text-xs sm:text-sm max-w-xs sm:max-w-md mx-auto mb-5">
                      When you open or explore theme presentations, they will automatically appear here.
                    </p>
                    <button
                      onClick={() => setActiveCategory("All")}
                      className="px-4 py-2 bg-royal-plum text-white text-xs font-bold rounded-xl shadow-sm hover:shadow-glow-plum transition-all cursor-pointer"
                    >
                      Explore Themes Catalog
                    </button>
                  </>
                ) : (
                  <>
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-cream-dark flex items-center justify-center mx-auto mb-4">
                      <Search className="w-6 h-6 sm:w-7 sm:h-7 text-dusty-pink" />
                    </div>
                    <h3 className="text-royal-plum font-bold text-base sm:text-lg mb-1.5 font-bona-nova">
                      No matching themes found
                    </h3>
                    <p className="text-forest-green/70 text-xs sm:text-sm max-w-xs sm:max-w-md mx-auto">
                      Try searching with different keywords, client personas, or select &quot;All&quot; categories.
                    </p>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* ── In-Page Theme Presentation Preview Modal (Zero external tabs) ── */}
      <ThemePreviewModal
        theme={previewTheme}
        isOpen={!!previewTheme}
        onClose={() => setPreviewTheme(null)}
        isFavorite={previewTheme ? favorites.includes(previewTheme.id) : false}
        onToggleFavorite={handleToggleFavorite}
      />
    </div>
  );
}
