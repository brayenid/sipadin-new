"use client";

import { useSidebar } from "./SidebarProvider";
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
        <div className="flex items-center">
          <img src="/sipadin.png" alt="SIPADIN Logo" className="h-7 w-auto object-contain" />
        </div>
        <button
          onClick={toggle}
          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <Drawer open={isOpen} onOpenChange={(val) => (val ? open() : close())} showSwipeHandle>
        <DrawerContent className="lg:hidden max-h-[85vh] bg-card outline-none">
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
