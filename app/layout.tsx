import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { NavigationLoadingProvider } from "@/components/navigation-loading-provider";
import { ExtensionErrorSuppressor } from "@/components/extension-error-suppressor";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mirai Copilot — AI Placement & Viva Platform",
  description:
    "Mirai Copilot: Autonomous AI Interview Agent for engineering placement vivas, live code execution, real-time voice speech analysis, and multi-tier readiness scoring.",
  keywords: [
    "Mirai Copilot",
    "AI Interviewer",
    "Placement Readiness",
    "Technical Viva",
    "Coding Interview Copilot",
    "MSOT Benchmark",
  ],
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <ExtensionErrorSuppressor />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ClerkProvider appearance={{ theme: shadcn }}>
            <NavigationLoadingProvider>
              {children}
            </NavigationLoadingProvider>
            <Toaster position="bottom-right" richColors />
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}