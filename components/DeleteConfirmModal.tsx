"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, AlertTriangle, Loader2 } from "lucide-react";

interface DeleteConfirmModalProps {
  open: boolean;
  title: string;
  itemName?: string;
  description?: string;
  confirmText?: string;
  loading?: boolean;
  error?: string | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export function DeleteConfirmModal({
  open,
  title,
  itemName,
  description = "This action is permanent and cannot be undone. Are you sure you want to proceed?",
  confirmText = "Delete",
  loading = false,
  error = null,
  onConfirm,
  onCancel,
}: DeleteConfirmModalProps) {
  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    },
    [loading, onCancel]
  );

  useEffect(() => {
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="delete-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-royal-plum/30 backdrop-blur-sm"
            onClick={() => {
              if (!loading) onCancel();
            }}
          />

          {/* Modal Dialog */}
          <motion.div
            key="delete-modal"
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 16 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
            aria-modal="true"
            role="dialog"
            aria-labelledby="delete-confirm-title"
            onClick={(e) => {
              if (e.target === e.currentTarget && !loading) {
                onCancel();
              }
            }}
          >
            <div
              className="w-full max-w-sm bg-white rounded-3xl shadow-card-hover border border-dusty-pink/20 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header strip */}
              <div className="bg-cream-gradient px-6 pt-6 pb-4 border-b border-dusty-pink/10 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-200/60 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2
                      id="delete-confirm-title"
                      className="text-royal-plum font-bold text-base font-bona-nova leading-snug"
                    >
                      {title}
                    </h2>
                    <p className="text-xs text-dusty-pink font-medium mt-0.5">
                      Confirm permanent removal
                    </p>
                  </div>
                </div>
                <button
                  onClick={onCancel}
                  disabled={loading}
                  className="p-1.5 rounded-xl text-dusty-pink hover:text-royal-plum hover:bg-cream transition-colors disabled:opacity-50 cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {itemName && (
                  <div className="flex items-center gap-2.5 p-3 bg-red-50/50 rounded-2xl border border-red-100 mb-4">
                    <div className="w-7 h-7 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
                      <Trash2 className="w-3.5 h-3.5 text-red-600" />
                    </div>
                    <span className="text-royal-plum text-sm font-bold truncate">
                      {itemName}
                    </span>
                  </div>
                )}

                <p className="text-xs sm:text-sm text-forest-green/80 font-medium leading-relaxed mb-4">
                  {description}
                </p>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs font-semibold mb-4"
                  >
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <span className="leading-snug">{error}</span>
                  </motion.div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-1">
                  <motion.button
                    type="button"
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    onClick={onCancel}
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 rounded-xl border border-dusty-pink/30 bg-cream hover:bg-cream-dark text-royal-plum text-sm font-semibold transition-all duration-200 disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </motion.button>

                  <motion.button
                    type="button"
                    whileHover={{ scale: loading ? 1 : 1.02 }}
                    whileTap={{ scale: loading ? 1 : 0.98 }}
                    onClick={onConfirm}
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        {confirmText}
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
