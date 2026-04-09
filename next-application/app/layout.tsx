import type { Metadata, Viewport } from "next";
import { Exo, Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";

const exo = Exo({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-exo",
});

const outfit = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-outfit",
});

export const metadata: Metadata = {
  title: "AI Incident Assistant",
  description:
    "AI Incident Assistant uses LangChain, Vercel AI Gateway, and MCP tooling to accelerate incident response.",
  keywords: ["AI", "incident", "MCP", "LangChain", "Vercel AI Gateway", "SRE"],
  authors: [{ name: "AI Incident Assistant Team" }],
  creator: "AI Incident Assistant",
  openGraph: {
    title: "AI Incident Assistant",
    description:
      "LangChain orchestration with Vercel AI Gateway and MCP tools for incident workflows.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Incident Assistant",
    description:
      "LangChain orchestration with Vercel AI Gateway and MCP tools for incident workflows.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="light">
      <body
        className={`${exo.variable} ${outfit.variable} font-outfit antialiased bg-slate-50 text-slate-900`}
        suppressHydrationWarning
      >
        <div className="min-h-screen relative flex flex-col overflow-x-hidden">
          {/* Base Laboratory Background */}
          <div className="absolute inset-0 bg-white"></div>
          
          {/* Subtle Grid Overlay */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000005_1px,transparent_1px),linear-gradient(to_bottom,#00000005_1px,transparent_1px)] bg-[size:40px_40px]"></div>
          
          {/* Soft Gradient Accents */}
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.03)_0%,transparent_50%)]"></div>

          <header className="sticky top-0 z-50 shrink-0 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md">
            <Navbar />
          </header>

          <div className="relative z-10 flex min-h-0 flex-1 flex-col">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
 