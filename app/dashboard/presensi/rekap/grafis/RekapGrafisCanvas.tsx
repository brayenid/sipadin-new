"use client";

import React, { forwardRef } from "react";
import type { GrafisData } from "./buildGrafisData";

export const GRAFIS_WIDTH = 1600;
export const GRAFIS_HEIGHT = 1131; // Rasio presisi 1 Lembar Kertas A4 Landscape (297 : 210)
const M = 24;
const CW = GRAFIS_WIDTH - M * 2; // 1552px

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const C = {
  ink: "#0f172a",
  muted: "#64748b",
  subtle: "#94a3b8",
  line: "#e2e8f0",
  card: "#ffffff",
  bg: "#ffffff",
  brand: "#1e3a8a",
  brandText: "#1e40af",
  hadir: "#16a34a",
  mewakili: "#0284c7",
  izin: "#d97706",
  tidak: "#dc2626",
};

function trunc(s: string, n: number) {
  return s.length > n ? s.slice(0, Math.max(0, n - 1)).trimEnd() + "…" : s;
}

function barColor(p: number) {
  if (p >= 80) return C.hadir;
  if (p >= 60) return C.izin;
  return C.tidak;
}

function heat(p: number | null): { fill: string; text: string } {
  if (p === null) return { fill: "#f8fafc", text: "#94a3b8" };
  if (p >= 90) return { fill: "#15803d", text: "#ffffff" };
  if (p >= 80) return { fill: "#22c55e", text: "#ffffff" };
  if (p >= 60) return { fill: "#bef264", text: "#365314" };
  if (p >= 40) return { fill: "#fde047", text: "#713f12" };
  if (p >= 20) return { fill: "#fb923c", text: "#ffffff" };
  return { fill: "#ef4444", text: "#ffffff" };
}

function CardBox({
  x, y, w, h, title, subtitle,
}: { x: number; y: number; w: number; h: number; title: string; subtitle?: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={C.card} stroke={C.line} />
      <text x={x + 14} y={y + 20} fontSize={12.5} fontWeight={700} fill={C.ink}>{title}</text>
      {subtitle && (
        <text x={x + 14} y={y + 34} fontSize={9.5} fill={C.muted}>{subtitle}</text>
      )}
    </g>
  );
}

export type RekapGrafisCanvasProps = {
  data: GrafisData;
  periodeLabel: string;
  kategoriLabel: string;
  tanggalCetak: string;
};

