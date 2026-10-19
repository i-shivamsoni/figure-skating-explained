import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { SkaterDrawer } from "@/components/SkaterDrawer";
import { ShortcutsDialog } from "@/components/ShortcutsDialog";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Figure Skating Explained", template: "%s · Figure Skating Explained" },
  description:
    "An interactive 3D guide to the elements of figure skating: jumps from single to quint, spins, step sequences and how the ISU Judging System scores them, built on the 2026-27 rules.",
  metadataBase: new URL("https://figure-skating-explained.vercel.app"),
};

/** Applies the saved theme before the first paint so a dark-theme visitor never sees a light flash. */
const THEME_SCRIPT = "try{var t=localStorage.getItem('fse-theme');if(t==='light'||t==='dark')document.documentElement.dataset.theme=t}catch(e){}";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <SiteNav />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <SkaterDrawer />
        <ShortcutsDialog />
        <Analytics />
      </body>
    </html>
  );
}
