import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "HackAtlas — Discover Every Hackathon. Miss Nothing.",
    template: "%s | HackAtlas",
  },
  description:
    "HackAtlas aggregates hackathons from Devpost, Devfolio, MLH, Unstop, and more. Find, filter, and track every hackathon opportunity in one unified feed.",
  keywords: [
    "hackathon",
    "hackathons",
    "devpost",
    "devfolio",
    "mlh",
    "unstop",
    "coding competition",
    "developer events",
    "hackathon discovery",
    "tech events",
  ],
  authors: [{ name: "HackAtlas Team" }],
  creator: "HackAtlas",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://hackatlas.dev",
    siteName: "HackAtlas",
    title: "HackAtlas — Discover Every Hackathon. Miss Nothing.",
    description:
      "Unified hackathon discovery platform. Aggregating from Devpost, Devfolio, MLH, Unstop, and more.",
  },
  twitter: {
    card: "summary_large_image",
    title: "HackAtlas — Discover Every Hackathon",
    description: "Unified hackathon discovery platform for developers.",
    creator: "@hackatlas",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#08080a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-[#08080a] text-[#f5f5f7]`}
      >
        {children}
      </body>
    </html>
  );
}