const RekapGrafisCanvas = forwardRef<SVGSVGElement, RekapGrafisCanvasProps>(function RekapGrafisCanvas(
  { data, periodeLabel, kategoriLabel, tanggalCetak },
  ref
) {
  const { kpi, status, eselon, topPegawai, topOpd, bottomOpd, heatmap, unitKosongList } = data;

  // Grid Vertikal Terpadu 1 Lembar A4 Landscape (1600 x 1131)
  const gap = 10;
  const yKpi = 62;
  const hKpi = 56;

  const yA = yKpi + hKpi + gap; // 128
  const hA = 224;

  const yC = yA + hA + gap; // 362
  const hC = 236;

  const yD = yC + hC + gap; // 608
  const hD = 472;

  const yFooter = yD + hD + 12; // 1092

  // KPI Items
  const kpiItems = [
    { label: "Total Kegiatan", value: String(kpi.totalAgenda), sub: "Agenda terdata" },
    { label: "Jumlah OPD", value: String(kpi.jumlahOpd), sub: "Unit kerja aktif" },
    { label: "Rata-rata Hadir", value: `${kpi.rataRataKehadiran}%`, tone: barColor(kpi.rataRataKehadiran), sub: "Capaian kehadiran" },
    { label: "Hadir Valid Lokasi", value: String(kpi.hadirValid), tone: C.hadir, sub: "Dalam radius" },
    { label: "Hadir Luar Radius", value: String(kpi.hadirLuarRadius), tone: kpi.hadirLuarRadius > 0 ? C.izin : C.ink, sub: "Luar area agenda" },
    { label: "OPD Nihil Hadir", value: String(kpi.unitKosong), tone: kpi.unitKosong > 0 ? C.tidak : C.hadir, sub: "0 partisipasi" },
  ];
  const kpiGap = 10;
  const kpiW = (CW - kpiGap * (kpiItems.length - 1)) / kpiItems.length;

  // Row 2: Tri-Card Layout
  const cGap = 12;
  const wDonut = 430;
  const wEselon = 510;
  const wTopPegawai = CW - wDonut - wEselon - cGap * 2; // 588px

  // Donut metrics (Partisipasi Aktif: Hadir Fisik, Mewakili, Izin)
  const statusItems = [
    { label: "Hadir Fisik", value: status.hadir, color: C.hadir },
    { label: "Mewakili", value: status.mewakili, color: C.mewakili },
    { label: "Izin / Dinas Luar", value: status.izin, color: C.izin },
  ];
  const statusTotal = statusItems.reduce((a, s) => a + s.value, 0);
  const donutR = 46;
  const donutStroke = 17;
  const donutC = 2 * Math.PI * donutR;
  const donutCx = M + 80;
  const donutCy = yA + 118;
  let acc = 0;

  // Eselon Metrics
  const xEselon = M + wDonut + cGap;
  const eBarX = xEselon + 92;
  const eBarMax = 190;
  const eselonPitch = eselon.length <= 2 ? 50 : 33;

  // Top Pegawai Metrics
  const xTopPegawai = xEselon + wEselon + cGap;

  // Row 3: Peringkat OPD & Evaluasi Kepatuhan
  const halfW = (CW - cGap) / 2; // 770px
  const isFewOpds = kpi.jumlahOpd <= 5;

  // Kepatuhan Radius ratio
  const totalPresensiLokasi = (kpi.hadirValid || 0) + (kpi.hadirLuarRadius || 0);
  const validPct = totalPresensiLokasi > 0 ? Math.round((kpi.hadirValid / totalPresensiLokasi) * 100) : 100;
  const luarPct = 100 - validPct;

  // Heatmap metrics
  const hmLabelW = 320;
  const hmMonths = heatmap.bulanLabels.length;
  const hmCellW = hmMonths > 0 ? Math.min(92, (CW - 32 - hmLabelW) / hmMonths) : 0;
  const hmX0 = M + 16 + hmLabelW;
  const hmY0 = yD + 52;
  const hmRows = heatmap.rows.length;
  const hmRowPitch = hmRows <= 4 ? 30 : hmRows <= 10 ? 24 : 19.5;
  const hmCellH = hmRows <= 4 ? 22 : hmRows <= 10 ? 18 : 15.5;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={GRAFIS_WIDTH}
      height={GRAFIS_HEIGHT}
      viewBox={`0 0 ${GRAFIS_WIDTH} ${GRAFIS_HEIGHT}`}
      fontFamily={FONT}
    >
      {/* Background Kertas A4 Putih Bersih */}
      <rect width={GRAFIS_WIDTH} height={GRAFIS_HEIGHT} fill={C.bg} />

      {/* Header Eksekutif 1 Lembar A4 (Print-Friendly, Hemat Tinta) */}
      <g>
        <rect x={M} y={12} width={4.5} height={36} rx={2.25} fill="#2563eb" />
        <text x={M + 12} y={27} fontSize={16} fontWeight={800} fill={C.ink} letterSpacing="0.2px">
          LAPORAN GRAFIS REKAPITULASI KEHADIRAN
        </text>
        <text x={M + 12} y={43} fontSize={10.5} fill={C.muted}>
          {`Periode: ${periodeLabel}   |   Kategori Agenda: ${kategoriLabel}`}
        </text>
        <text x={GRAFIS_WIDTH - M} y={27} fontSize={11.5} fontWeight={700} fill={C.brandText} textAnchor="end">
          SIPADIN • Presensi Digital Daerah
        </text>
        <text x={GRAFIS_WIDTH - M} y={43} fontSize={9.5} fill={C.muted} textAnchor="end">
          {`Dicetak: ${tanggalCetak}   |   Format Dokumen: 1 Lembar A4 Landscape`}
        </text>
        <line x1={M} y1={54} x2={GRAFIS_WIDTH - M} y2={54} stroke={C.line} strokeWidth={1.2} />
      </g>

      {/* Row 1: KPI Summary Cards */}
      {kpiItems.map((k, i) => {
        const x = M + i * (kpiW + kpiGap);
        return (
          <g key={k.label}>
            <rect x={x} y={yKpi} width={kpiW} height={hKpi} rx={7} fill={C.card} stroke={C.line} />
            <text x={x + 12} y={yKpi + 18} fontSize={9.5} fontWeight={700} fill={C.muted}>
              {k.label.toUpperCase()}
            </text>
            <text x={x + 12} y={yKpi + 44} fontSize={22} fontWeight={800} fill={k.tone || C.ink}>
              {k.value}
            </text>
            <text x={x + kpiW - 10} y={yKpi + 44} fontSize={9} fill={C.subtle} textAnchor="end">
              {k.sub}
            </text>
          </g>
        );
      })}

      {/* Row 2 - Kolom 1: Komposisi Partisipasi (Donut Chart) */}
      <CardBox
        x={M} y={yA} w={wDonut} h={hA}
        title="Komposisi Partisipasi"
        subtitle="Rasio Hadir Fisik, Mewakili, & Izin Dinas"
      />
      {statusTotal === 0 ? (
        <text x={M + wDonut / 2} y={yA + 120} fontSize={11.5} fill={C.muted} textAnchor="middle">Belum ada data partisipasi</text>
      ) : (
        <g>
          <circle cx={donutCx} cy={donutCy} r={donutR} fill="none" stroke={C.line} strokeWidth={donutStroke} />
          {statusItems.map((s) => {
            if (s.value <= 0) return null;
            const len = (s.value / statusTotal) * donutC;
            const el = (
              <circle
                key={s.label}
                cx={donutCx}
                cy={donutCy}
                r={donutR}
                fill="none"
                stroke={s.color}
                strokeWidth={donutStroke}
                strokeDasharray={`${len} ${donutC - len}`}
                strokeDashoffset={-acc}
                transform={`rotate(-90 ${donutCx} ${donutCy})`}
              />
            );
            acc += len;
            return el;
          })}
          <text x={donutCx} y={donutCy} fontSize={19} fontWeight={800} fill={C.ink} textAnchor="middle">{statusTotal}</text>
          <text x={donutCx} y={donutCy + 14} fontSize={9.5} fill={C.muted} textAnchor="middle">partisipasi</text>

          {/* Legenda Donut Padat & Rapi */}
          {statusItems.map((s, i) => {
            const ly = yA + 60 + i * 46;
            const lx = M + 172;
            const p = Math.round((s.value / statusTotal) * 100);
            return (
              <g key={s.label}>
                <rect x={lx} y={ly - 9} width={11} height={11} rx={3} fill={s.color} />
                <text x={lx + 18} y={ly + 1} fontSize={11.5} fontWeight={700} fill={C.ink}>{s.label}</text>
                <text x={lx + 18} y={ly + 16} fontSize={10} fill={C.muted}>{`${s.value} catatan (${p}%)`}</text>
              </g>
            );
          })}
        </g>
      )}

      {/* Row 2 - Kolom 2: Kehadiran per Eselon */}
      <CardBox
        x={xEselon} y={yA} w={wEselon} h={hA}
        title="Kehadiran per Eselon"
        subtitle="Persentase kehadiran fisik & perwakilan per jenjang"
      />
      {eselon.length === 0 ? (
        <text x={xEselon + wEselon / 2} y={yA + 120} fontSize={11.5} fill={C.muted} textAnchor="middle">Data eselon belum tersedia</text>
      ) : (
        eselon.map((e, i) => {
          const ry = yA + 52 + i * eselonPitch;
          const bw = (Math.min(100, e.persentase) / 100) * eBarMax;
          return (
            <g key={e.label}>
              <text x={xEselon + 14} y={ry + 11} fontSize={11} fontWeight={600} fill={C.ink}>{e.label}</text>
              <rect x={eBarX} y={ry} width={eBarMax} height={12} rx={3} fill={C.line} />
              <rect x={eBarX} y={ry} width={Math.max(bw, e.persentase > 0 ? 3 : 0)} height={12} rx={3} fill={barColor(e.persentase)} />
              <text x={eBarX + eBarMax + 6} y={ry + 11} fontSize={11} fontWeight={800} fill={C.ink}>{`${e.persentase}%`}</text>
              <text x={xEselon + wEselon - 14} y={ry + 11} fontSize={9.5} fill={C.muted} textAnchor="end">
                {`${e.jumlahPegawai} org • ${e.hadirTotal}/${e.diundangTotal}`}
              </text>
            </g>
          );
        })
      )}

      {/* Row 2 - Kolom 3: Top Pegawai Terdisiplin */}
      <CardBox
        x={xTopPegawai} y={yA} w={wTopPegawai} h={hA}
        title="Top Pegawai Terdisiplin"
        subtitle="Kehadiran tertinggi aparatur (min. 3 undangan agenda)"
      />
      {topPegawai.length === 0 ? (
        <text x={xTopPegawai + wTopPegawai / 2} y={yA + 120} fontSize={11.5} fill={C.muted} textAnchor="middle">Belum ada data kehadiran pegawai</text>
      ) : (
        topPegawai.slice(0, 5).map((p, i) => {
          const ry = yA + 46 + i * 34;
          const bMax = 110;
          const bx = xTopPegawai + wTopPegawai - 14 - 64 - bMax - 30;
          const bw = (Math.min(100, p.persentase) / 100) * bMax;
          const rankColor = i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#d97706" : C.brand;

          return (
            <g key={`${p.nama}-${i}`}>
              <circle cx={xTopPegawai + 20} cy={ry + 11} r={8.5} fill={rankColor} />
              <text x={xTopPegawai + 20} y={ry + 14} fontSize={8.5} fontWeight={800} fill="#ffffff" textAnchor="middle">{i + 1}</text>
              <text x={xTopPegawai + 36} y={ry + 9} fontSize={10.5} fontWeight={700} fill={C.ink}>{trunc(p.nama, 28)}</text>
              <text x={xTopPegawai + 36} y={ry + 21} fontSize={9} fill={C.muted}>{trunc(p.instansi, 32)}</text>
              
              <rect x={bx} y={ry + 3} width={bMax} height={10} rx={2.5} fill={C.line} />
              <rect x={bx} y={ry + 3} width={Math.max(bw, p.persentase > 0 ? 2.5 : 0)} height={10} rx={2.5} fill={barColor(p.persentase)} />
              <text x={bx + bMax + 6} y={ry + 13} fontSize={11} fontWeight={800} fill={C.ink}>{`${p.persentase}%`}</text>
              <text x={xTopPegawai + wTopPegawai - 14} y={ry + 13} fontSize={9} fill={C.muted} textAnchor="end">{`${p.hadir}/${p.diundang}`}</text>
            </g>
          );
        })
      )}

      {/* Row 3: Peringkat OPD & Evaluasi Kepatuhan */}
      {isFewOpds ? (
        // Kasus Data Sedikit (<= 5 OPD): Seimbangkan layout agar TIDAK ada ruang kosong bolong!
        <g>
          {/* Kolom Kiri: Daftar Seluruh OPD Terdata */}
          <CardBox
            x={M} y={yC} w={halfW} h={hC}
            title="Peringkat Kehadiran Perangkat Daerah"
            subtitle="Tingkat kehadiran seluruh perangkat daerah pada periode ini"
          />
          {topOpd.map((r, i) => {
            const ry = yC + 48 + i * 36;
            const bMax = 200;
            const bx = M + halfW - 270;
            const bw = (Math.min(100, r.persentase) / 100) * bMax;
            return (
              <g key={`${r.instansi}-${i}`}>
                <text x={M + 14} y={ry + 12} fontSize={10.5} fontWeight={700} fill={C.subtle}>{i + 1}.</text>
                <text x={M + 32} y={ry + 12} fontSize={11} fontWeight={600} fill={C.ink}>{trunc(r.instansi, 46)}</text>
                <rect x={bx} y={ry + 2} width={bMax} height={11} rx={3} fill={C.line} />
                <rect x={bx} y={ry + 2} width={Math.max(bw, r.persentase > 0 ? 3 : 0)} height={11} rx={3} fill={barColor(r.persentase)} />
                <text x={bx + bMax + 8} y={ry + 12} fontSize={11.5} fontWeight={800} fill={C.ink}>{`${r.persentase}%`}</text>
              </g>
            );
          })}

          {/* Kolom Kanan: Evaluasi & Kepatuhan Lokasi (Mengisi kekosongan secara produktif) */}
          <CardBox
            x={M + halfW + cGap} y={yC} w={halfW} h={hC}
            title="Evaluasi Kepatuhan Lokasi & Unit Nihil"
            subtitle="Analisis radius presensi dan kepatuhan kehadiran daerah"
          />
          <g>
            <text x={M + halfW + cGap + 14} y={yC + 56} fontSize={11} fontWeight={700} fill={C.ink}>Kepatuhan Radius Lokasi Presensi</text>
            <text x={M + CW - 14} y={yC + 56} fontSize={11} fontWeight={800} fill={C.hadir} textAnchor="end">{`${validPct}% Valid`}</text>

            <rect x={M + halfW + cGap + 14} y={yC + 66} width={halfW - 28} height={12} rx={3} fill="#e2e8f0" />
            <rect x={M + halfW + cGap + 14} y={yC + 66} width={((halfW - 28) * validPct) / 100} height={12} rx={3} fill={C.hadir} />
            {luarPct > 0 && (
              <rect
                x={M + halfW + cGap + 14 + ((halfW - 28) * validPct) / 100}
                y={yC + 66}
                width={((halfW - 28) * luarPct) / 100}
                height={12}
                rx={3}
                fill={C.izin}
              />
            )}

            <text x={M + halfW + cGap + 14} y={yC + 94} fontSize={10} fill={C.muted}>
              {`• ${kpi.hadirValid} presensi tercatat tepat dalam radius lokasi (${validPct}%)`}
            </text>
            <text x={M + halfW + cGap + 14} y={yC + 110} fontSize={10} fill={C.muted}>
              {`• ${kpi.hadirLuarRadius} presensi tercatat di luar radius agenda resmi (${luarPct}%)`}
            </text>

            <line x1={M + halfW + cGap + 14} y1={yC + 126} x2={M + CW - 14} y2={yC + 126} stroke="#f1f5f9" strokeWidth={1} />

            <text x={M + halfW + cGap + 14} y={yC + 146} fontSize={11} fontWeight={700} fill={C.ink}>
              {`Status Unit Kerja Nihil Hadir: ${kpi.unitKosong} OPD`}
            </text>
            {unitKosongList.length === 0 ? (
              <text x={M + halfW + cGap + 14} y={yC + 166} fontSize={10.5} fill={C.hadir}>
                ✓ Seluruh perangkat daerah memiliki catatan kehadiran dalam agenda ini.
              </text>
            ) : (
              <text x={M + halfW + cGap + 14} y={yC + 166} fontSize={10.5} fill={C.tidak}>
                {`Perlu Surat Konfirmasi: ${trunc(unitKosongList.join(", "), 75)}`}
              </text>
            )}
            <text x={M + halfW + cGap + 14} y={yC + 186} fontSize={9.5} fill={C.muted}>
              Sesuai ketentuan, unit kerja tanpa kehadiran wajib menyertakan surat izin tertulis pimpinan.
            </text>
          </g>
        </g>
      ) : (
        // Kasus Data Normal / Banyak (> 5 OPD): Tampilkan Top 10 vs 10 Perlu Perhatian
        [
          { x: M, title: "10 Peringkat Teratas Perangkat Daerah (OPD)", subtitle: "Tingkat kehadiran kegiatan dinas tertinggi", rows: topOpd },
          { x: M + halfW + cGap, title: "Perangkat Daerah Perlu Perhatian", subtitle: "Tingkat kehadiran terendah (indikator evaluasi)", rows: bottomOpd },
        ].map((col) => (
          <g key={col.title}>
            <CardBox x={col.x} y={yC} w={halfW} h={hC} title={col.title} subtitle={col.subtitle} />
            {col.rows.length === 0 ? (
              <text x={col.x + halfW / 2} y={yC + 100} fontSize={11.5} fill={C.muted} textAnchor="middle">Tidak ada data</text>
            ) : (
              col.rows.map((r, i) => {
                const ry = yC + 44 + i * 18.5;
                const bMax = 180;
                const bx = col.x + halfW - 240;
                const bw = (Math.min(100, r.persentase) / 100) * bMax;
                return (
                  <g key={`${r.instansi}-${i}`}>
                    <text x={col.x + 14} y={ry + 10} fontSize={9.5} fontWeight={600} fill={C.subtle}>{i + 1}.</text>
                    <text x={col.x + 30} y={ry + 10} fontSize={10.5} fill={C.ink}>{trunc(r.instansi, 46)}</text>
                    <rect x={bx} y={ry + 1} width={bMax} height={9.5} rx={2.5} fill={C.line} />
                    <rect x={bx} y={ry + 1} width={Math.max(bw, r.persentase > 0 ? 2.5 : 0)} height={9.5} rx={2.5} fill={barColor(r.persentase)} />
                    <text x={bx + bMax + 6} y={ry + 10} fontSize={10.5} fontWeight={700} fill={C.ink}>{`${r.persentase}%`}</text>
                  </g>
                );
              })
            )}
          </g>
        ))
      )}

      {/* Row 4: Heatmap OPD x Bulan (Maks. 18 baris untuk 1 Lembar A4) */}
      <CardBox
        x={M} y={yD} w={CW} h={hD}
        title="Peta Kehadiran Perangkat Daerah × Bulan"
        subtitle={
          heatmap.isTruncated
            ? `Persentase per bulan (menampilkan 18 OPD teratas dari ${heatmap.totalOpdCount || heatmap.rows.length} OPD)`
            : "Persentase kehadiran per bulan (diurutkan dari persentase tertinggi)"
        }
      />
      {hmMonths === 0 || heatmap.rows.length === 0 ? (
        <text x={M + CW / 2} y={yD + 120} fontSize={12} fill={C.muted} textAnchor="middle">Belum ada data bulanan perangkat daerah</text>
      ) : (
        <g>
          {heatmap.bulanLabels.map((b, ci) => (
            <text
              key={b}
              x={hmX0 + ci * hmCellW + hmCellW / 2}
              y={hmY0 - 8}
              fontSize={10.5}
              fontWeight={700}
              fill={C.muted}
              textAnchor="middle"
            >
              {b}
            </text>
          ))}
          {heatmap.rows.map((row, ri) => {
            const ry = hmY0 + ri * hmRowPitch;
            return (
              <g key={`${row.instansi}-${ri}`}>
                <text x={M + 14} y={ry + hmCellH * 0.78} fontSize={10.5} fontWeight={500} fill={C.ink}>
                  {trunc(row.instansi, 44)}
                </text>
                {row.cells.map((cell, ci) => {
                  const h = heat(cell);
                  return (
                    <g key={ci}>
                      <rect
                        x={hmX0 + ci * hmCellW + 1}
                        y={ry}
                        width={hmCellW - 2}
                        height={hmCellH}
                        rx={2.5}
                        fill={h.fill}
                      />
                      <text
                        x={hmX0 + ci * hmCellW + hmCellW / 2}
                        y={ry + hmCellH * 0.74}
                        fontSize={9}
                        fontWeight={700}
                        fill={h.text}
                        textAnchor="middle"
                      >
                        {cell === null ? "–" : `${cell}%`}
                      </text>
                    </g>
                  );
                })}
              </g>
            );
          })}

          {/* Legenda Inline Padat di Dasar Seksi Heatmap */}
          {[
            { l: "≥90% Sangat Baik", p: 95 },
            { l: "80–89% Baik", p: 85 },
            { l: "60–79% Cukup", p: 70 },
            { l: "40–59% Kurang", p: 50 },
            { l: "<40% Perlu Pembinaan", p: 30 },
            { l: "– Tanpa Agenda", p: null as number | null },
          ].map((it, i) => {
            const lx = M + 14 + i * 160;
            const ly = yD + hD - 18;
            return (
              <g key={it.l}>
                <rect x={lx} y={ly - 8} width={10} height={10} rx={2.5} fill={heat(it.p).fill} />
                <text x={lx + 15} y={ly} fontSize={9.5} fill={C.muted}>{it.l}</text>
              </g>
            );
          })}
        </g>
      )}

      {/* Footer Kompak 1 Lembar A4 */}
      <g>
        <line x1={M} y1={yFooter} x2={GRAFIS_WIDTH - M} y2={yFooter} stroke={C.line} strokeWidth={1} />
        <text x={M} y={yFooter + 14} fontSize={9.5} fill={C.muted}>
          SIPADIN • Sistem Informasi Presensi Aparatur Dinas. Kehadiran = kehadiran fisik dan perwakilan resmi terhadap undangan dinas.
        </text>
        <text x={GRAFIS_WIDTH - M} y={yFooter + 14} fontSize={10} fontWeight={700} fill={C.brandText} textAnchor="end">
          Format Resmi 1 Lembar Cetak A4 Landscape
        </text>
      </g>
    </svg>
  );
});

export default RekapGrafisCanvas;
