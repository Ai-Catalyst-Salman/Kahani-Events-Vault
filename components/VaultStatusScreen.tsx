"use client";

import Image from "next/image";
import Link from "next/link";
import { RotateCcw } from "lucide-react";

type VaultStatusScreenProps = {
  variant: "not-found" | "error";
  onRetry?: () => void;
  reference?: string;
};

export function VaultStatusScreen({
  variant,
  onRetry,
  reference,
}: VaultStatusScreenProps) {
  const missing = variant === "not-found";

  return (
    <div className="min-h-screen bg-cream-gradient flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-32 -right-24 w-[28rem] h-[28rem] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #8C345C, transparent 70%)" }}
        />
        <div
          className="absolute -bottom-36 -left-24 w-[26rem] h-[26rem] rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #1E544A, transparent 70%)" }}
        />
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full opacity-[0.07]"
          style={{ background: "radial-gradient(circle, #CD9556, transparent 70%)" }}
        />
      </div>

      <div className="w-full max-w-lg relative z-10">
        <div className="flex justify-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 group">
            <Image
              src="/logo.png"
              alt="Kahani Events"
              width={48}
              height={36}
              className="object-contain h-9 w-auto"
              priority
            />
            <span className="font-bona-nova text-xl tracking-tight">
              <span className="font-bold text-royal-plum">Kahani</span>
              <span className="text-soft-gold"> Vault</span>
            </span>
          </Link>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-card border border-dusty-pink/20 px-6 py-10 sm:px-12 text-center">
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-soft-gold">
            {missing ? "Page not found" : "Request interrupted"}
          </p>

          {missing ? (
            <p
              aria-hidden
              className="mt-4 font-bona-nova text-7xl sm:text-8xl leading-none tracking-tight text-royal-plum"
            >
              4<span className="text-soft-gold">0</span>4
            </p>
          ) : (
            <p
              aria-hidden
              className="mt-5 font-bona-nova text-5xl leading-none tracking-tight text-royal-plum"
            >
              —
            </p>
          )}

          <div className="mx-auto mt-5 h-px w-16 bg-gradient-to-r from-transparent via-soft-gold to-transparent" />

          <h1 className="mt-5 font-bona-nova text-[1.65rem] sm:text-3xl text-royal-plum text-balance">
            {missing ? "This page is not in the vault" : "We could not open this page"}
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-forest-green/65 max-w-sm mx-auto">
            {missing
              ? "The address may be mistyped, or this page has been moved. Return to the vault to continue with your presentations."
              : "A problem interrupted this request. Your presentations were not changed. Try again, or return to the vault."}
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Link
              href="/"
              className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-plum-gradient text-white font-semibold rounded-xl shadow-glow-plum text-sm tracking-wide transition-opacity hover:opacity-95"
            >
              Return to the vault
            </Link>
            {onRetry ? (
              <button
                type="button"
                onClick={onRetry}
                className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-white border border-dusty-pink/35 text-royal-plum font-semibold rounded-xl text-sm tracking-wide transition-colors hover:bg-cream cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Try again
              </button>
            ) : null}
          </div>

          {reference ? (
            <p className="mt-6 text-[11px] tracking-wide text-forest-green/40">
              Reference {reference}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
