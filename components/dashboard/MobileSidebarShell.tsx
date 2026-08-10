"use client";

import { useSidebar } from "./SidebarProvider";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

export default function MobileSidebarShell({
  sidebarContent,
}: {
  sidebarContent: React.ReactNode;
}) {
  const { isOpen, close, toggle, open } = useSidebar();

  return (
    <>
      {/* Mobile top bar — only visible below lg */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card border-b border-slate-200/60 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center hover:opacity-80 transition-opacity">
          <img src="/sipadin.png" alt="SIPADIN Logo" className="h-8 sm:h-9 w-auto object-contain" />
        </Link>
        <button
          onClick={toggle}
          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <Drawer open={isOpen} onOpenChange={(val) => (val ? open() : close())} showSwipeHandle>
        <DrawerContent className="lg:hidden h-[95dvh] max-h-[95dvh] bg-card outline-none">
          <div className="sr-only">
            <DrawerHeader>
              <DrawerTitle>Menu Navigasi</DrawerTitle>
              <DrawerDescription>
                Pilih menu untuk navigasi aplikasi
              </DrawerDescription>
            </DrawerHeader>
          </div>
          
          {/* Scrollable area for sidebar content */}
          <div className="flex-1 overflow-y-auto pb-4">
            {sidebarContent}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
