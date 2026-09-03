export interface KlasifikasiSuratItem {
  kode: string;
  perihal: string;
  keterangan?: string;
}

export const KLASIFIKASI_SURAT_PRESETS: KlasifikasiSuratItem[] = [
  { kode: "000.1.5", perihal: "Undangan" },
  { kode: "800.1.11.1", perihal: "SPT (Surat Perintah Tugas)" },
  { kode: "000.1.2.3", perihal: "SPPD (Surat Perintah Perjalanan Dinas / SPD)" },
  { kode: "000.1.4", perihal: "Peminjaman Ruangan" },
  { kode: "000.8", perihal: "Bagian Organisasi / Laporan Perjalanan Dinas" },
  { kode: "000.1.6", perihal: "Makan Minum Rapat" },
  { kode: "000.1.9.1", perihal: "Perbaikan / Pemeliharaan" },
  { kode: "800", perihal: "Kepegawaian" },
  { kode: "800.1.11.13", perihal: "KGB (Kenaikan Gaji Berkala)" },
  { kode: "000.3.3", perihal: "Permintaan Barang / Surat Pengantar / BASTB" },
  { kode: "000.2.3.1", perihal: "Pemeriksaan Barang (BAPB)" },
  { kode: "000.5.3.3", perihal: "Cindera Mata / Hadiah" },
  { kode: "900.1.8.2", perihal: "Pajak Makan Minum" },
  { kode: "000.2.3.6", perihal: "Telaahan Staf Perjalanan Dinas Pegawai" },
  { kode: "180.3.2", perihal: "Rancangan Peraturan Daerah" },
  { kode: "180.34", perihal: "Surat Edaran" },
  { kode: "800.1.3.2", perihal: "Kenaikan Pangkat / Golongan" },
  { kode: "800.1.11.2", perihal: "Cuti Sakit" },
  { kode: "800.1.11.4", perihal: "Cuti Tahunan" },
];
