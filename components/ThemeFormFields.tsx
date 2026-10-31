"use client";

import React from "react";
import {
  Tag,
  PlusCircle,
  Sparkles,
  Link as LinkIcon,
  ExternalLink,
  IndianRupee,
  Check,
} from "lucide-react";
import { PresentationUploader } from "@/components/PresentationUploader";
import { ThumbnailUploader } from "@/components/ThumbnailUploader";
import type { Database } from "@/lib/supabase/database.types";

type ThemeCategory = Database["public"]["Tables"]["theme_categories"]["Row"];

export const PRESET_PERSONAS = [
  "The Traditional Luxury Family",
  "The Modern Couple",
  "The Value Aspirational Family",
];

export const PRESET_COLORS = [
  "Pink", "Green", "Yellow", "Blue", "Red",
  "Multicolour", "Pastels", "Purple", "Orange", "Dark Brown", "Cream",
];

export const COLOR_DOTS: Record<string, string> = {
  pink: "bg-pink-400",
  green: "bg-emerald-600",
  yellow: "bg-amber-400",
  blue: "bg-sky-500",
  red: "bg-rose-500",
  multicolour: "bg-gradient-to-r from-pink-400 via-amber-300 to-sky-400",
  pastels: "bg-gradient-to-r from-purple-200 via-pink-200 to-yellow-200",
  purple: "bg-purple-600",
  orange: "bg-orange-500",
  "dark brown": "bg-amber-900",
  cream: "bg-amber-100 border border-amber-300",
};

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold text-royal-plum uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

