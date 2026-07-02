"use client";

import { useSidebar } from "./SidebarProvider";
import { Menu, X } from "lucide-react";

export default function MobileSidebarShell({
  sidebarContent,
}: {
  sidebarContent: React.ReactNode;
}) {
  const { isOpen, close, toggle } = useSidebar();

  return (
    <>
      {/* Mobile top bar — only visible below lg */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card border-b border-border flex items-center px-4 gap-3 shadow-sm">
        <button
          onClick={toggle}
          className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-md bg-primary text-primary-foreground text-xs font-bold">
            S
          </div>
          <span className="text-sm font-bold text-slate-900">SIPADIN</span>
        </div>
      </div>

      {/* Spacer so content doesn't hide behind mobile top bar — handled via main pt-14 in layout */}

      {/* Backdrop overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity"
          onClick={close}
          aria-hidden
        />
      )}

      {/* Sliding sidebar drawer */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-50 h-full w-72 bg-card border-r border-border flex flex-col overflow-y-auto shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button inside drawer */}
        <div className="absolute top-3 right-3">
          <button
            onClick={close}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {sidebarContent}
      </aside>
    </>
  );
}
