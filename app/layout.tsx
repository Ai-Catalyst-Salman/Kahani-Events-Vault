import type { Metadata } from "next";
import { Bona_Nova } from "next/font/google";
import "./globals.css";

const bonaNova = Bona_Nova({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-bona-nova",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kahani Events Vault",
  description: "Enterprise-grade presentation showroom for Kahani Events",
  icons: {
    icon: [
      { url: "/icon.png" },
      { url: "/favicon.ico" },
    ],
    apple: [
      { url: "/apple-icon.png" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={bonaNova.variable}>
      <body className="font-bona-nova bg-cream antialiased">
        {children}
      </body>
    </html>
  );
}