export function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-4 py-3 bg-cream/50 border border-dusty-pink/30 rounded-2xl text-royal-plum font-semibold placeholder:text-dusty-pink/60 focus:outline-none focus:ring-2 focus:ring-soft-gold/40 text-sm shadow-xs ${props.className ?? ""}`}
    />
  );
}

interface ThemeFormFieldsProps {
  name: string;
  setName: (v: string) => void;
  cat: string;
  setCat: (v: string) => void;
  kw: string;
  setKw: (v: string) => void;
  link: string;
  setLink: (v: string) => void;
  pptsLink: string;
  setPptsLink: (v: string) => void;
  persona: string;
  setPersona: (v: string) => void;
  colors: string[];
  setColors: (v: string[]) => void;
  custColor: string;
  setCustColor: (v: string) => void;
  eventValue: string;
  setEventValue: (v: string) => void;
  venue: string;
  setVenue: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  matLink: string;
  setMatLink: (v: string) => void;
  thumbUrl: string;
  setThumbUrl: (v: string) => void;
  notes: string;
  setNotes: (v: string) => void;
  categoriesList: ThemeCategory[];
  showInlineCatInput?: boolean;
  setShowInlineCatInput?: (v: boolean) => void;
  inlineCategoryInput?: string;
  setInlineCategoryInput?: (v: string) => void;
  onAddInlineCategory?: () => void;
  categoryLoading?: boolean;
  isEdit?: boolean;
}

export function ThemeFormFields({
  name, setName,
  cat, setCat,
  kw, setKw,
  link, setLink,
  pptsLink, setPptsLink,
  persona, setPersona,
  colors, setColors,
  custColor, setCustColor,
  eventValue, setEventValue,
  venue, setVenue,
  status, setStatus,
  matLink, setMatLink,
  thumbUrl, setThumbUrl,
  notes, setNotes,
  categoriesList,
  showInlineCatInput = false,
  setShowInlineCatInput,
  inlineCategoryInput = "",
  setInlineCategoryInput,
  onAddInlineCategory,
  categoryLoading = false,
  isEdit = false,
}: ThemeFormFieldsProps) {

  const toggleColor = (color: string) => {
    setColors(colors.includes(color) ? colors.filter((c) => c !== color) : [...colors, color]);
  };

  const handleAddCustomColor = () => {
    const trimmed = custColor.trim();
    if (trimmed && !colors.includes(trimmed)) {
      setColors([...colors, trimmed]);
      setCustColor("");
    }
  };

  return (
    <div className="space-y-7">
      {/* Section 1: Core Identity */}
      <div className="space-y-4">
        <h3 className="text-xs font-bold text-royal-plum uppercase tracking-widest flex items-center gap-2">
          <Tag className="w-4 h-4 text-royal-plum" /> 1. Core Identity
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Theme Name <span className="text-red-500">*</span></FieldLabel>
            <FieldInput
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Mithu Aur Anar Ki Shaam"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <FieldLabel>Category <span className="text-red-500">*</span></FieldLabel>
              {!isEdit && setShowInlineCatInput && (
                <button
                  type="button"
                  onClick={() => setShowInlineCatInput(!showInlineCatInput)}
                  className="text-[11px] font-bold text-deep-ochre hover:text-royal-plum flex items-center gap-1 cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  {showInlineCatInput ? "Cancel" : "+ New"}
                </button>
              )}
            </div>

            {!isEdit && showInlineCatInput && setInlineCategoryInput && onAddInlineCategory && (
              <div className="flex gap-2 mb-2 p-2 bg-cream rounded-xl border border-soft-gold/50">
                <input
                  type="text"
                  value={inlineCategoryInput}
                  onChange={(e) => setInlineCategoryInput(e.target.value)}
                  placeholder="New category name"
                  className="flex-1 px-3 py-1.5 bg-white border border-dusty-pink/30 rounded-lg text-royal-plum text-xs font-medium focus:outline-none"
                />
                <button
                  type="button"
                  onClick={onAddInlineCategory}
                  disabled={categoryLoading || !inlineCategoryInput.trim()}
                  className="px-3 py-1.5 bg-gold-gradient text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {categoryLoading ? "..." : "Save"}
                </button>
              </div>
            )}

            <select
              value={cat}
              onChange={(e) => setCat(e.target.value)}
              required
              className="w-full px-4 py-3 bg-cream/50 border border-dusty-pink/30 rounded-2xl text-royal-plum font-semibold focus:outline-none focus:ring-2 focus:ring-soft-gold/40 text-sm cursor-pointer shadow-xs"
            >
              {categoriesList.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Launch Status */}
        <div>
          <FieldLabel>Launch Status</FieldLabel>
          <div className="flex flex-wrap gap-2">
            {[
              { val: "", label: "Standard" },
              { val: "New", label: "New Launch", cls: "bg-emerald-600 text-white" },
              { val: "Bestseller", label: "Bestseller", cls: "bg-purple-700 text-white" },
            ].map((item) => (
              <button
                key={item.val}
                type="button"
                onClick={() => setStatus(item.val)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  status === item.val
                    ? item.cls || "bg-royal-plum text-white border-royal-plum shadow-sm"
                    : "bg-cream/60 text-forest-green border-dusty-pink/30 hover:border-soft-gold"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Sales & Persona */}
      <div className="space-y-4 pt-4 border-t border-dusty-pink/15">
        <h3 className="text-xs font-bold text-royal-plum uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-royal-plum" /> 2. Pitch Hooks & Client Persona
        </h3>
        <div>
          <FieldLabel>Keywords to Sell (Pitch Hooks)</FieldLabel>
          <FieldInput
            value={kw}
            onChange={(e) => setKw(e.target.value)}
            placeholder="e.g. Parrot and pomegranate, folk charm"
          />
        </div>
        <div>
          <FieldLabel>Ideal Client Persona</FieldLabel>
          <div className="grid sm:grid-cols-3 gap-3">
            {PRESET_PERSONAS.map((p) => {
              const active = persona === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPersona(p)}
                  className={`p-3 rounded-2xl text-xs font-bold text-left transition-all border cursor-pointer ${
                    active
                      ? "bg-plum-gradient text-white border-royal-plum shadow-glow-plum"
                      : "bg-cream/50 text-forest-green border-dusty-pink/30 hover:border-soft-gold"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] uppercase tracking-wider opacity-75">Persona</span>
                    {active && <Check className="w-3.5 h-3.5" />}
                  </div>
                  {p}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <FieldLabel>Colour Palette</FieldLabel>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESET_COLORS.map((c) => {
              const active = colors.includes(c);
              const dotClass = COLOR_DOTS[c.toLowerCase()] || "bg-dusty-pink";
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleColor(c)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                    active
                      ? "bg-royal-plum text-white border-royal-plum"
                      : "bg-cream/60 text-forest-green border-dusty-pink/30 hover:border-soft-gold"
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${dotClass} inline-block`} />
                  {c}
                  {active && <span className="text-[10px] font-bold">✓</span>}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 max-w-sm">
            <FieldInput
              value={custColor}
              onChange={(e) => setCustColor(e.target.value)}
              placeholder="Add custom color..."
              className="py-2 text-xs"
            />
            <button
              type="button"
              onClick={handleAddCustomColor}
              className="px-4 py-2 bg-cream-dark text-royal-plum text-xs font-bold rounded-xl hover:bg-dusty-pink/30 cursor-pointer whitespace-nowrap"
            >
              Add
            </button>
          </div>
        </div>
      </div>

      {/* Section 3: Presentation Links & Assets */}
      <div className="space-y-4 pt-4 border-t border-dusty-pink/15">
        <h3 className="text-xs font-bold text-royal-plum uppercase tracking-widest flex items-center gap-2">
          <LinkIcon className="w-4 h-4 text-royal-plum" /> 3. Presentation Links & Assets
        </h3>
        <div className="bg-cream/40 p-5 rounded-3xl border border-dusty-pink/20 space-y-5">
          {/* Direct Presentation Uploader (PDF / PPT / PPTX to Cloudflare R2) */}
          <PresentationUploader
            value={link}
            onChange={setLink}
          />

          {/* Direct Cover Image Uploader (to Cloudflare R2) */}
          <div className="pt-3 border-t border-dusty-pink/15">
            <ThumbnailUploader
              value={thumbUrl}
              onChange={setThumbUrl}
            />
          </div>

          {/* Supplementary External Links */}
          <div className="grid sm:grid-cols-2 gap-4 pt-3 border-t border-dusty-pink/15">
            <div>
              <FieldLabel>Executed PPTs Link (Optional)</FieldLabel>
              <FieldInput
                type="url"
                value={pptsLink}
                onChange={(e) => setPptsLink(e.target.value)}
                placeholder="https://drive.google.com/..."
              />
            </div>
            <div>
              <FieldLabel>Material Download Link (Optional)</FieldLabel>
              <FieldInput
                type="url"
                value={matLink}
                onChange={(e) => setMatLink(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 4: Commercial */}
      <div className="space-y-4 pt-4 border-t border-dusty-pink/15">
        <h3 className="text-xs font-bold text-royal-plum uppercase tracking-widest flex items-center gap-2">
          <IndianRupee className="w-4 h-4 text-royal-plum" /> 4. Commercial Positioning
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <FieldLabel>Total Event Value</FieldLabel>
            <FieldInput
              value={eventValue}
              onChange={(e) => setEventValue(e.target.value)}
              placeholder="e.g. 7 - 10 Lakh"
            />
          </div>
          <div>
            <FieldLabel>Ideal Venue</FieldLabel>
            <FieldInput
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              placeholder="e.g. Surat, Vapi, Udaipur"
            />
          </div>
        </div>
        <div>
          <FieldLabel>Additional Team Notes</FieldLabel>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Special logistics, lighting notes..."
            className="w-full px-4 py-3 bg-cream/50 border border-dusty-pink/30 rounded-2xl text-royal-plum text-sm placeholder:text-dusty-pink/60 focus:outline-none focus:ring-2 focus:ring-soft-gold/40"
          />
        </div>
      </div>
    </div>
  );
}
