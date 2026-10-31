"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Zap } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  resultCount?: number;
  elapsedMs?: number;
}

export function SearchBar({
  value,
  onChange,
  placeholder = "Search by theme name, keywords, persona, or venue...",
  resultCount,
  elapsedMs,
}: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMac, setIsMac] = useState(false);

  // Detect platform on mount for authentic shortcut display (⌘ vs Ctrl)
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      const platform = (navigator as any).userAgentData?.platform || navigator.platform || navigator.userAgent || "";
      setIsMac(/Mac|iPod|iPhone|iPad/i.test(platform));
    }
  }, []);

  // Global keyboard shortcut: Press "/" or "Ctrl+K" / "Cmd+K" to focus search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea or contentEditable
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      } else if (e.key === "Escape" && document.activeElement === inputRef.current) {
        if (value) {
          onChange("");
        } else {
          inputRef.current?.blur();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [value, onChange]);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative group">
        <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 pointer-events-none">
          <Search className="w-5 h-5 text-soft-gold group-focus-within:text-royal-plum transition-colors duration-200" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          spellCheck="false"
          className="w-full pl-12 pr-24 py-3.5 sm:py-4 bg-white border-2 border-soft-gold/40 focus:border-royal-plum rounded-2xl text-royal-plum font-medium placeholder:text-dusty-pink/60 focus:outline-none focus:ring-4 focus:ring-soft-gold/15 transition-all duration-200 text-sm sm:text-base shadow-card focus:shadow-glow-ochre"
        />

        {/* Right side controls: Clear button & Keyboard hint */}
        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {value ? (
            <motion.button
              type="button"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                onChange("");
                inputRef.current?.focus();
              }}
              className="w-7 h-7 rounded-full bg-cream-dark hover:bg-dusty-pink/30 flex items-center justify-center transition-colors cursor-pointer"
              title="Clear search (Esc)"
            >
              <X className="w-3.5 h-3.5 text-royal-plum" />
            </motion.button>
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.focus()}
              className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-50/90 hover:bg-white text-royal-plum/85 border border-soft-gold/40 shadow-[0_1px_2px_rgba(0,0,0,0.06),inset_0_-1px_0_rgba(0,0,0,0.04)] cursor-pointer transition-all hover:border-royal-plum/60 hover:text-royal-plum active:translate-y-px select-none"
              title={isMac ? "Press ⌘K or / to search" : "Press Ctrl+K or / to search"}
            >
              <span className="font-sans font-bold text-[10px] tracking-tight text-royal-plum/80">
                {isMac ? "⌘" : "Ctrl"}
              </span>
              <span className="text-[10px] font-bold text-soft-gold leading-none">+</span>
              <span className="font-mono font-bold text-[11px] text-royal-plum leading-none">
                K
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Real-time Search Statistics & Sub-millisecond Execution Counter */}
      <AnimatePresence>
        {value && resultCount !== undefined && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex items-center justify-center gap-2 text-xs text-forest-green/80 mt-2.5 flex-wrap"
          >
            <span className="font-semibold text-royal-plum">
              {resultCount === 0
                ? "No matching themes found"
                : `${resultCount} theme${resultCount !== 1 ? "s" : ""} found`}
            </span>

            {elapsedMs !== undefined && (
              <>
                <span className="text-dusty-pink">•</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-soft-gold/15 text-deep-ochre text-[10px] font-bold border border-soft-gold/30">
                  <Zap className="w-2.5 h-2.5 text-deep-ochre fill-deep-ochre" />
                  <span>{elapsedMs < 1 ? "< 1 ms" : `${elapsedMs} ms`}</span>
                </span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
