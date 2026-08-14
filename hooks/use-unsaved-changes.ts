"use client";

import { useEffect, useCallback } from "react";

/**
 * Hook untuk melacak dan mencegah navigasi keluar saat ada perubahan yang belum disimpan
 * menggunakan dialog konfirmasi bawaan browser (window.confirm & beforeunload).
 *
 * @param isDirty - Boolean yang menunjukkan apakah ada perubahan yang belum disimpan.
 * @returns `{ confirmLeave, showDialog: false, confirmLeaveCallback: () => {}, cancelLeave: () => {} }`
 */
export function useUnsavedChanges(isDirty: boolean) {
  // Cegah penutupan/refresh tab browser bawaan
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  /**
   * Panggil fungsi ini sebelum melakukan perpindahan tab/navigasi.
   * Menampilkan window.confirm bawaan browser jika ada perubahan belum disimpan.
   */
  const confirmLeave = useCallback((): Promise<boolean> => {
    if (!isDirty) return Promise.resolve(true);

    const ok = window.confirm(
      "Perubahan yang Anda buat belum disimpan. Apakah Anda yakin ingin meninggalkan tab ini dan membuang perubahan?"
    );
    return Promise.resolve(ok);
  }, [isDirty]);

  return {
    confirmLeave,
    showDialog: false,
    confirmLeaveCallback: () => {},
    cancelLeave: () => {},
  };
}

