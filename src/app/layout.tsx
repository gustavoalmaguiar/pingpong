import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";
import { Navbar } from "@/components/layout/navbar";
import { FloatingActionButton } from "@/components/match";
import { auth } from "@/lib/auth";
import { config, isAuthRequired } from "@/lib/config";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: config.branding.title,
  description: config.branding.description,
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  // In demo mode (auth not required), always show UI elements
  // In company mode (auth required), only show when authenticated
  const showAppChrome = !isAuthRequired() || !!session;

  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <Providers>
          {showAppChrome && <Navbar />}
          <main className={showAppChrome ? "pl-16" : ""}>
            {children}
          </main>
          {showAppChrome && <FloatingActionButton />}
        </Providers>
      </body>
    </html>
  );
}
