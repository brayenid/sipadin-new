"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Hook untuk melacak dan mencegah navigasi keluar saat ada perubahan yang belum disimpan.
 *
 * @param isDirty - Boolean yang menunjukkan apakah ada perubahan yang belum disimpan.
 * @returns `{ showDialog, confirmLeave, cancelLeave }` — state dan handler untuk dialog konfirmasi.
 */
export function useUnsavedChanges(isDirty: boolean) {
  const [showDialog, setShowDialog] = useState(false);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  // Cegah penutupan/refresh tab browser
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  /**
   * Panggil fungsi ini sebelum melakukan navigasi.
   * Jika ada perubahan belum disimpan, menampilkan dialog dan mengembalikan Promise<boolean>.
   * - true  → user memilih "Lanjutkan tanpa simpan"
   * - false → user memilih "Kembali ke form"
   */
  const confirmLeave = useCallback((): Promise<boolean> => {
    if (!isDirty) return Promise.resolve(true);

    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setShowDialog(true);
    });
  }, [isDirty]);

  const confirmLeaveCallback = useCallback(() => {
    resolveRef.current?.(true);
    setShowDialog(false);
  }, []);

  const cancelLeave = useCallback(() => {
    resolveRef.current?.(false);
    setShowDialog(false);
  }, []);

  return { showDialog, confirmLeave, confirmLeaveCallback, cancelLeave };
}
