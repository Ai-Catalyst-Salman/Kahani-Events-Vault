"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { LogOut, Settings, ChevronDown } from "lucide-react";
import { LogoutConfirmModal } from "@/components/LogoutConfirmModal";

interface NavbarProps {
  email: string;
  role: "admin" | "user";
}

export function Navbar({ email, role }: NavbarProps) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogoutConfirm = async () => {
    setLogoutLoading(true);
    try {
      await (supabase.rpc as any)("log_auth_event", { p_event_type: "LOGOUT" });
    } catch {
      // Non-blocking fallback
    }
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  // Shortened email for small screens
  const shortEmail = email.split("@")[0];

  return (
    <>
      <LogoutConfirmModal
        open={showLogoutModal}
        loading={logoutLoading}
        email={email}
        onConfirm={handleLogoutConfirm}
        onCancel={() => setShowLogoutModal(false)}
      />

      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className="sticky top-0 z-50 w-full border-b border-dusty-pink/15 bg-cream/90 backdrop-blur-xl"
      >
        <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">

          {/* ── Brand ── */}
          <a
            href="/"
            className="flex items-center gap-2 sm:gap-3 group transition-opacity hover:opacity-90 shrink-0"
          >
            <div className="relative flex items-center justify-center shrink-0">
              <Image
                src="/logo.png"
                alt="Kahani Logo"
                width={40}
                height={30}
                className="object-contain w-auto h-8 sm:h-9"
                priority
              />
            </div>
            <div className="leading-none">
              <span className="font-bold text-royal-plum text-base sm:text-lg tracking-tight font-bona-nova">
                Kahani
              </span>
              <span className="text-soft-gold font-normal font-bona-nova text-base sm:text-lg">
                {" "}Vault
              </span>
            </div>
          </a>

          {/* ── Nav links (desktop) ── */}
          <nav className="hidden md:flex items-center gap-5 lg:gap-6">
            <a
              href="/"
              className="text-sm text-forest-green hover:text-royal-plum transition-colors font-medium"
            >
              Dashboard
            </a>
            {role === "admin" && (
              <a
                href="/admin"
                className="text-sm text-forest-green hover:text-royal-plum transition-colors font-medium"
              >
                Admin
              </a>
            )}
          </nav>

          {/* ── User menu ── */}
          <div className="relative shrink-0">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center gap-2 sm:gap-2.5 px-2.5 sm:px-3.5 py-2 rounded-xl border border-dusty-pink/20 hover:border-soft-gold/40 hover:bg-cream-dark/50 transition-all duration-200"
            >
              {/* Avatar */}
              <div className="w-6 h-6 rounded-full bg-plum-gradient flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">
                  {email[0]?.toUpperCase()}
                </span>
              </div>

              {/* Email — full on lg+, short on sm–md, hidden on xs */}
              <span className="hidden sm:block md:hidden text-royal-plum text-sm font-medium max-w-[100px] truncate">
                {shortEmail}
              </span>
              <span className="hidden md:block text-royal-plum text-sm font-medium max-w-[160px] truncate">
                {email}
              </span>

              <ChevronDown
                className={`w-3.5 h-3.5 text-dusty-pink transition-transform duration-200 ${
                  menuOpen ? "rotate-180" : ""
                }`}
              />
            </motion.button>

            {/* ── Dropdown ── */}
            <AnimatePresence>
              {menuOpen && (
                <motion.div
                  key="dropdown"
                  initial={{ opacity: 0, y: 8, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="absolute right-0 mt-2 w-56 bg-white/95 backdrop-blur-xl rounded-2xl shadow-card-hover border border-dusty-pink/15 py-2 overflow-hidden z-50"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div className="px-4 py-2.5 border-b border-cream-dark">
                    <p className="text-xs text-dusty-pink uppercase tracking-wide font-medium">
                      {role === "admin" ? "Administrator" : "Member"}
                    </p>
                    <p className="text-royal-plum text-sm font-semibold truncate mt-0.5">
                      {email}
                    </p>
                  </div>

                  {/* Mobile nav links inside dropdown */}
                  <div className="md:hidden">
                    <a
                      href="/"
                      className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-cream transition-colors text-forest-green text-sm"
                      onClick={() => setMenuOpen(false)}
                    >
                      Dashboard
                    </a>
                    {role === "admin" && (
                      <a
                        href="/admin"
                        className="flex items-center gap-2.5 px-4 py-2.5 hover:bg-cream transition-colors text-forest-green text-sm"
                        onClick={() => setMenuOpen(false)}
                      >
                        <Settings className="w-4 h-4" />
                        Admin Panel
                      </a>
                    )}
                    <div className="border-t border-cream-dark my-1" />
                  </div>

                  {role === "admin" && (
                    <a
                      href="/admin"
                      className="hidden md:flex items-center gap-2.5 px-4 py-2.5 hover:bg-cream transition-colors text-forest-green text-sm"
                      onClick={() => setMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Admin Panel
                    </a>
                  )}

                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      setShowLogoutModal(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-red-50 transition-colors text-red-600 text-sm cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.header>
    </>
  );
}
