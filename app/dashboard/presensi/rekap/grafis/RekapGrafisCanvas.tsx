"use client";

import React, { forwardRef } from "react";
import type { GrafisData } from "./buildGrafisData";

export const GRAFIS_WIDTH = 1600;
export const GRAFIS_HEIGHT = 1131; // Rasio presisi kertas A4 Landscape (297 : 210)
const M = 28;
const CW = GRAFIS_WIDTH - M * 2; // 1544px lebar konten

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

const C = {
  ink: "#0f172a",
  muted: "#64748b",
  subtle: "#94a3b8",
  line: "#e2e8f0",
  card: "#ffffff",
  bg: "#ffffff", // Pure white untuk hasil cetak A4 hemat tinta
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
      <text x={x + 16} y={y + 22} fontSize={13} fontWeight={700} fill={C.ink}>{title}</text>
      {subtitle && (
        <text x={x + 16} y={y + 36} fontSize={10} fill={C.muted}>{subtitle}</text>
      )}
    </g>
  );
}

type Props = {
  data: GrafisData;
  periodeLabel: string;
  kategoriLabel: string;
  tanggalCetak: string;
};

const RekapGrafisCanvas = forwardRef<SVGSVGElement, Props>(function RekapGrafisCanvas(
  { data, periodeLabel, kategoriLabel, tanggalCetak },
  ref
) {
  const { kpi, status, eselon, topPegawai, topOpd, bottomOpd, heatmap } = data;

  // ---------- Layout Presisi Kertas A4 Landscape (1600 x 1131) ----------
  const gap = 10;
  const yKpi = 72;
  const hKpi = 56;
  const yA = yKpi + hKpi + gap; // 138 (Row 2: Tri-Card)
  const hA = 224;
  const yC = yA + hA + gap; // 372 (Row 3: Peringkat OPD)
  const hC = 254;
  const yD = yC + hC + gap; // 636 (Row 4: Heatmap)
  const hD = 444;
  const yFooter = yD + hD + 8; // 1088
  const H = GRAFIS_HEIGHT; // 1131

  // ---------- KPI ----------
  const kpiItems: { label: string; value: string; tone?: string }[] = [
    { label: "Total Kegiatan", value: String(kpi.totalAgenda) },
    { label: "Jumlah OPD", value: String(kpi.jumlahOpd) },
    { label: "Rata-rata Hadir", value: `${kpi.rataRataKehadiran}%`, tone: barColor(kpi.rataRataKehadiran) },
    { label: "Hadir Valid Lokasi", value: String(kpi.hadirValid), tone: C.hadir },
    { label: "Hadir Luar Radius", value: String(kpi.hadirLuarRadius), tone: kpi.hadirLuarRadius > 0 ? C.izin : C.ink },
    { label: "OPD Tanpa Hadir", value: String(kpi.unitKosong), tone: kpi.unitKosong > 0 ? C.tidak : C.hadir },
  ];
  const kpiGap = 10;
  const kpiW = (CW - kpiGap * (kpiItems.length - 1)) / kpiItems.length;

  // ---------- Row 2: Tri-Card Layout ----------
  const cGap = 12;
  const wDonut = 430;
  const wEselon = 510;
  const wTop5 = CW - wDonut - wEselon - cGap * 2; // 580px

  // Donut metrics
  const statusItems = [
    { label: "Hadir", value: status.hadir, color: C.hadir },
    { label: "Mewakili", value: status.mewakili, color: C.mewakili },
    { label: "Izin", value: status.izin, color: C.izin },
    { label: "Tanpa Ket.", value: status.tidakHadir, color: C.tidak },
  ];
  const statusTotal = statusItems.reduce((a, s) => a + s.value, 0);
  const donutR = 46;
  const donutStroke = 18;
  const donutC = 2 * Math.PI * donutR;
  const donutCx = M + 88;
  const donutCy = yA + 128;
  let acc = 0;

  // Eselon metrics
  const xEselon = M + wDonut + cGap;
  const eBarX = xEselon + 94;
  const eBarMax = 190;

  // Top 5 metrics
  const xTop5 = xEselon + wEselon + cGap;

  // ---------- Row 3: Peringkat OPD ----------
  const halfW = (CW - cGap) / 2; // 766px

  // ---------- Row 4: Heatmap ----------
  const hmLabelW = 310;
  const hmMonths = heatmap.bulanLabels.length;
  const hmCellW = hmMonths > 0 ? Math.min(90, (CW - 32 - hmLabelW) / hmMonths) : 0;
  const hmX0 = M + 16 + hmLabelW;
  const hmY0 = yD + 58;

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={GRAFIS_WIDTH}
      height={H}
      viewBox={`0 0 ${GRAFIS_WIDTH} ${H}`}
      fontFamily={FONT}
    >
      {/* Background Kertas Bersih */}
      <rect width={GRAFIS_WIDTH} height={H} fill={C.bg} />

      {/* Header Kompak & Print-Friendly (Tanpa Blok Biru Tebal) */}
      <g>
        <rect x={M} y={16} width={4} height={38} rx={2} fill="#3b82f6" />
        <text x={M + 14} y={32} fontSize={18} fontWeight={800} fill={C.ink} letterSpacing="0.2px">
          LAPORAN GRAFIS REKAPITULASI KEHADIRAN
        </text>
        <text x={M + 14} y={49} fontSize={11} fill={C.muted}>
          {`Periode: ${periodeLabel}   |   Kategori Agenda: ${kategoriLabel}`}
        </text>
        <text x={GRAFIS_WIDTH - M} y={32} fontSize={12} fontWeight={700} fill={C.brandText} textAnchor="end">
          SIPADIN • Presensi Digital
        </text>
        <text x={GRAFIS_WIDTH - M} y={49} fontSize={10} fill={C.muted} textAnchor="end">
          {`Dicetak: ${tanggalCetak}`}
        </text>
        <line x1={M} y1={62} x2={GRAFIS_WIDTH - M} y2={62} stroke={C.line} strokeWidth={1.2} />
      </g>

      {/* Row 1: KPI Cards Kompak */}
      {kpiItems.map((k, i) => {
        const x = M + i * (kpiW + kpiGap);
        return (
          <g key={k.label}>
            <rect x={x} y={yKpi} width={kpiW} height={hKpi} rx={8} fill={C.card} stroke={C.line} />
            <text x={x + 14} y={yKpi + 20} fontSize={10} fontWeight={700} fill={C.muted}>
              {k.label.toUpperCase()}
            </text>
            <text x={x + 14} y={yKpi + 46} fontSize={23} fontWeight={800} fill={k.tone || C.ink}>
              {k.value}
            </text>
          </g>
        );
      })}

      {/* Row 2 - Kolom 1: Donut Status */}
      <CardBox x={M} y={yA} w={wDonut} h={hA} title="Komposisi Status" subtitle="Proporsi catatan kehadiran" />
      {statusTotal === 0 ? (
        <text x={M + wDonut / 2} y={yA + 124} fontSize={12} fill={C.muted} textAnchor="middle">Belum ada data</text>
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
          <text x={donutCx} y={donutCy} fontSize={18} fontWeight={800} fill={C.ink} textAnchor="middle">{statusTotal}</text>
          <text x={donutCx} y={donutCy + 14} fontSize={9} fill={C.muted} textAnchor="middle">catatan</text>

          {/* Legenda Donut Kompak */}
          {statusItems.map((s, i) => {
            const ly = yA + 52 + i * 38;
            const lx = M + 175;
            const p = Math.round((s.value / statusTotal) * 100);
            return (
              <g key={s.label}>
                <rect x={lx} y={ly - 9} width={10} height={10} rx={2.5} fill={s.color} />
                <text x={lx + 16} y={ly} fontSize={12} fontWeight={700} fill={C.ink}>{s.label}</text>
                <text x={lx + 16} y={ly + 14} fontSize={10} fill={C.muted}>{`${s.value} (${p}%)`}</text>
              </g>
            );
          })}
        </g>
      )}

      {/* Row 2 - Kolom 2: Kehadiran per Eselon */}
      <CardBox x={xEselon} y={yA} w={wEselon} h={hA} title="Kehadiran per Eselon" subtitle="Persentase kehadiran fisik & perwakilan" />
      {eselon.length === 0 ? (
        <text x={xEselon + wEselon / 2} y={yA + 124} fontSize={12} fill={C.muted} textAnchor="middle">Data eselon belum tersedia</text>
      ) : (
        eselon.map((e, i) => {
          const ry = yA + 50 + i * 33;
          const bw = (Math.min(100, e.persentase) / 100) * eBarMax;
          return (
            <g key={e.label}>
              <text x={xEselon + 16} y={ry + 13} fontSize={11} fontWeight={600} fill={C.ink}>{e.label}</text>
              <rect x={eBarX} y={ry + 1} width={eBarMax} height={13} rx={3} fill={C.line} />
              <rect x={eBarX} y={ry + 1} width={Math.max(bw, e.persentase > 0 ? 3 : 0)} height={13} rx={3} fill={barColor(e.persentase)} />
              <text x={eBarX + eBarMax + 6} y={ry + 13} fontSize={11} fontWeight={800} fill={C.ink}>{`${e.persentase}%`}</text>
              <text x={xEselon + wEselon - 14} y={ry + 13} fontSize={10} fill={C.muted} textAnchor="end">
                {`${e.jumlahPegawai} org • ${e.hadirTotal}/${e.diundangTotal}`}
              </text>
            </g>
          );
        })
      )}

      {/* Row 2 - Kolom 3: Top 5 Pegawai Terajin */}
      <CardBox
        x={xTop5} y={yA} w={wTop5} h={hA}
        title="Top 5 Pegawai Terajin"
        subtitle="Kehadiran tertinggi (min. 3 undangan)"
      />
      {topPegawai.length === 0 ? (
        <text x={xTop5 + wTop5 / 2} y={yA + 124} fontSize={12} fill={C.muted} textAnchor="middle">Belum ada data pegawai</text>
      ) : (
        topPegawai.map((p, i) => {
          const ry = yA + 48 + i * 34;
          const bMax = 100;
          const bx = xTop5 + wTop5 - 14 - 64 - bMax - 32;
          const bw = (Math.min(100, p.persentase) / 100) * bMax;
          const rankColor = i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#d97706" : C.brand;

          return (
            <g key={`${p.nama}-${i}`}>
              <circle cx={xTop5 + 24} cy={ry + 13} r={9} fill={rankColor} />
              <text x={xTop5 + 24} y={ry + 16} fontSize={9} fontWeight={800} fill="#ffffff" textAnchor="middle">{i + 1}</text>
              <text x={xTop5 + 40} y={ry + 11} fontSize={11} fontWeight={700} fill={C.ink}>{trunc(p.nama, 30)}</text>
              <text x={xTop5 + 40} y={ry + 23} fontSize={9.5} fill={C.muted}>{trunc(p.instansi, 34)}</text>
              
              <rect x={bx} y={ry + 5} width={bMax} height={11} rx={2.5} fill={C.line} />
              <rect x={bx} y={ry + 5} width={Math.max(bw, p.persentase > 0 ? 2.5 : 0)} height={11} rx={2.5} fill={barColor(p.persentase)} />
              <text x={bx + bMax + 6} y={ry + 15} fontSize={11} fontWeight={800} fill={C.ink}>{`${p.persentase}%`}</text>
              <text x={xTop5 + wTop5 - 14} y={ry + 15} fontSize={9.5} fill={C.muted} textAnchor="end">{`${p.hadir}/${p.diundang}`}</text>
            </g>
          );
        })
      )}

      {/* Row 3: Peringkat OPD Kompak */}
      {[
        { x: M, title: "Peringkat Teratas OPD", subtitle: "Tingkat kehadiran tertinggi", rows: topOpd },
        { x: M + halfW + cGap, title: "Perlu Perhatian (Terendah)", subtitle: "Tingkat kehadiran terendah", rows: bottomOpd },
      ].map((col) => (
        <g key={col.title}>
          <CardBox x={col.x} y={yC} w={halfW} h={hC} title={col.title} subtitle={col.subtitle} />
          {col.rows.length === 0 ? (
            <text x={col.x + halfW / 2} y={yC + 90} fontSize={12} fill={C.muted} textAnchor="middle">Tidak ada data</text>
          ) : (
            col.rows.map((r, i) => {
              const ry = yC + 44 + i * 20;
              const bMax = 180;
              const bx = col.x + halfW - 240;
              const bw = (Math.min(100, r.persentase) / 100) * bMax;
              return (
                <g key={`${r.instansi}-${i}`}>
                  <text x={col.x + 14} y={ry + 11} fontSize={10} fontWeight={600} fill={C.subtle}>{i + 1}.</text>
                  <text x={col.x + 32} y={ry + 11} fontSize={11} fill={C.ink}>{trunc(r.instansi, 46)}</text>
                  <rect x={bx} y={ry + 1} width={bMax} height={10} rx={2.5} fill={C.line} />
                  <rect x={bx} y={ry + 1} width={Math.max(bw, r.persentase > 0 ? 2.5 : 0)} height={10} rx={2.5} fill={barColor(r.persentase)} />
                  <text x={bx + bMax + 6} y={ry + 11} fontSize={11} fontWeight={700} fill={C.ink}>{`${r.persentase}%`}</text>
                </g>
              );
            })
          )}
        </g>
      ))}

      {/* Row 4: Heatmap OPD x Bulan Kompak (Maks. 18 baris untuk A4 Landscape) */}
      <CardBox
        x={M} y={yD} w={CW} h={hD}
        title="Peta Kehadiran OPD × Bulan"
        subtitle={
          heatmap.isTruncated
            ? `Persentase per bulan (menampilkan 18 OPD teratas dari ${heatmap.totalOpdCount || heatmap.rows.length} OPD)`
            : "Persentase kehadiran per bulan (diurutkan dari OPD tertinggi)"
        }
      />
      {hmMonths === 0 || heatmap.rows.length === 0 ? (
        <text x={M + CW / 2} y={yD + 80} fontSize={12} fill={C.muted} textAnchor="middle">Belum ada data bulanan</text>
      ) : (
        <g>
          {heatmap.bulanLabels.map((b, ci) => (
            <text
              key={b}
              x={hmX0 + ci * hmCellW + hmCellW / 2}
              y={hmY0 - 6}
              fontSize={10}
              fontWeight={700}
              fill={C.muted}
              textAnchor="middle"
            >
              {b}
            </text>
          ))}
          {heatmap.rows.map((row, ri) => {
            const ry = hmY0 + ri * 18;
            return (
              <g key={`${row.instansi}-${ri}`}>
                <text x={M + 14} y={ry + 12} fontSize={10.5} fill={C.ink}>{trunc(row.instansi, 44)}</text>
                {row.cells.map((cell, ci) => {
                  const h = heat(cell);
                  return (
                    <g key={ci}>
                      <rect
                        x={hmX0 + ci * hmCellW + 1}
                        y={ry}
                        width={hmCellW - 2}
                        height={15}
                        rx={2.5}
                        fill={h.fill}
                      />
                      <text
                        x={hmX0 + ci * hmCellW + hmCellW / 2}
                        y={ry + 11}
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
          {/* Legenda Inline Padat */}
          {[
            { l: "≥90%", p: 95 },
            { l: "80–89%", p: 85 },
            { l: "60–79%", p: 70 },
            { l: "40–59%", p: 50 },
            { l: "20–39%", p: 30 },
            { l: "<20%", p: 10 },
            { l: "Tanpa agenda", p: null as number | null },
          ].map((it, i) => {
            const lx = M + 14 + i * 130;
            const ly = hmY0 + heatmap.rows.length * 18 + 18;
            return (
              <g key={it.l}>
                <rect x={lx} y={ly - 8} width={10} height={10} rx={2.5} fill={heat(it.p).fill} />
                <text x={lx + 15} y={ly} fontSize={10} fill={C.muted}>{it.l}</text>
              </g>
            );
          })}
        </g>
      )}

      {/* Footer Kompak */}
      <text x={M} y={yFooter + 12} fontSize={10} fill={C.muted}>
        Sumber: data presensi SIPADIN. Kehadiran = hadir fisik + perwakilan terhadap undangan kegiatan resmi. Didesain untuk format cetak A4 Landscape.
      </text>
    </svg>
  );
});

export default RekapGrafisCanvas;
