import type { Metadata } from "next";
import { VaultStatusScreen } from "@/components/VaultStatusScreen";

export const metadata: Metadata = {
  title: "Page not found · Kahani Ke Kisse",
  description: "This page is not part of Kahani Ke Kisse.",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return <VaultStatusScreen variant="not-found" />;
}
