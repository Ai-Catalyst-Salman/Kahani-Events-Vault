"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { LogoutConfirmModal } from "@/components/LogoutConfirmModal";
import {
  UserPlus,
  Shield,
  Globe,
  Clock,
  Mail,
  Loader2,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Trash2,
  ExternalLink,
  Layers,
  Sparkles,
  Link as LinkIcon,
  Palette,
  IndianRupee,
  MapPin,
  Users,
  FolderPlus,
  Tag,
  Eye,
  LogOut,
  ChevronRight,
  TrendingUp,
  Search,
  Copy,
  Check,
  Pencil,
  X,
  Menu,
  Save,
} from "lucide-react";
import type { Database } from "@/lib/supabase/database.types";
import { normalizeImageUrl, isGoogleDriveUrl } from "@/lib/imageUtils";
import { AdminSidebar } from "@/components/AdminSidebar";
import { ThemeFormFields, FieldLabel, FieldInput } from "@/components/ThemeFormFields";
import { searchThemes } from "@/lib/searchUtils";
import { ThemePreviewModal } from "@/components/ThemePreviewModal";

type AccessLog = Database["public"]["Tables"]["access_logs"]["Row"];
type EventTheme = Database["public"]["Tables"]["event_themes"]["Row"];
type ThemeCategory = Database["public"]["Tables"]["theme_categories"]["Row"];

interface AdminClientProps {
  accessLogs: AccessLog[];
  initialThemes: EventTheme[];
  initialCategories: ThemeCategory[];
  adminEmail: string;
}

