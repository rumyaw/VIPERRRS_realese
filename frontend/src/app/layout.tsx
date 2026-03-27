import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppHeader } from "@/components/layout/AppHeader";
import { BackgroundParticles } from "@/components/effects/BackgroundParticles";
import { GradientBackground } from "@/components/effects/GradientBackground";
import { Providers } from "@/components/providers";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin", "cyrillic"],
});


export const metadata: Metadata = {
  title: "Трамплин — карьерная платформа",
  description:
    "Экосистема для студентов, выпускников и работодателей: вакансии, стажировки, менторство и мероприятия на карте.",
  icons: { icon: "/images/logo.png" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FDF8F0" },
    { media: "(prefers-color-scheme: dark)", color: "#03060f" },
  ],
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen font-sans antialiased`}
      >
        <Providers>
          <GradientBackground />
          <BackgroundParticles />
          <AppHeader />
          <main className="mx-auto max-w-6xl px-[max(0.75rem,env(safe-area-inset-left))] py-6 pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5 sm:py-8 md:px-6">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
