"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  SlidersHorizontal,
  X,
  RotateCcw,
  Check,
  Sparkles,
  Palette,
  UserCheck,
  FileText,
  Flame,
} from "lucide-react";
import { PRESET_COLORS, COLOR_DOTS, PRESET_PERSONAS } from "@/components/ThemeFormFields";

export interface FilterValues {
  status: string; // "all" | "bestseller" | "new"
  persona: string; // "all" | string
  selectedColors: string[];
  hasPitchDeck: boolean;
  hasExecutedPpts: boolean;
}

export const INITIAL_FILTERS: FilterValues = {
  status: "all",
  persona: "all",
  selectedColors: [],
  hasPitchDeck: false,
  hasExecutedPpts: false,
};

interface ThemeFilterPopoverProps {
  filters: FilterValues;
  onChange: (filters: FilterValues) => void;
  availablePersonas: string[];
  totalFilteredCount: number;
}

export function ThemeFilterPopover({
  filters,
  onChange,
  availablePersonas,
  totalFilteredCount,
}: ThemeFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Calculate active filter count
  const activeCount = useMemo(() => {
    let count = 0;
    if (filters.status !== "all") count++;
    if (filters.persona !== "all") count++;
    if (filters.selectedColors.length > 0) count += filters.selectedColors.length;
    if (filters.hasPitchDeck) count++;
    if (filters.hasExecutedPpts) count++;
    return count;
  }, [filters]);

  const handleColorToggle = (color: string) => {
    const exists = filters.selectedColors.includes(color);
    const updated = exists
      ? filters.selectedColors.filter((c) => c !== color)
      : [...filters.selectedColors, color];
    onChange({ ...filters, selectedColors: updated });
  };

  const handleReset = () => {
    onChange(INITIAL_FILTERS);
  };

  const personaOptions = useMemo(() => {
    const set = new Set<string>();
    PRESET_PERSONAS.forEach((p) => set.add(p));
    availablePersonas.forEach((p) => {
      if (p && p.trim()) set.add(p.trim());
    });
    return Array.from(set);
  }, [availablePersonas]);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* ── Trigger Button replacing the plain "Live Catalog" ── */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer shadow-xs ${
          activeCount > 0 || isOpen
            ? "bg-royal-plum text-white border-royal-plum shadow-glow-plum"
            : "bg-white text-royal-plum hover:bg-cream-dark border-dusty-pink/25 hover:border-soft-gold/50"
        }`}
        title="Open filters"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span>Filters</span>
        {activeCount > 0 ? (
          <span className="w-4 h-4 rounded-full bg-soft-gold text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {activeCount}
          </span>
        ) : (
          <div className="w-1.5 h-1.5 rounded-full bg-forest-green animate-pulse" />
        )}
      </motion.button>

      {/* ── Filtration Popover Modal Form ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-96 max-w-sm sm:max-w-md bg-white rounded-3xl shadow-card-hover border border-soft-gold/30 p-5 z-50 text-left overflow-hidden"
            style={{
              maxHeight: "min(80vh, 560px)",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-dusty-pink/15">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-soft-gold/15 flex items-center justify-center text-royal-plum">
                  <SlidersHorizontal className="w-4 h-4 text-royal-plum" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-royal-plum font-bona-nova leading-tight">
                    Filter Themes
                  </h3>
                  <p className="text-[11px] text-forest-green/70">
                    Narrow down by vibe, color & status
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {activeCount > 0 && (
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Reset all filters"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg hover:bg-cream-dark flex items-center justify-center text-royal-plum/60 hover:text-royal-plum transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Form Body */}
            <div className="space-y-4 py-4">
              {/* 1. Launch Status */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-royal-plum uppercase tracking-wider mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-soft-gold" />
                  Launch Status
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "all", label: "All" },
                    { id: "bestseller", label: "Bestseller", icon: Flame, color: "text-amber-500" },
                    { id: "new", label: "New Launch", icon: Sparkles, color: "text-emerald-500" },
                  ].map((item) => {
                    const isSelected = filters.status === item.id;
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => onChange({ ...filters, status: item.id })}
                        className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-royal-plum text-white border-royal-plum shadow-xs font-bold"
                            : "bg-cream/50 text-forest-green/80 hover:bg-cream border-dusty-pink/20 hover:border-soft-gold/40"
                        }`}
                      >
                        {Icon && <Icon className={`w-3 h-3 ${isSelected ? "text-white" : item.color}`} />}
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Client Persona */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-royal-plum uppercase tracking-wider mb-2">
                  <UserCheck className="w-3.5 h-3.5 text-soft-gold" />
                  Client Persona
                </label>
                <select
                  value={filters.persona}
                  onChange={(e) => onChange({ ...filters, persona: e.target.value })}
                  className="w-full px-3 py-2 bg-cream/50 border border-dusty-pink/30 rounded-xl text-royal-plum text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-soft-gold/40 cursor-pointer"
                >
                  <option value="all">All Client Personas</option>
                  {personaOptions.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Color Palette */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-royal-plum uppercase tracking-wider">
                    <Palette className="w-3.5 h-3.5 text-soft-gold" />
                    Color Palette
                  </label>
                  {filters.selectedColors.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onChange({ ...filters, selectedColors: [] })}
                      className="text-[10px] font-bold text-dusty-pink hover:text-royal-plum"
                    >
                      Clear colors ({filters.selectedColors.length})
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {PRESET_COLORS.map((c) => {
                    const isSelected = filters.selectedColors.includes(c);
                    const dotClass = COLOR_DOTS[c.toLowerCase()] || "bg-dusty-pink";
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => handleColorToggle(c)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-royal-plum text-white border-royal-plum shadow-xs font-bold"
                            : "bg-cream/40 text-forest-green hover:bg-cream border-dusty-pink/20 hover:border-soft-gold/40"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${dotClass} inline-block shrink-0`} />
                        <span>{c}</span>
                        {isSelected && <Check className="w-3 h-3 text-white ml-0.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 4. Assets & Decks Available */}
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-royal-plum uppercase tracking-wider mb-2">
                  <FileText className="w-3.5 h-3.5 text-soft-gold" />
                  Presentation Assets
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2 rounded-xl bg-cream/40 border border-dusty-pink/20 hover:bg-cream cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.hasPitchDeck}
                      onChange={(e) => onChange({ ...filters, hasPitchDeck: e.target.checked })}
                      className="rounded text-royal-plum focus:ring-royal-plum h-4 w-4 accent-royal-plum cursor-pointer"
                    />
                    <span className="text-xs font-medium text-royal-plum">
                      Has Pitch Deck / Presentation Link
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-cream/40 border border-dusty-pink/20 hover:bg-cream cursor-pointer transition-colors">
                    <input
                      type="checkbox"
                      checked={filters.hasExecutedPpts}
                      onChange={(e) => onChange({ ...filters, hasExecutedPpts: e.target.checked })}
                      className="rounded text-royal-plum focus:ring-royal-plum h-4 w-4 accent-royal-plum cursor-pointer"
                    />
                    <span className="text-xs font-medium text-royal-plum">
                      Has Executed PPTs Link
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Footer with counts and Done button */}
            <div className="pt-3.5 border-t border-dusty-pink/15 flex items-center justify-between">
              <span className="text-xs font-medium text-forest-green/80">
                <span className="font-bold text-royal-plum">{totalFilteredCount}</span> themes match
              </span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-royal-plum hover:bg-royal-plum/90 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
