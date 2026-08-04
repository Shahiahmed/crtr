import type { Metadata } from "next";
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
  title: "ЦРТР CS Tournament",
  description: "Корпоративный турнир Counter-Strike АО «ЦРТР» — регистрация команд и жеребьёвка",
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
