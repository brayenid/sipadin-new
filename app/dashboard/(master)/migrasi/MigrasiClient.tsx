"use client";

import { useState, useMemo } from "react";
import { executeImportMigration } from "@/app/actions/migrasi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Upload,
  Database,
  Users,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Coins,
  ArrowRight,
  Terminal,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

type V2User = { id: string; name: string; username: string };
type V2Pegawai = { id: string; nama: string; nip: string | null; jabatan: string };
type V2Team = { id: string; name: string };

type Props = {
  users: V2User[];
  pegawais: V2Pegawai[];
  teams: V2Team[];
  currentTeamId: string;
};

export default function MigrasiClient({ users, pegawais, teams, currentTeamId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [jsonData, setJsonData] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  // Mappings state
  const [targetTeamId, setTargetTeamId] = useState(currentTeamId);
  const [userMapping, setUserMapping] = useState<Record<string, string>>({}); // v1_id -> v2_id
  const [pegawaiMapping, setPegawaiMapping] = useState<
    Record<string, { action: "USE_EXISTING" | "CREATE_NEW" | "OVERWRITE"; v2Id?: string }>
  >({});
  const [rekeningPagu, setRekeningPagu] = useState<Record<string, number>>({});
  const [spjOverwrite, setSpjOverwrite] = useState<Record<string, "OVERWRITE" | "SKIP" | "KEEP_DUPLICATE">>({});

  // Execution state
  const [isImporting, setIsImporting] = useState(false);
  const [migrationLogs, setMigrationLogs] = useState<string[]>([]);
  const [migrationResult, setMigrationResult] = useState<any>(null);

  // Tab state untuk resolution forms
  const [activeTab, setActiveTab] = useState<"umum" | "users" | "pegawai" | "anggaran" | "spj">("umum");

  // 1. Handle File Upload & Parsing
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.version !== 1 || !Array.isArray(parsed.spjs)) {
          throw new Error("Format file JSON tidak valid atau bukan berkas hasil ekspor SPJ V1.");
        }
        setJsonData(parsed);
        initializeMappings(parsed);
        toast.success("File JSON berhasil diunggah dan dianalisis.");
      } catch (err: any) {
        setParseError(err.message || "Gagal mengurai file JSON. Pastikan file valid.");
        setJsonData(null);
        toast.error("Gagal membaca file JSON.");
      }
    };
    reader.readAsText(selectedFile);
  };

  // 2. Inisialisasi State Pemetaan berdasarkan data JSON yang diunggah
  const initializeMappings = (data: any) => {
    // a. Pemetaan User V1 -> V2 (Auto-match by username)
    const userMap: Record<string, string> = {};
    for (const v1User of data.users || []) {
      const match = users.find(
        (u) => u.username.toLowerCase() === v1User.username.toLowerCase()
      );
      userMap[v1User.id] = match ? match.id : users[0]?.id || "";
    }
    setUserMapping(userMap);

    // b. Pemetaan Pegawai (Auto-detect duplicate NIP)
    const pegMap: Record<
      string,
      { action: "USE_EXISTING" | "CREATE_NEW" | "OVERWRITE"; v2Id?: string }
    > = {};
    for (const v1Peg of data.pegawais || []) {
      if (v1Peg.nip) {
        const match = pegawais.find((p) => p.nip === v1Peg.nip);
        if (match) {
          pegMap[v1Peg.id] = { action: "USE_EXISTING", v2Id: match.id };
          continue;
        }
      }
      pegMap[v1Peg.id] = { action: "CREATE_NEW" };
    }
    setPegawaiMapping(pegMap);

    // c. Pemetaan Anggaran & Nilai Kuitansi V1 -> Pagu Editable V2
    const paguMap: Record<string, number> = {};
    const spjGroupedByRekening: Record<string, number> = {};

    for (const spj of data.spjs || []) {
      if (spj.kodeRekening) {
        const totalCost = spj.rincian?.reduce((sum: number, r: any) => sum + (r.total || 0), 0) || 0;
        spjGroupedByRekening[spj.kodeRekening] = (spjGroupedByRekening[spj.kodeRekening] || 0) + totalCost;
      }
    }

    for (const key of Object.keys(spjGroupedByRekening)) {
      paguMap[key] = spjGroupedByRekening[key]; // Default pagu adalah jumlah nilai kuitansi V1
    }
    setRekeningPagu(paguMap);

    // d. Kebijakan duplikasi SPJ BKU
    const bkuMap: Record<string, "OVERWRITE" | "SKIP" | "KEEP_DUPLICATE"> = {};
    for (const spj of data.spjs || []) {
      bkuMap[spj.id] = "KEEP_DUPLICATE"; // Default kebijakan duplikasi
    }
    setSpjOverwrite(bkuMap);
  };

  // 3. Menghitung Anggaran Unik dari File
  const uniqueRekeningV1 = useMemo(() => {
    if (!jsonData) return [];
    const map = new Map<string, any>();
    for (const spj of jsonData.spjs || []) {
      if (spj.kodeRekening && !map.has(spj.kodeRekening)) {
        const total = jsonData.spjs
          .filter((s: any) => s.kodeRekening === spj.kodeRekening)
          .reduce((sum: number, s: any) => sum + (s.rincian?.reduce((sumR: number, r: any) => sumR + (r.total || 0), 0) || 0), 0);

        map.set(spj.kodeRekening, {
          kodeRekening: spj.kodeRekening,
          judulRekening: spj.judulRekening || "Belanja Perjalanan Dinas",
          subKegiatan: spj.judulSubKegiatan || "-",
          totalKuitansi: total,
        });
      }
    }
    return Array.from(map.values());
  }, [jsonData]);

  // 4. Hitung Statistik Konflik Pegawai
  const pegawaiConflictCount = useMemo(() => {
    if (!jsonData) return 0;
    let count = 0;
    for (const p of jsonData.pegawais || []) {
      if (p.nip && pegawais.some((v2) => v2.nip === p.nip)) {
        count++;
      }
    }
    return count;
  }, [jsonData, pegawais]);

  // 5. Eksekusi Impor
  const handleStartImport = async () => {
    setIsImporting(true);
    setMigrationLogs(["Menghubungi server action SIPADIN V2...", "Mengirim payload konfigurasi..."]);
    setMigrationResult(null);

    try {
      const res = await executeImportMigration({
        jsonData,
        mappings: {
          teamId: targetTeamId,
          userMapping,
          pegawaiMapping,
          rekeningPagu,
          spjOverwrite,
        },
      });

      setMigrationResult(res);
      setMigrationLogs(res.logs);

      if (res.success) {
        toast.success("Migrasi selesai!");
      } else {
        toast.error(`Migrasi gagal: ${res.error || "Terjadi kesalahan fatal"}`);
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Terjadi kesalahan fatal selama migrasi.");
      setMigrationLogs((prev) => [...prev, `❌ ERROR FATAL: ${err.message || err}`]);
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setJsonData(null);
    setParseError(null);
    setMigrationResult(null);
    setMigrationLogs([]);
  };

  // RENDER LOADING SCREEN
  if (isImporting) {
    return (
      <Card className="border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] bg-white max-w-4xl mx-auto overflow-hidden">
        <CardHeader className="bg-slate-50 border-b p-5">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <div>
              <CardTitle className="text-base font-bold">Proses Migrasi Berjalan</CardTitle>
              <CardDescription>Menyimpan data, menghitung pagu, mengonversi dokumen secara real-time.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>Menulis ke database target...</span>
            <span>Progress: Menunggu Server</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 animate-pulse w-3/4 rounded-full" />
          </div>

          <div className="border border-slate-900 rounded-lg overflow-hidden shadow-inner bg-slate-950 font-mono text-[11px] text-slate-300">
            <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center gap-2 text-slate-400 font-semibold">
              <Terminal className="w-3.5 h-3.5" />
              <span>Migration Logs Console</span>
            </div>
            <pre className="p-4 h-80 overflow-y-auto whitespace-pre-wrap leading-relaxed select-all no-scrollbar">
              {migrationLogs.join("\n")}
            </pre>
          </div>
        </CardContent>
      </Card>
    );
  }

  // RENDER RESULT SCREEN
  if (migrationResult) {
    const isSuccess = migrationResult.success;
    return (
      <Card className="border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] bg-white max-w-4xl mx-auto overflow-hidden">
        <CardHeader className={`${isSuccess ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'} border-b p-5`}>
          <div className="flex items-center gap-3">
            {isSuccess ? (
              <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" />
            )}
            <div>
              <CardTitle className={`text-base font-bold ${isSuccess ? 'text-emerald-950' : 'text-red-950'}`}>
                {isSuccess ? 'Migrasi Selesai dengan Sukses' : 'Migrasi Gagal'}
              </CardTitle>
              <CardDescription className={isSuccess ? 'text-emerald-700/80' : 'text-red-700/80'}>
                {isSuccess 
                  ? 'Proses impor selesai. Seluruh transaksi berhasil di-commit secara aman.' 
                  : 'Proses impor dihentikan karena kesalahan fatal. Seluruh perubahan telah di-rollback.'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {isSuccess && (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-lg text-center shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Sukses Diimpor</span>
                <span className="text-3xl font-black text-slate-900 block mt-1">{migrationResult.successCount}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">SPJ Perjalanan Dinas</span>
              </div>
              <div className="bg-amber-50/50 border border-amber-200/60 p-4 rounded-lg text-center shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Dilewati</span>
                <span className="text-3xl font-black text-amber-700 block mt-1">{migrationResult.skippedCount}</span>
                <span className="text-[10px] text-amber-600 block mt-0.5">BKU Duplikat</span>
              </div>
              <div className="bg-red-50/50 border border-red-200/60 p-4 rounded-lg text-center shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
                <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Gagal (Error)</span>
                <span className="text-3xl font-black text-red-700 block mt-1">{migrationResult.errorCount}</span>
                <span className="text-[10px] text-red-600 block mt-0.5">Batal Masuk</span>
              </div>
            </div>
          )}

          <div className="border border-slate-200/60 rounded-lg overflow-hidden bg-slate-50 font-mono text-[11px] text-slate-700">
            <div className="bg-slate-100 px-4 py-2 border-b border-slate-200/60 flex items-center gap-2 text-slate-600 font-semibold">
              <Terminal className="w-3.5 h-3.5" />
              <span>Log Hasil Impor</span>
            </div>
            <pre className="p-4 h-60 overflow-y-auto whitespace-pre-wrap leading-relaxed no-scrollbar">
              {migrationLogs.join("\n")}
            </pre>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" className="text-xs" onClick={handleReset}>
              Impor File Lain
            </Button>
            {isSuccess && (
              <Button className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold" onClick={() => window.location.href = "/dashboard/spj"}>
                Buka Daftar SPJ V2
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // RENDER UPLOAD ZONE
  if (!jsonData) {
    return (
      <Card className="border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] bg-white max-w-2xl mx-auto overflow-hidden">
        <CardContent className="p-8">
          <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200 rounded-xl p-8 hover:bg-slate-50/50 hover:border-indigo-400 transition-all cursor-pointer relative">
            <input
              type="file"
              accept=".json"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={handleFileChange}
            />
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-4 text-indigo-600">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">Unggah File Ekspor JSON V1</h3>
            <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
              Pilih file berkas JSON terstruktur hasil dari export endpoint versi 1 (misal `spj_v1_export.json`).
            </p>
            <Badge variant="outline" className="mt-4 text-[10px] px-2 py-0.5 text-slate-500 bg-slate-50">
              Maksimum 50MB
            </Badge>
          </div>

          {parseError && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Error Membaca File:</p>
                <p className="mt-0.5 text-red-700/90 leading-relaxed">{parseError}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // RENDER DATA SUMMARY & CONFLICT RESOLUTION WIZARD
  return (
    <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
      {/* Sidebar Summary */}
      <div className="lg:col-span-1 space-y-4">
        <Card className="border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] bg-white overflow-hidden">
          <CardHeader className="bg-slate-50 border-b py-4 px-5">
            <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500">Summary File V1</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>SPJ Dinas</span>
              </div>
              <span className="font-bold text-slate-800">{jsonData.metadata?.totalSpj || 0} baris</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Pegawai V1</span>
              </div>
              <span className="font-bold text-slate-800">{jsonData.metadata?.totalPegawai || 0} orang</span>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2 text-slate-600 font-medium">
                <Coins className="w-3.5 h-3.5 text-slate-400" />
                <span>Rekening V1</span>
              </div>
              <span className="font-bold text-slate-800">{uniqueRekeningV1.length} akun</span>
            </div>
            {pegawaiConflictCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-md flex gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Konflik Pegawai:</p>
                  <p className="mt-0.5 text-amber-700/90 leading-normal">
                    {pegawaiConflictCount} pegawai memiliki NIP yang sama dengan data di versi 2.
                  </p>
                </div>
              </div>
            )}
            <Button variant="outline" className="w-full text-[10px] h-8 text-destructive border-destructive/20 hover:bg-destructive/5 hover:text-destructive flex gap-1" onClick={handleReset}>
              <RefreshCw className="w-3 h-3" /> Ganti Berkas JSON
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Main Resolution Forms */}
      <div className="lg:col-span-3 space-y-6">
        <Card className="border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] bg-white overflow-hidden">
          {/* SCROLLABLE TABS */}
          <div className="border-b overflow-x-auto no-scrollbar bg-slate-50/50">
            <div className="flex h-11 px-3 items-center gap-5 text-xs font-semibold text-slate-500 border-none w-max">
              <button
                onClick={() => setActiveTab("umum")}
                className={`py-3 px-1 border-b-2 transition-all ${
                  activeTab === "umum" ? "border-indigo-600 text-indigo-600" : "border-transparent hover:text-slate-900"
                }`}
              >
                1. Tenant Target
              </button>
              <button
                onClick={() => setActiveTab("users")}
                className={`py-3 px-1 border-b-2 transition-all ${
                  activeTab === "users" ? "border-indigo-600 text-indigo-600" : "border-transparent hover:text-slate-900"
                }`}
              >
                2. Pemetaan User ({jsonData.users?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("pegawai")}
                className={`py-3 px-1 border-b-2 transition-all ${
                  activeTab === "pegawai" ? "border-indigo-600 text-indigo-600" : "border-transparent hover:text-slate-900"
                }`}
              >
                3. Konflik Pegawai ({jsonData.pegawais?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("anggaran")}
                className={`py-3 px-1 border-b-2 transition-all ${
                  activeTab === "anggaran" ? "border-indigo-600 text-indigo-600" : "border-transparent hover:text-slate-900"
                }`}
              >
                4. Saldo Anggaran ({uniqueRekeningV1.length})
              </button>
              <button
                onClick={() => setActiveTab("spj")}
                className={`py-3 px-1 border-b-2 transition-all ${
                  activeTab === "spj" ? "border-indigo-600 text-indigo-600" : "border-transparent hover:text-slate-900"
                }`}
              >
                5. Kebijakan SPJ ({jsonData.spjs?.length || 0})
              </button>
            </div>
          </div>

          <CardContent className="p-6">
            {/* TAB 1: UMUM (TENANT TARGET) */}
            {activeTab === "umum" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Target Tenant (Team)</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Pilih tim organisasi di SIPADIN V2 yang akan menampung seluruh data hasil migrasi ini.
                  </p>
                </div>
                <div className="max-w-md">
                  <select
                    className="w-full bg-white border border-slate-200/60 rounded-md text-xs px-3 py-2 outline-none focus:border-indigo-500 font-medium"
                    value={targetTeamId}
                    onChange={(e) => setTargetTeamId(e.target.value)}
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="bg-slate-50 border border-slate-200/60 rounded-lg p-4 mt-6 text-xs flex gap-2.5">
                  <Database className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                  <div className="leading-relaxed">
                    <p className="font-bold text-slate-700">Multi-Tenancy Isolation</p>
                    <p className="mt-1 text-slate-500">
                      Seluruh `Pegawai` baru dan transaksi `Spj` hasil migrasi akan dikunci hanya untuk akses tim ini. Pengguna dari tim lain tidak akan bisa membacanya demi privasi.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: USER MAPPING */}
            {activeTab === "users" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Pemetaan Akun Pengguna</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Hubungkan akun pembuat dokumen di versi 1 ke daftar user aktif versi 2.
                  </p>
                </div>

                <div className="border border-slate-200/60 rounded-lg overflow-hidden mt-4">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 font-bold">
                      <tr>
                        <th className="px-4 py-2.5">Nama User V1</th>
                        <th className="px-4 py-2.5">Username V1</th>
                        <th className="px-2 py-2.5 text-center"></th>
                        <th className="px-4 py-2.5">User Mapped V2</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(jsonData.users || []).map((u: any) => (
                        <tr key={u.id}>
                          <td className="px-4 py-3 text-slate-800">{u.name}</td>
                          <td className="px-4 py-3 text-slate-500">{u.username}</td>
                          <td className="px-2 py-3 text-center">
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 inline" />
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="bg-white border border-slate-200/60 rounded-md text-xs px-2.5 py-1.5 outline-none focus:border-indigo-500 font-semibold text-slate-700"
                              value={userMapping[u.id] || ""}
                              onChange={(e) =>
                                setUserMapping({ ...userMapping, [u.id]: e.target.value })
                              }
                            >
                              {users.map((v2) => (
                                <option key={v2.id} value={v2.id}>
                                  {v2.name} ({v2.username})
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: PEGAWAI MAPPING */}
            {activeTab === "pegawai" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Resolusi Konflik Data Pegawai</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Sistem mendeteksi kecocokan NIP antara pegawai V1 dan V2. Pilih resolusi tindakan Anda.
                  </p>
                </div>

                <div className="border border-slate-200/60 rounded-lg overflow-hidden mt-4">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 font-bold">
                      <tr>
                        <th className="px-4 py-2.5">Nama Pegawai V1</th>
                        <th className="px-4 py-2.5">NIP V1</th>
                        <th className="px-4 py-2.5">Status Konflik</th>
                        <th className="px-4 py-2.5">Tindakan Resolusi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(jsonData.pegawais || []).map((p: any) => {
                        const hasConflict = p.nip && pegawais.some((v2) => v2.nip === p.nip);
                        const v2Match = hasConflict
                          ? pegawais.find((v2) => v2.nip === p.nip)
                          : null;
                        const currentRes = pegawaiMapping[p.id] || { action: "CREATE_NEW" };

                        return (
                          <tr key={p.id}>
                            <td className="px-4 py-3">
                              <p className="text-slate-800">{p.nama}</p>
                              <p className="text-[10px] text-slate-400">{p.jabatan}</p>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono">{p.nip || "-"}</td>
                            <td className="px-4 py-3">
                              {hasConflict ? (
                                <span className="inline-flex items-center gap-1 text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  NIP Bentrok dengan V2
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                  Aman (Pegawai Baru)
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                className="bg-white border border-slate-200/60 rounded-md text-xs px-2.5 py-1.5 outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                value={currentRes.action}
                                onChange={(e) => {
                                  const action = e.target.value as any;
                                  setPegawaiMapping({
                                    ...pegawaiMapping,
                                    [p.id]: {
                                      action,
                                      v2Id: action !== "CREATE_NEW" ? v2Match?.id : undefined,
                                    },
                                  });
                                }}
                              >
                                {hasConflict && (
                                  <>
                                    <option value="USE_EXISTING">Gunakan Profil V2 yang Ada</option>
                                    <option value="OVERWRITE">Timpa Profil V2 dengan Data V1</option>
                                  </>
                                )}
                                <option value="CREATE_NEW">Buat Pegawai Baru di V2</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 4: BUDGET MAPPING */}
            {activeTab === "anggaran" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Resolusi Pagu Anggaran (Saldo Awal)</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Sistem mendeteksi kode rekening di bawah ini. Sesuaikan saldo awal/pagu nominal anggaran sebelum transaksi diimpor.
                  </p>
                </div>

                <div className="border border-slate-200/60 rounded-lg overflow-hidden mt-4">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 font-bold">
                      <tr>
                        <th className="px-4 py-2.5">Kode / Nama Rekening</th>
                        <th className="px-4 py-2.5">Sub Kegiatan</th>
                        <th className="px-4 py-2.5 text-right">Total Kuitansi SPJ V1</th>
                        <th className="px-4 py-2.5 max-w-[200px]">Pagu Saldo Awal V2 (Dapat Diedit)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {uniqueRekeningV1.map((r: any) => {
                        const currentPagu = rekeningPagu[r.kodeRekening] || 0;

                        return (
                          <tr key={r.kodeRekening}>
                            <td className="px-4 py-3">
                              <span className="font-mono text-indigo-600 block">{r.kodeRekening}</span>
                              <span className="text-slate-700 text-[11px] block mt-0.5">{r.judulRekening}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 truncate max-w-[200px]" title={r.subKegiatan}>
                              {r.subKegiatan}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-800 font-semibold font-mono">
                              Rp {r.totalKuitansi.toLocaleString("id-ID")}
                            </td>
                            <td className="px-4 py-3 max-w-[200px]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400">Rp</span>
                                <Input
                                  type="number"
                                  className="h-8 text-xs font-mono font-semibold"
                                  value={currentPagu}
                                  onChange={(e) => {
                                    const val = Math.max(0, parseInt(e.target.value) || 0);
                                    setRekeningPagu({ ...rekeningPagu, [r.kodeRekening]: val });
                                  }}
                                />
                              </div>
                              {currentPagu < r.totalKuitansi && (
                                <p className="text-[10px] text-red-600 mt-1 flex items-center gap-1 font-semibold">
                                  ⚠️ Pagu di bawah total kuitansi!
                                </p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 5: SPJ CONFLICT POLICY */}
            {activeTab === "spj" && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Kebijakan Duplikasi Nomor BKU SPJ</h3>
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                    Tentukan kebijakan resolusi jika nomor BKU dari berkas V1 terdeteksi sudah terdaftar di versi 2.
                  </p>
                </div>

                <div className="border border-slate-200/60 rounded-lg overflow-hidden mt-4">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-50 border-b border-slate-200/60 text-slate-500 font-bold">
                      <tr>
                        <th className="px-4 py-2.5">Nomor BKU</th>
                        <th className="px-4 py-2.5">Perihal</th>
                        <th className="px-4 py-2.5 text-right">Biaya</th>
                        <th className="px-4 py-2.5">Kebijakan Resolusi Duplikasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {(jsonData.spjs || []).map((spj: any) => {
                        const totalCost = spj.rincian?.reduce((sum: number, r: any) => sum + (r.total || 0), 0) || 0;
                        const currentPolicy = spjOverwrite[spj.id] || "KEEP_DUPLICATE";

                        return (
                          <tr key={spj.id}>
                            <td className="px-4 py-3 text-slate-800 font-mono">{spj.nomorBku || "DRAFT"}</td>
                            <td className="px-4 py-3 text-slate-500 max-w-[250px] truncate" title={spj.maksudDinas}>
                              {spj.maksudDinas}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-800 font-semibold font-mono">
                              Rp {totalCost.toLocaleString("id-ID")}
                            </td>
                            <td className="px-4 py-3">
                              <select
                                className="bg-white border border-slate-200/60 rounded-md text-xs px-2.5 py-1.5 outline-none focus:border-indigo-500 font-semibold text-slate-700"
                                value={currentPolicy}
                                onChange={(e) =>
                                  setSpjOverwrite({
                                    ...spjOverwrite,
                                    [spj.id]: e.target.value as any,
                                  })
                                }
                              >
                                <option value="KEEP_DUPLICATE">Simpan Duplikat (BKU + Suffix)</option>
                                <option value="SKIP">Skip Impor jika BKU Bentrok</option>
                                <option value="OVERWRITE">Timpa Transaksi V2 yang Bentrok</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action button */}
        <div className="flex justify-between items-center bg-slate-50 p-4 border border-slate-200/60 rounded-lg">
          <div className="text-xs text-slate-500 font-medium">
            Pastikan seluruh pemetaan tab 1 s/d 5 sudah Anda tinjau sebelum memulai.
          </div>
          <Button
            onClick={handleStartImport}
            className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-9 px-5 flex items-center gap-1.5 shrink-0"
          >
            <Database className="w-4 h-4" /> Mulai Migrasi
          </Button>
        </div>
      </div>
    </div>
  );
}
