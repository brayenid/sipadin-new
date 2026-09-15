"use client";

import React, { useState } from "react";
import { Menu, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "./SidebarProvider";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export interface MobileBottomNavProps {
  /**
   * Elemen aksi utama di sebelah kiri (misal tombol "+ Buat SPJ", "+ Buat Agenda", "Simpan", dll).
   * Biasanya fleksibel mengisi ruang (flex-1).
   */
  primaryAction?: React.ReactNode;

  /**
   * Opsi tambahan untuk drawer sekunder di tombol tengah [ ... ].
   */
  secondaryDrawer?: {
    title: string;
    description?: string;
    triggerIcon?: React.ReactNode;
    children: React.ReactNode | ((close: () => void) => React.ReactNode);
  };

  /**
   * Konten custom tambahan jika tidak memakai pola standar 3 tombol.
   */
  children?: React.ReactNode;

  /**
   * Kelas styling opsional untuk container bar.
   */
  className?: string;
}

export default function MobileBottomNav({
  primaryAction,
  secondaryDrawer,
  children,
  className = "",
}: MobileBottomNavProps) {
  const { toggle: toggleSidebar } = useSidebar();
  const [isSecondaryOpen, setIsSecondaryOpen] = useState(false);

  // Jika tidak ada primaryAction, secondaryDrawer, maupun children:
  // Tampilkan Floating Action Button (FAB) hamburger bulat yang elegan di kanan bawah.
  if (!primaryAction && !secondaryDrawer && !children) {
    return (
      <div className="lg:hidden fixed bottom-5 right-4 z-30">
        <Button
          type="button"
          onClick={toggleSidebar}
          size="icon"
          className="h-12 w-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-600/30 active:scale-95 transition-transform flex items-center justify-center"
          aria-label="Buka Menu"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <>
      <div
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-30 px-3.5 py-2.5 bg-white/95 backdrop-blur border-t border-slate-200/80 shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.07)] flex items-center gap-2 ${className}`}
      >
        {children ? (
          children
        ) : (
          <>
            {/* 1. KIRI: Aksi Utama (Lebar & Utama) */}
            {primaryAction && (
              <div className="flex-1 min-w-0">
                {primaryAction}
              </div>
            )}

            {/* 2. TENGAH: Aksi Tambahan (Drawer Sekunder) */}
            {secondaryDrawer && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsSecondaryOpen(true)}
                className="h-10 w-10 shrink-0 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs active:scale-95 transition-transform"
                title={secondaryDrawer.title}
                aria-label={secondaryDrawer.title}
              >
                {secondaryDrawer.triggerIcon || <MoreHorizontal className="w-4 h-4" />}
              </Button>
            )}

            {/* 3. KANAN: Hamburger Menu Navigasi Utama Aplikasi */}
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={toggleSidebar}
              className="h-10 w-10 shrink-0 bg-white border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs active:scale-95 transition-transform"
              title="Menu Navigasi"
              aria-label="Buka Menu Navigasi"
            >
              <Menu className="w-4 h-4" />
            </Button>
          </>
        )}
      </div>

      {/* Drawer Aksi Tambahan Sekunder */}
      {secondaryDrawer && (
        <Drawer open={isSecondaryOpen} onOpenChange={setIsSecondaryOpen} showSwipeHandle>
          <DrawerContent className="lg:hidden bg-white outline-none rounded-t-2xl pb-6">
            <DrawerHeader className="p-4 border-b border-slate-100 text-left">
              <DrawerTitle className="text-sm font-bold text-slate-900">
                {secondaryDrawer.title}
              </DrawerTitle>
              {secondaryDrawer.description && (
                <DrawerDescription className="text-xs text-slate-500">
                  {secondaryDrawer.description}
                </DrawerDescription>
              )}
            </DrawerHeader>

            <div className="p-3 space-y-1.5 max-h-[70vh] overflow-y-auto">
              {typeof secondaryDrawer.children === "function"
                ? secondaryDrawer.children(() => setIsSecondaryOpen(false))
                : secondaryDrawer.children}
            </div>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
}
