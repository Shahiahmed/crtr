import type { Metadata, Viewport } from "next";
import { Manrope, Unbounded } from "next/font/google";

import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

const displayFont = Unbounded({
  variable: "--font-display",
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
});

const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ЦРТР CS2 Tournament",
  description: "Корпоративный турнир Counter-Strike 2 АО «ЦРТР» — регистрация команд и жеребьёвка",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0a0a0b",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      data-scroll-behavior="smooth"
      className={`${displayFont.variable} ${bodyFont.variable} h-full antialiased`}
    >
      <body className="site-shell">
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
