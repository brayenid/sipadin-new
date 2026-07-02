"use client";

/**
 * MobileActionBar — shows children as a fixed full-width bar at the bottom on mobile,
 * invisible on lg+ (desktop handles its own button placement inline).
 */
export default function MobileActionBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-4 py-3 bg-white/90 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_-4px_rgba(0,0,0,0.08)] flex flex-col gap-2">
      {children}
    </div>
  );
}
