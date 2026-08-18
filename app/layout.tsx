import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import OfflineIndicator from "@/components/OfflineIndicator";
import NextTopLoader from 'nextjs-toploader';
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "SIPADIN",
  description: "Sistem pengarsipan dinas tim Bagian Organisasi, dikembangkan oleh Tim PPTL",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SIPADIN",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "SIPADIN",
    description: "Sistem pengarsipan dinas tim Bagian Organisasi, dikembangkan oleh Tim PPTL",
    url: "/",
    siteName: "SIPADIN",
    images: [
      {
        url: "/sipadin.png",
        width: 1200,
        height: 630,
        alt: "SIPADIN Logo",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SIPADIN",
    description: "Sistem pengarsipan dinas tim Bagian Organisasi, dikembangkan oleh Tim PPTL",
    images: ["/sipadin.png"],
  },
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
      "max-video-preview": -1,
      "max-image-preview": "none",
      "max-snippet": -1,
    },
  },
};

export const viewport = {
  themeColor: "#1e293b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${jakarta.variable} h-full antialiased`}>
      <body className="min-h-full font-sans bg-background text-foreground">
        <NextTopLoader color="#3b82f6" height={5} showSpinner={false} />
        {children}
        <OfflineIndicator />
        <Toaster position="top-center" />
      </body>
    </html>
  );
}
