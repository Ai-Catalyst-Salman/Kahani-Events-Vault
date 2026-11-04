"use client";

import { Bona_Nova } from "next/font/google";
import "./globals.css";
import { VaultStatusScreen } from "@/components/VaultStatusScreen";

const bonaNova = Bona_Nova({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-bona-nova",
  display: "swap",
});

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className={bonaNova.variable}>
      <body className="font-bona-nova bg-cream antialiased">
        <VaultStatusScreen
          variant="error"
          onRetry={reset}
          reference={error.digest}
        />
      </body>
    </html>
  );
}
