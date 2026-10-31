"use client";

import { motion, AnimatePresence } from "framer-motion";
import { LogOut, X } from "lucide-react";

interface LogoutConfirmModalProps {
  open: boolean;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  email?: string;
}

export function LogoutConfirmModal({
  open,
  loading,
  onConfirm,
  onCancel,
  email,
}: LogoutConfirmModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-royal-plum/20 backdrop-blur-sm"
            onClick={onCancel}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
            aria-modal="true"
            role="dialog"
            aria-labelledby="logout-modal-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !loading) {
                onCancel();
              }
            }}
          >
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-card-hover border border-dusty-pink/20 overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header strip */}
              <div className="bg-cream-gradient px-6 pt-6 pb-4 border-b border-dusty-pink/10 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                    <LogOut className="w-5 h-5 text-red-500" />
                  </div>
                  <div>
                    <h2
                      id="logout-modal-title"
                      className="text-royal-plum font-bold text-base font-bona-nova leading-snug"
                    >
                      Sign out of Vault?
                    </h2>
                    <p className="text-xs text-dusty-pink font-medium mt-0.5">
                      You will need to sign in again to access.
                    </p>
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="p-1.5 rounded-xl text-dusty-pink hover:text-royal-plum hover:bg-cream transition-colors disabled:opacity-50 cursor-pointer"
                  aria-label="Cancel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {email && (
                  <div className="flex items-center gap-2.5 p-3 bg-cream rounded-2xl border border-dusty-pink/15 mb-5">
                    <div className="w-7 h-7 rounded-full bg-plum-gradient flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold">
                        {email[0]?.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-royal-plum text-sm font-semibold truncate">
                      {email}
                    </span>
                  </div>
                )}

                <p className="text-sm text-royal-plum/70 leading-relaxed mb-5">
                  Are you sure you want to sign out? Any unsaved changes will be lost.
                </p>

                {/* Action buttons */}
                <div className="flex gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-dusty-pink/30 bg-cream hover:bg-cream-dark text-royal-plum text-sm font-semibold transition-all duration-200 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    onClick={onConfirm}
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="w-4 h-4 animate-spin"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z"
                          />
                        </svg>
                        Signing out...
                      </>
                    ) : (
                      <>
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