export function AdminClient({
  accessLogs,
  initialThemes,
  initialCategories,
  adminEmail,
}: AdminClientProps) {
  const router = useRouter();
  const supabase = createClient();

  /* ── Tab & mobile sidebar state ── */
  const [activeTab, setActiveTab] = useState<"add-theme" | "all-themes" | "categories" | "users" | "logs">("add-theme");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [previewTheme, setPreviewTheme] = useState<EventTheme | null>(null);

  /* ── Data state ── */
  const [themesList, setThemesList] = useState<EventTheme[]>(initialThemes);
  const [categoriesList, setCategoriesList] = useState<ThemeCategory[]>(
    initialCategories.length > 0
      ? initialCategories
      : [
          { id: "1", name: "Haldi & Carnival", created_at: "" },
          { id: "2", name: "Mayra & Mehendi", created_at: "" },
          { id: "3", name: "Sangeet", created_at: "" },
          { id: "4", name: "Wedding", created_at: "" },
          { id: "5", name: "Birthday & Anniversary", created_at: "" },
          { id: "6", name: "Engagement & Reception", created_at: "" },
          { id: "7", name: "Cocktail party", created_at: "" },
          { id: "8", name: "Divine", created_at: "" },
          { id: "9", name: "Garba night", created_at: "" },
        ]
  );

  /* ── Table search/filter ── */
  const [tableSearch, setTableSearch] = useState("");
  const [tableCatFilter, setTableCatFilter] = useState("All");
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  /* ── Add Theme form state ── */
  const [themeName, setThemeName] = useState("");
  const [category, setCategory] = useState(initialCategories[0]?.name || "Haldi & Carnival");
  const [keywords, setKeywords] = useState("");
  const [themeLink, setThemeLink] = useState("");
  const [executedPptsLink, setExecutedPptsLink] = useState("");
  const [clientPersona, setClientPersona] = useState("The Traditional Luxury Family");
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [customColor, setCustomColor] = useState("");
  const [totalEventValue, setTotalEventValue] = useState("");
  const [idealVenue, setIdealVenue] = useState("");
  const [launchStatus, setLaunchStatus] = useState("");
  const [materialDownloadLink, setMaterialDownloadLink] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [themeLoading, setThemeLoading] = useState(false);
  const [themeResult, setThemeResult] = useState<{ success: boolean; message: string } | null>(null);

  /* ── Edit Theme state ── */
  const [editingTheme, setEditingTheme] = useState<EventTheme | null>(null);
  const [editName, setEditName] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editKeywords, setEditKeywords] = useState("");
  const [editThemeLink, setEditThemeLink] = useState("");
  const [editExecutedPptsLink, setEditExecutedPptsLink] = useState("");
  const [editClientPersona, setEditClientPersona] = useState("");
  const [editColors, setEditColors] = useState<string[]>([]);
  const [editCustomColor, setEditCustomColor] = useState("");
  const [editTotalEventValue, setEditTotalEventValue] = useState("");
  const [editIdealVenue, setEditIdealVenue] = useState("");
  const [editLaunchStatus, setEditLaunchStatus] = useState("");
  const [editMaterialDownloadLink, setEditMaterialDownloadLink] = useState("");
  const [editThumbnailUrl, setEditThumbnailUrl] = useState("");
  const [editAdditionalNotes, setEditAdditionalNotes] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editResult, setEditResult] = useState<{ success: boolean; message: string } | null>(null);

  /* ── Inline category add ── */
  const [inlineCategoryInput, setInlineCategoryInput] = useState("");
  const [showInlineCatInput, setShowInlineCatInput] = useState(false);

  /* ── Category manager ── */
  const [newCategoryName, setNewCategoryName] = useState("");
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [categoryMessage, setCategoryMessage] = useState<{ success: boolean; text: string } | null>(null);

  /* ── User management ── */
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "user">("user");
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string } | null>(null);

  /* ── Delete states ── */
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null);

  /* ── Logout modal ── */
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  /* ── Lock body scroll when mobile sidebar open ── */
  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileSidebarOpen]);

  /* ── Filtered themes with millisecond precision search ── */
  const filteredTableThemes = useMemo(() => {
    const categoryFiltered =
      tableCatFilter === "All"
        ? themesList
        : themesList.filter((t) => t.category === tableCatFilter);
    return searchThemes(categoryFiltered, tableSearch).results;
  }, [themesList, tableSearch, tableCatFilter]);

  /* ─────────────────────────────────────────────
     HANDLERS
  ───────────────────────────────────────────── */
  const handleLogoutConfirm = async () => {
    setLogoutLoading(true);
    try { await (supabase.rpc as any)("log_auth_event", { p_event_type: "LOGOUT" }); } catch {}
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(id);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  const toggleColor = (color: string, arr: string[], setter: (v: string[]) => void) => {
    setter(arr.includes(color) ? arr.filter((c) => c !== color) : [...arr, color]);
  };

  const handleAddCategory = async (nameToAdd: string, isInline = false) => {
    const trimmed = nameToAdd.trim();
    if (!trimmed) return;
    setCategoryLoading(true);
    setCategoryMessage(null);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.category) {
        setCategoriesList([...categoriesList, data.category]);
        if (isInline) {
          setCategory(data.category.name);
          setInlineCategoryInput("");
          setShowInlineCatInput(false);
        } else {
          setNewCategoryName("");
          setCategoryMessage({ success: true, text: `Category "${trimmed}" added!` });
        }
      } else {
        const errorText = data.error || "Failed to add category.";
        if (isInline) alert(errorText);
        else setCategoryMessage({ success: false, text: errorText });
      }
    } catch {
      const msg = "Network error. Please try again.";
      if (isInline) alert(msg);
      else setCategoryMessage({ success: false, text: msg });
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Remove category "${name}"?`)) return;
    setDeletingCatId(id);
    try {
      const res = await fetch("/api/admin/categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setCategoriesList(categoriesList.filter((c) => c.id !== id));
      else alert("Failed to delete category.");
    } catch { alert("Network error."); }
    finally { setDeletingCatId(null); }
  };

  const handleCreateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    setThemeLoading(true);
    setThemeResult(null);
    const matchedCat = categoriesList.find((c) => c.name === category);
    try {
      const res = await fetch("/api/admin/create-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme_name: themeName, category, category_id: matchedCat?.id || null,
          keywords, theme_link: themeLink, executed_ppts_link: executedPptsLink,
          client_persona: clientPersona, color_palette: selectedColors,
          total_event_value: totalEventValue, ideal_venue: idealVenue,
          launch_status: launchStatus || null, material_download_link: materialDownloadLink,
          thumbnail_url: normalizeImageUrl(thumbnailUrl) || null, additional_notes: additionalNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.theme) {
        setThemeResult({ success: true, message: `Theme "${themeName}" published!` });
        setThemesList([data.theme, ...themesList]);
        setThemeName(""); setKeywords(""); setThemeLink(""); setExecutedPptsLink("");
        setSelectedColors([]); setTotalEventValue(""); setIdealVenue("");
        setLaunchStatus(""); setMaterialDownloadLink(""); setThumbnailUrl(""); setAdditionalNotes("");
      } else {
        setThemeResult({ success: false, message: data.error || "Failed to add theme." });
      }
    } catch { setThemeResult({ success: false, message: "Network error." }); }
    finally { setThemeLoading(false); }
  };

  /* ── Open edit panel pre-filled ── */
  const openEdit = (theme: EventTheme) => {
    setEditingTheme(theme);
    setEditName(theme.theme_name || theme.title || "");
    setEditCategory(theme.category || "");
    setEditKeywords(theme.keywords || "");
    setEditThemeLink(theme.theme_link || "");
    setEditExecutedPptsLink(theme.executed_ppts_link || "");
    setEditClientPersona(theme.client_persona || "");
    setEditColors(theme.color_palette || []);
    setEditTotalEventValue(theme.total_event_value || "");
    setEditIdealVenue(theme.ideal_venue || "");
    setEditLaunchStatus(theme.launch_status || "");
    setEditMaterialDownloadLink(theme.material_download_link || "");
    setEditThumbnailUrl(theme.thumbnail_url || "");
    setEditAdditionalNotes(theme.additional_notes || "");
    setEditResult(null);
  };

  const handleUpdateTheme = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTheme) return;
    setEditLoading(true);
    setEditResult(null);
    try {
      const res = await fetch("/api/admin/update-theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingTheme.id,
          theme_name: editName, category: editCategory,
          keywords: editKeywords, theme_link: editThemeLink,
          executed_ppts_link: editExecutedPptsLink, client_persona: editClientPersona,
          color_palette: editColors, total_event_value: editTotalEventValue,
          ideal_venue: editIdealVenue, launch_status: editLaunchStatus || null,
          material_download_link: editMaterialDownloadLink, thumbnail_url: normalizeImageUrl(editThumbnailUrl) || null,
          additional_notes: editAdditionalNotes,
        }),
      });
      const data = await res.json();
      if (res.ok && data.theme) {
        setThemesList(themesList.map((t) => (t.id === data.theme.id ? data.theme : t)));
        setEditResult({ success: true, message: `"${editName}" updated successfully!` });
        setTimeout(() => setEditingTheme(null), 1200);
      } else {
        setEditResult({ success: false, message: data.error || "Failed to update theme." });
      }
    } catch { setEditResult({ success: false, message: "Network error." }); }
    finally { setEditLoading(false); }
  };

  const handleDeleteTheme = async (id: string, name: string) => {
    if (!confirm(`Remove "${name}" from the Vault?`)) return;
    setDeletingId(id);
    try {
      const res = await fetch("/api/admin/delete-theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) setThemesList(themesList.filter((t) => t.id !== id));
      else alert("Failed to delete theme.");
    } catch { alert("Network error."); }
    finally { setDeletingId(null); }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateLoading(true);
    setCreateResult(null);
    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setCreateResult({ success: true, message: `Member ${newEmail} created.` });
        setNewEmail(""); setNewPassword(""); setNewRole("user");
      } else {
        setCreateResult({ success: false, message: data.error || "Failed to create user." });
      }
    } catch { setCreateResult({ success: false, message: "Network error." }); }
    finally { setCreateLoading(false); }
  };

  /* ─────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────── */
  return (
    <>
      <LogoutConfirmModal open={showLogoutModal} loading={logoutLoading} email={adminEmail} onConfirm={handleLogoutConfirm} onCancel={() => setShowLogoutModal(false)} />

      {/* ════ EDIT THEME SLIDE-IN PANEL ════ */}
      <AnimatePresence>
        {editingTheme && (
          <>
            {/* Backdrop */}
            <motion.div
              key="edit-backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
              onClick={() => setEditingTheme(null)}
            />
            {/* Panel */}
            <motion.div
              key="edit-panel"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 34 }}
              className="fixed top-0 right-0 z-50 h-full w-full max-w-2xl bg-white shadow-2xl flex flex-col"
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-dusty-pink/15 shrink-0">
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-soft-gold/15 text-deep-ochre rounded-full text-xs font-bold uppercase tracking-wider mb-1">
                    <Pencil className="w-3 h-3" /> Edit Theme
                  </div>
                  <h2 className="text-xl font-bold text-royal-plum font-bona-nova truncate max-w-sm">
                    {editingTheme.theme_name || editingTheme.title || "Untitled"}
                  </h2>
                </div>
                <button onClick={() => setEditingTheme(null)} className="p-2 rounded-xl border border-dusty-pink/20 hover:bg-red-50 hover:border-red-200 text-royal-plum hover:text-red-600 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Panel body - scrollable */}
              <form id="edit-form" onSubmit={handleUpdateTheme} className="flex-1 overflow-y-auto px-6 py-6">
                <ThemeFormFields
                  name={editName} setName={setEditName}
                  cat={editCategory} setCat={setEditCategory}
                  kw={editKeywords} setKw={setEditKeywords}
                  link={editThemeLink} setLink={setEditThemeLink}
                  pptsLink={editExecutedPptsLink} setPptsLink={setEditExecutedPptsLink}
                  persona={editClientPersona} setPersona={setEditClientPersona}
                  colors={editColors} setColors={setEditColors}
                  custColor={editCustomColor} setCustColor={setEditCustomColor}
                  eventValue={editTotalEventValue} setEventValue={setEditTotalEventValue}
                  venue={editIdealVenue} setVenue={setEditIdealVenue}
                  status={editLaunchStatus} setStatus={setEditLaunchStatus}
                  matLink={editMaterialDownloadLink} setMatLink={setEditMaterialDownloadLink}
                  thumbUrl={editThumbnailUrl} setThumbUrl={setEditThumbnailUrl}
                  notes={editAdditionalNotes} setNotes={setEditAdditionalNotes}
                  categoriesList={categoriesList}
                  isEdit
                />

                {/* Result message */}
                <AnimatePresence>
                  {editResult && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`flex items-start gap-3 p-4 rounded-2xl border mt-6 ${editResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                    >
                      {editResult.success ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                      <p className={`text-sm font-bold ${editResult.success ? "text-green-800" : "text-red-800"}`}>{editResult.message}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>

              {/* Panel footer */}
              <div className="px-6 py-4 border-t border-dusty-pink/15 bg-cream/50 shrink-0 flex gap-3">
                <button type="button" onClick={() => setEditingTheme(null)} className="flex-1 py-3 rounded-2xl border border-dusty-pink/30 text-royal-plum text-sm font-bold hover:bg-cream-dark transition-colors">
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  form="edit-form"
                  onClick={handleUpdateTheme}
                  disabled={editLoading}
                  whileHover={{ scale: editLoading ? 1 : 1.015 }}
                  whileTap={{ scale: editLoading ? 1 : 0.985 }}
                  className="flex-1 py-3 bg-plum-gradient text-white font-bold rounded-2xl shadow-glow-plum transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-60 cursor-pointer"
                >
                  {editLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Changes</>}
                </motion.button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ════ MAIN LAYOUT ════ */}
      <div className="flex h-screen overflow-hidden bg-cream">

        {/* ─── DESKTOP SIDEBAR ─── */}
        <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-white border-r border-dusty-pink/20 shrink-0 h-full shadow-sm z-30">
          <AdminSidebar
            adminEmail={adminEmail}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            themesCount={themesList.length}
            categoriesCount={categoriesList.length}
            onSignOutClick={() => setShowLogoutModal(true)}
          />
        </aside>

        {/* ─── MOBILE SIDEBAR DRAWER ─── */}
        <AnimatePresence>
          {mobileSidebarOpen && (
            <>
              <motion.div
                key="mob-backdrop"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
                onClick={() => setMobileSidebarOpen(false)}
              />
              <motion.aside
                key="mob-sidebar"
                initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="fixed top-0 left-0 z-50 h-full w-72 bg-white border-r border-dusty-pink/20 shadow-2xl flex flex-col lg:hidden"
              >
                <AdminSidebar
                  adminEmail={adminEmail}
                  activeTab={activeTab}
                  setActiveTab={setActiveTab}
                  themesCount={themesList.length}
                  categoriesCount={categoriesList.length}
                  onSignOutClick={() => setShowLogoutModal(true)}
                  onNavClick={() => setMobileSidebarOpen(false)}
                />
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* ─── MAIN SCROLLABLE CONTENT ─── */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">

          {/* Mobile top bar */}
          <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-dusty-pink/15 shrink-0 z-20">
            <button onClick={() => setMobileSidebarOpen(true)} className="p-2 rounded-xl border border-dusty-pink/20 text-royal-plum hover:bg-cream-dark transition-colors">
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Image src="/logo.png" alt="Kahani" width={28} height={22} className="object-contain" />
              <span className="font-bold text-royal-plum text-sm font-bona-nova">Kahani Vault <span className="text-dusty-pink font-normal text-xs">Admin</span></span>
            </div>
            <div className="w-10" />
          </div>

          {/* Scrollable panel */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">

            {/* Metric Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
              {[
                { label: "Total Themes", val: themesList.length, icon: Layers, bg: "bg-soft-gold/15", ico: "text-deep-ochre" },
                { label: "Categories", val: categoriesList.length, icon: FolderPlus, bg: "bg-purple-50", ico: "text-purple-700" },
                { label: "Audit Sessions", val: accessLogs.length, icon: TrendingUp, bg: "bg-emerald-50", ico: "text-emerald-700" },
                { label: "Bestsellers", val: themesList.filter((t) => t.launch_status?.toLowerCase() === "bestseller").length, icon: Sparkles, bg: "bg-rose-50", ico: "text-rose-700" },
              ].map(({ label, val, icon: Icon, bg, ico }) => (
                <div key={label} className="bg-white p-4 sm:p-5 rounded-3xl border border-dusty-pink/20 shadow-card flex items-center gap-3 sm:gap-4">
                  <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl ${bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-5 h-5 sm:w-6 sm:h-6 ${ico}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-bold text-forest-green/70 uppercase tracking-wider truncate">{label}</p>
                    <p className="text-xl sm:text-2xl font-bold text-royal-plum font-bona-nova">{val}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tab content */}
            <AnimatePresence mode="wait">

              {/* ═══ TAB: ADD THEME ═══ */}
              {activeTab === "add-theme" && (
                <motion.div key="add-theme" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="bg-white rounded-3xl shadow-card border border-dusty-pink/20 p-5 sm:p-8"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-6 border-b border-dusty-pink/15 gap-4">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-soft-gold/15 text-deep-ochre rounded-full text-xs font-bold uppercase tracking-wider mb-2">
                        <Sparkles className="w-3.5 h-3.5" /> Direct Showroom Publisher
                      </div>
                      <h1 className="text-2xl sm:text-3xl font-bold text-royal-plum font-bona-nova">Create & Publish Theme</h1>
                      <p className="text-forest-green/70 text-xs sm:text-sm mt-1">Fill in the details and publish directly to the client showroom.</p>
                    </div>
                    <button type="button" onClick={() => setActiveTab("all-themes")} className="px-4 py-2.5 rounded-xl border border-dusty-pink/30 hover:border-soft-gold text-royal-plum text-xs font-bold flex items-center gap-2 self-start cursor-pointer transition-colors whitespace-nowrap">
                      <Eye className="w-4 h-4 text-soft-gold" /> View All ({themesList.length})
                    </button>
                  </div>
                  <form onSubmit={handleCreateTheme} className="space-y-0">
                    <ThemeFormFields
                      name={themeName} setName={setThemeName}
                      cat={category} setCat={setCategory}
                      kw={keywords} setKw={setKeywords}
                      link={themeLink} setLink={setThemeLink}
                      pptsLink={executedPptsLink} setPptsLink={setExecutedPptsLink}
                      persona={clientPersona} setPersona={setClientPersona}
                      colors={selectedColors} setColors={setSelectedColors}
                      custColor={customColor} setCustColor={setCustomColor}
                      eventValue={totalEventValue} setEventValue={setTotalEventValue}
                      venue={idealVenue} setVenue={setIdealVenue}
                      status={launchStatus} setStatus={setLaunchStatus}
                      matLink={materialDownloadLink} setMatLink={setMaterialDownloadLink}
                      thumbUrl={thumbnailUrl} setThumbUrl={setThumbnailUrl}
                      notes={additionalNotes} setNotes={setAdditionalNotes}
                      categoriesList={categoriesList}
                      showInlineCatInput={showInlineCatInput}
                      setShowInlineCatInput={setShowInlineCatInput}
                      inlineCategoryInput={inlineCategoryInput}
                      setInlineCategoryInput={setInlineCategoryInput}
                      onAddInlineCategory={() => handleAddCategory(inlineCategoryInput, true)}
                      categoryLoading={categoryLoading}
                    />
                    {themeResult && (
                      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                        className={`flex items-start gap-3 p-4 rounded-2xl border mt-6 ${themeResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                      >
                        {themeResult.success ? <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />}
                        <p className={`text-sm font-bold ${themeResult.success ? "text-green-800" : "text-red-800"}`}>{themeResult.message}</p>
                      </motion.div>
                    )}
                    <motion.button type="submit" disabled={themeLoading} whileHover={{ scale: themeLoading ? 1 : 1.015 }} whileTap={{ scale: themeLoading ? 1 : 0.985 }}
                      className="w-full mt-6 py-4 bg-plum-gradient text-white font-bold rounded-2xl shadow-glow-plum hover:shadow-lg transition-all duration-300 flex items-center justify-center gap-2.5 text-sm uppercase tracking-wider disabled:opacity-60 cursor-pointer"
                    >
                      {themeLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Publishing...</> : <><PlusCircle className="w-5 h-5" /> Publish Theme to Showroom</>}
                    </motion.button>
                  </form>
                </motion.div>
              )}

              {/* ═══ TAB: ALL THEMES ═══ */}
              {activeTab === "all-themes" && (
                <motion.div key="all-themes" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="bg-white rounded-3xl shadow-card border border-dusty-pink/20 overflow-hidden"
                >
                  {/* Toolbar */}
                  <div className="p-4 sm:p-6 border-b border-dusty-pink/15 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-royal-plum font-bona-nova">Themes Catalog ({filteredTableThemes.length})</h2>
                      <p className="text-forest-green/70 text-xs mt-0.5">All published themes in the Kahani Vault.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="w-4 h-4 text-soft-gold absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={tableSearch} onChange={(e) => setTableSearch(e.target.value)} placeholder="Filter themes..." className="pl-9 pr-4 py-2 bg-cream/60 border border-dusty-pink/30 rounded-xl text-xs font-semibold text-royal-plum focus:outline-none focus:ring-2 focus:ring-soft-gold/40 w-36 sm:w-48" />
                      </div>
                      <button onClick={() => setActiveTab("add-theme")} className="px-3 sm:px-4 py-2 bg-plum-gradient text-white text-xs font-bold rounded-xl shadow-xs hover:shadow-glow-plum transition-all flex items-center gap-1.5 cursor-pointer shrink-0">
                        <PlusCircle className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Theme</span>
                      </button>
                    </div>
                  </div>

                  {/* Category pills */}
                  <div className="px-4 sm:px-6 py-3 bg-cream/30 border-b border-dusty-pink/10 flex items-center gap-2 overflow-x-auto">
                    <span className="text-[11px] font-bold text-royal-plum/70 uppercase tracking-wider shrink-0 mr-1">Category:</span>
                    {["All", ...categoriesList.map((c) => c.name)].map((cat) => (
                      <button key={cat} onClick={() => setTableCatFilter(cat)}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer shrink-0 ${
                          tableCatFilter === cat ? "bg-royal-plum text-white shadow-xs" : "bg-white text-forest-green border border-dusty-pink/25 hover:border-soft-gold"
                        }`}
                      >{cat}</button>
                    ))}
                  </div>

                  {/* Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-cream/60 border-b border-dusty-pink/15">
                          <th className="px-4 sm:px-5 py-3.5 text-xs font-bold text-royal-plum/70 uppercase tracking-wide">Theme & Status</th>
                          <th className="px-4 sm:px-5 py-3.5 text-xs font-bold text-royal-plum/70 uppercase tracking-wide hidden md:table-cell">Category</th>
                          <th className="px-4 sm:px-5 py-3.5 text-xs font-bold text-royal-plum/70 uppercase tracking-wide hidden lg:table-cell">Keywords</th>
                          <th className="px-4 sm:px-5 py-3.5 text-xs font-bold text-royal-plum/70 uppercase tracking-wide hidden xl:table-cell">Persona</th>
                          <th className="px-4 sm:px-5 py-3.5 text-xs font-bold text-royal-plum/70 uppercase tracking-wide hidden xl:table-cell">Value</th>
                          <th className="px-4 sm:px-5 py-3.5 text-xs font-bold text-royal-plum/70 uppercase tracking-wide text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream/70 text-xs font-medium">
                        {filteredTableThemes.length === 0 ? (
                          <tr><td colSpan={6} className="px-6 py-14 text-center text-forest-green/60 text-sm">No themes match. Click &quot;Add Theme&quot; to create one!</td></tr>
                        ) : (
                          filteredTableThemes.map((theme) => {
                            const name = theme.theme_name || theme.title || "Untitled";
                            return (
                              <tr key={theme.id} className="hover:bg-cream/40 transition-colors">
                                {/* Name */}
                                <td className="px-4 sm:px-5 py-4">
                                  <div className="flex items-center gap-3">
                                    {normalizeImageUrl(theme.thumbnail_url) ? (
                                      <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-cream-dark shrink-0">
                                        <Image
                                          src={normalizeImageUrl(theme.thumbnail_url)!}
                                          alt={name}
                                          fill
                                          unoptimized={isGoogleDriveUrl(theme.thumbnail_url)}
                                          className="object-cover"
                                        />
                                      </div>
                                    ) : (
                                      <div className="w-9 h-9 rounded-xl bg-cream-dark border border-dusty-pink/20 flex items-center justify-center shrink-0 p-1.5">
                                        <Image src="/logo.png" alt="Kahani" width={28} height={22} className="object-contain" />
                                      </div>
                                    )}
                                    <div>
                                      <p className="font-bold text-royal-plum text-sm font-bona-nova max-w-[140px] sm:max-w-[200px] truncate">{name}</p>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        {theme.launch_status && (
                                          <span className="inline-block px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-800 font-bold uppercase">{theme.launch_status}</span>
                                        )}
                                        <span className="text-[10px] text-dusty-pink md:hidden">{theme.category}</span>
                                      </div>
                                    </div>
                                  </div>
                                </td>
                                {/* Category */}
                                <td className="px-4 sm:px-5 py-4 hidden md:table-cell">
                                  <span className="px-2.5 py-1 bg-cream rounded-lg border border-dusty-pink/20 font-bold text-forest-green text-xs">{theme.category}</span>
                                </td>
                                {/* Keywords */}
                                <td className="px-4 sm:px-5 py-4 hidden lg:table-cell text-forest-green/80 italic max-w-xs">
                                  <span className="truncate block max-w-[200px]">{theme.keywords ? `"${theme.keywords}"` : "–"}</span>
                                </td>
                                {/* Persona */}
                                <td className="px-4 sm:px-5 py-4 hidden xl:table-cell text-royal-plum font-semibold">{theme.client_persona || "–"}</td>
                                {/* Value */}
                                <td className="px-4 sm:px-5 py-4 hidden xl:table-cell text-forest-green">
                                  <div className="font-bold">{theme.total_event_value || "–"}</div>
                                  <div className="text-[11px] text-dusty-pink flex items-center gap-1"><MapPin className="w-3 h-3" />{theme.ideal_venue || "Any"}</div>
                                </td>
                                {/* ─── ACTIONS ─── */}
                                <td className="px-4 sm:px-5 py-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    {/* EDIT button */}
                                    <motion.button
                                      onClick={() => openEdit(theme)}
                                      title="Edit Theme"
                                      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
                                      className="p-2 rounded-xl border border-soft-gold/40 text-soft-gold hover:bg-soft-gold/10 hover:border-soft-gold transition-colors cursor-pointer"
                                    >
                                      <Pencil className="w-3.5 h-3.5" />
                                    </motion.button>

                                    {/* Copy link */}
                                    {theme.theme_link && (
                                      <>
                                        <button onClick={() => copyToClipboard(theme.theme_link!, theme.id)} title="Copy Link" className="p-2 rounded-xl border border-dusty-pink/20 hover:border-soft-gold text-royal-plum hover:bg-white cursor-pointer transition-colors">
                                          {copiedLink === theme.id ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                                        </button>
                                        <button type="button" onClick={() => setPreviewTheme(theme)} title="Preview Presentation" className="p-2 rounded-xl border border-dusty-pink/20 hover:border-royal-plum text-royal-plum hover:bg-white cursor-pointer transition-colors">
                                          <Eye className="w-3.5 h-3.5 text-royal-plum" />
                                        </button>
                                      </>
                                    )}

                                    {/* Delete */}
                                    <button onClick={() => handleDeleteTheme(theme.id, name)} disabled={deletingId === theme.id} title="Delete" className="p-2 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50">
                                      {deletingId === theme.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}

              {/* ═══ TAB: CATEGORIES ═══ */}
              {activeTab === "categories" && (
                <motion.div key="categories" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="grid lg:grid-cols-3 gap-6 sm:gap-8"
                >
                  <div className="bg-white rounded-3xl shadow-card border border-dusty-pink/20 p-6 sm:p-8 h-fit">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-soft-gold/15 text-deep-ochre rounded-full text-xs font-bold uppercase tracking-wider mb-2"><FolderPlus className="w-3.5 h-3.5" /> Live Taxonomy</div>
                    <h2 className="text-xl sm:text-2xl font-bold text-royal-plum font-bona-nova mb-1">Add New Category</h2>
                    <p className="text-forest-green/70 text-xs mb-6 font-medium">Categories populate showroom navigation and the theme creator dropdown.</p>
                    <form onSubmit={(e) => { e.preventDefault(); handleAddCategory(newCategoryName); }} className="space-y-4">
                      <div>
                        <FieldLabel>Category Name <span className="text-red-500">*</span></FieldLabel>
                        <FieldInput type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} required placeholder="e.g. Sundowner / Pool Party" />
                      </div>
                      {categoryMessage && (
                        <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                          className={`p-3.5 rounded-xl text-xs font-bold border ${categoryMessage.success ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`}
                        >{categoryMessage.text}</motion.div>
                      )}
                      <button type="submit" disabled={categoryLoading} className="w-full py-3.5 bg-plum-gradient text-white font-bold rounded-2xl shadow-glow-plum hover:shadow-lg transition-all text-xs uppercase tracking-wider cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                        {categoryLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><FolderPlus className="w-4 h-4" /> Create Category</>}
                      </button>
                    </form>
                  </div>
                  <div className="lg:col-span-2 bg-white rounded-3xl shadow-card border border-dusty-pink/20 p-6 sm:p-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-royal-plum font-bona-nova mb-1">Active Categories ({categoriesList.length})</h2>
                    <p className="text-forest-green/70 text-xs mb-6">All categories driving your showroom filters.</p>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {categoriesList.map((cat) => (
                        <div key={cat.id} className="flex items-center justify-between p-4 bg-cream/40 rounded-2xl border border-dusty-pink/15 hover:border-soft-gold/40 transition-colors">
                          <div className="flex items-center gap-3"><Tag className="w-4 h-4 text-soft-gold" /><span className="text-sm font-bold text-royal-plum font-bona-nova">{cat.name}</span></div>
                          {cat.id && (
                            <button onClick={() => handleDeleteCategory(cat.id, cat.name)} disabled={deletingCatId === cat.id} title="Delete" className="p-1.5 text-dusty-pink hover:text-red-600 transition-colors cursor-pointer disabled:opacity-50">
                              {deletingCatId === cat.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ═══ TAB: USERS ═══ */}
              {activeTab === "users" && (
                <motion.div key="users" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="grid md:grid-cols-2 gap-6 sm:gap-8"
                >
                  <div className="bg-white rounded-3xl shadow-card border border-dusty-pink/20 p-6 sm:p-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-soft-gold/15 text-deep-ochre rounded-full text-xs font-bold uppercase tracking-wider mb-2"><UserPlus className="w-3.5 h-3.5" /> Team Access</div>
                    <h2 className="text-xl sm:text-2xl font-bold text-royal-plum mb-1 font-bona-nova">Add Team Member</h2>
                    <p className="text-forest-green/70 text-xs mb-6 font-medium">Create accounts via Supabase Admin API without disturbing your session.</p>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <div>
                        <FieldLabel>Email Address <span className="text-red-500">*</span></FieldLabel>
                        <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-dusty-pink" /><FieldInput type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required placeholder="member@kahanievents.in" className="pl-10" /></div>
                      </div>
                      <div>
                        <FieldLabel>Temporary Password <span className="text-red-500">*</span></FieldLabel>
                        <FieldInput type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} placeholder="Min. 8 characters" />
                      </div>
                      <div>
                        <FieldLabel>Role</FieldLabel>
                        <select value={newRole} onChange={(e) => setNewRole(e.target.value as "admin" | "user")} className="w-full px-4 py-3 bg-cream/50 border border-dusty-pink/30 rounded-2xl text-royal-plum font-semibold focus:outline-none focus:ring-2 focus:ring-soft-gold/40 text-sm cursor-pointer">
                          <option value="user">User — Showroom View Only</option>
                          <option value="admin">Admin — Full Management Access</option>
                        </select>
                      </div>
                      {createResult && (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                          className={`flex items-start gap-2.5 p-3.5 rounded-2xl border ${createResult.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
                        >
                          {createResult.success ? <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />}
                          <p className={`text-sm font-bold ${createResult.success ? "text-green-700" : "text-red-700"}`}>{createResult.message}</p>
                        </motion.div>
                      )}
                      <motion.button type="submit" disabled={createLoading} whileHover={{ scale: createLoading ? 1 : 1.015 }} whileTap={{ scale: createLoading ? 1 : 0.985 }}
                        className="w-full py-3.5 bg-plum-gradient text-white font-bold rounded-2xl shadow-glow-plum hover:shadow-lg transition-all text-xs uppercase tracking-wider disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2.5"
                      >
                        {createLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><UserPlus className="w-4 h-4" /> Create Member Account</>}
                      </motion.button>
                    </form>
                  </div>
                  <div className="bg-soft-gold/10 border border-soft-gold/30 rounded-3xl p-6 sm:p-8 h-fit">
                    <h3 className="font-bold text-deep-ochre mb-2 flex items-center gap-2 font-bona-nova text-lg"><Shield className="w-5 h-5" /> Invitation-Only Security</h3>
                    <p className="text-sm text-forest-green/80 leading-relaxed font-medium">Public sign-ups are disabled. Only team members invited through this panel or provisioned in Supabase can access the Kahani Events Vault showroom.</p>
                  </div>
                </motion.div>
              )}

              {/* ═══ TAB: LOGS ═══ */}
              {activeTab === "logs" && (
                <motion.div key="logs" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="bg-white rounded-3xl shadow-card border border-dusty-pink/20 overflow-hidden"
                >
                  <div className="p-4 sm:p-6 border-b border-dusty-pink/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-royal-plum font-bona-nova">Access Logs Audit</h2>
                      <p className="text-forest-green/70 text-xs mt-0.5 font-medium">Session telemetry via Next.js Middleware and Supabase RPC.</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-full text-xs font-bold border border-emerald-200 self-start sm:self-auto">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Auditing
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-cream/60 border-b border-dusty-pink/15">
                          {["User / Email", "Event", "IP Address", "Location", "Timestamp"].map((h) => (
                            <th key={h} className="px-4 sm:px-6 py-3.5 text-xs font-bold text-royal-plum/70 uppercase tracking-wide whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-cream/70 text-xs font-medium">
                        {accessLogs.length === 0 ? (
                          <tr><td colSpan={5} className="px-6 py-14 text-center text-forest-green/50 text-sm">No access logs recorded yet.</td></tr>
                        ) : (
                          accessLogs.map((log, i) => (
                            <motion.tr key={log.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.02 }} className="hover:bg-cream/40 transition-colors">
                              <td className="px-4 sm:px-6 py-4">
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-full bg-plum-gradient flex items-center justify-center font-bold text-white text-xs shrink-0">{log.email?.[0]?.toUpperCase() ?? "?"}</div>
                                  <span className="text-royal-plum font-bold truncate max-w-[120px] sm:max-w-[200px]">{log.email ?? "Anonymous"}</span>
                                </div>
                              </td>
                              <td className="px-4 sm:px-6 py-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold tracking-wide ${log.event_type === "LOGIN" ? "bg-green-100 text-green-800 border border-green-300" : log.event_type === "LOGOUT" ? "bg-amber-100 text-amber-800 border border-amber-300" : "bg-purple-100 text-purple-800 border border-purple-300"}`}>
                                  {log.event_type || "LOGIN"}
                                </span>
                              </td>
                              <td className="px-4 sm:px-6 py-4"><code className="text-forest-green text-xs bg-cream px-2 py-1 rounded-md font-mono border border-dusty-pink/15">{log.ip_address ?? "–"}</code></td>
                              <td className="px-4 sm:px-6 py-4"><div className="flex items-center gap-1.5 text-forest-green"><Globe className="w-3.5 h-3.5 text-dusty-pink shrink-0" />{log.location ?? "Unknown"}</div></td>
                              <td className="px-4 sm:px-6 py-4">
                                <div className="flex items-center gap-1.5 text-royal-plum/70 font-semibold whitespace-nowrap"><Clock className="w-3.5 h-3.5 text-dusty-pink" />
                                  {new Date(log.timestamp).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                                </div>
                              </td>
                            </motion.tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>
        </div>
      </div>

      {/* ── In-Page Presentation Preview Modal (Zero external tabs) ── */}
      <ThemePreviewModal
        theme={previewTheme}
        isOpen={!!previewTheme}
        onClose={() => setPreviewTheme(null)}
      />
    </>
  );
}
