import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: "/",
      },
      {
        userAgent: "Googlebot",
        disallow: "/",
      },
      {
        userAgent: "Googlebot-Image",
        disallow: "/",
      },
      {
        userAgent: "Bingbot",
        disallow: "/",
      },
      {
        userAgent: "Slurp",
        disallow: "/",
      },
      {
        userAgent: "DuckDuckBot",
        disallow: "/",
      },
      {
        userAgent: "Baiduspider",
        disallow: "/",
      },
      {
        userAgent: "YandexBot",
        disallow: "/",
      },
      {
        // Crawler AI Scraper
        userAgent: ["GPTBot", "ChatGPT-User", "CCBot", "anthropic-ai", "Claude-Web", "Google-Extended"],
        disallow: "/",
      },
      {
        // Izinkan bot perpesanan (WhatsApp/Telegram) membaca link preview presensi publik tanpa mengindeks
        userAgent: ["WhatsApp", "facebookexternalhit", "TelegramBot", "Twitterbot"],
        allow: "/p/absensi/",
        disallow: ["/dashboard/", "/api/", "/uploads/", "/login", "/register"],
      },
    ],
  };
}
