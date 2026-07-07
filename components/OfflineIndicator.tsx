"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { toast } from "sonner";

export default function OfflineIndicator() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Check initial state
    if (typeof window !== "undefined" && !navigator.onLine) {
      setIsOffline(true);
    }

    const handleOnline = () => {
      setIsOffline(false);
      toast.success("Koneksi internet kembali pulih.");
    };

    const handleOffline = () => {
      setIsOffline(true);
      toast.error("Anda sedang offline. Beberapa fitur mungkin tidak berfungsi.");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Register Service Worker for PWA
    if (typeof navigator !== 'undefined' && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => console.log("Service Worker registered.", reg))
        .catch((err) => console.error("Service Worker registration failed.", err));
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 bg-red-600 text-white flex items-center justify-center gap-2 shadow-lg animate-in slide-in-from-bottom-2">
      <WifiOff className="w-5 h-5" />
      <span className="font-medium text-sm">
        Koneksi Terputus. Anda sedang dalam mode offline. Mohon periksa jaringan internet Anda.
      </span>
    </div>
  );
}
