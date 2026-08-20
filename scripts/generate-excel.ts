import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

function generate() {
  const year = 2026;
  const rows: any[] = [];

  for (let month = 0; month < 12; month++) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    let firstMondayDay = 1;
    for (let day = 1; day <= 7; day++) {
      const checkDate = new Date(year, month, day);
      if (checkDate.getDay() === 1) {
        firstMondayDay = day;
        break;
      }
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayOfWeek = new Date(year, month, day).getDay();
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

      const isTanggal17 = day === 17;
      const isHariBatikNasional = month === 9 && day === 2;

      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        let judul = "";
        let deskripsi = "";

        if (isHariBatikNasional) {
          judul = "Hari Batik Nasional";
          deskripsi = "Peringatan Hari Batik Nasional - Wajib mengenakan Pakaian Batik.";
        } else if (dayOfWeek === 1 || dayOfWeek === 2) {
          judul = "PDH Khaki";
          deskripsi = "Pakaian Dinas Harian Khaki. Kemeja lengan pendek bagi ASN pria dimasukkan ke dalam celana.";
        } else if (dayOfWeek === 3) {
          judul = "PDH Kemeja Putih";
          deskripsi = "Pakaian Dinas Harian Kemeja Putih (celana/rok gelap). Kemeja lengan pendek bagi ASN pria dimasukkan ke dalam celana.";
        } else if (dayOfWeek === 4) {
          if (day < firstMondayDay) {
            judul = "PDH Batik / Tenun / Lurik";
            deskripsi = "Pakaian Dinas Harian Batik / Tenun / Lurik.";
          } else {
            const weekIndex = Math.floor((day - firstMondayDay) / 7) + 1;
            if (weekIndex === 1) {
              judul = "Seragam Batik KORPRI";
              deskripsi = "Pakaian Seragam Batik Korps Pegawai Republik Indonesia (digunakan setiap hari Kamis minggu pertama).";
            } else if (weekIndex === 2 || weekIndex === 3) {
              judul = "Wastra Khas Kutai Barat";
              deskripsi = "Pakaian berbahan dasar / kombinasi wastra khas Kutai Barat (Kriookng, Tenun Doyo, Sulam Tumpar, Ulap Sarut, Tenun Badong).";
            } else if (weekIndex === 4) {
              judul = "Batik Motif Khas Kutai Barat";
              deskripsi = "Pakaian Batik motif khas Kabupaten Kutai Barat.";
            } else {
              judul = "PDH Batik / Tenun / Lurik";
              deskripsi = "Pakaian Dinas Harian Batik / Tenun / Lurik.";
            }
          }
        } else if (dayOfWeek === 5) {
          judul = "PDH Batik / Tenun / Lurik";
          deskripsi = "Pakaian Dinas Harian Batik / Tenun / Lurik.";
        }

        if (judul) {
          rows.push({
            "Judul Agenda": judul,
            "Kategori": "PENGINGAT",
            "Tanggal Mulai": dateStr,
            "Tanggal Selesai": "",
            "Waktu Mulai": "07:30",
            "Waktu Selesai": "16:00",
            "Lokasi": "Kantor / Instansi",
            "Deskripsi": deskripsi,
            "PIC": "Seluruh Pegawai ASN",
            "Status": "DIRENCANAKAN",
          });
        }

        if (isTanggal17 && judul !== "Seragam Batik KORPRI") {
          rows.push({
            "Judul Agenda": "Upacara Tanggal 17 - Batik KORPRI",
            "Kategori": "PENGINGAT",
            "Tanggal Mulai": dateStr,
            "Tanggal Selesai": "",
            "Waktu Mulai": "07:30",
            "Waktu Selesai": "09:00",
            "Lokasi": "Halaman Kantor / Lapangan Upacara",
            "Deskripsi": "Pakaian Seragam Batik Korps Pegawai Republik Indonesia (KORPRI) lengkap untuk Upacara Tanggal 17 Setiap Bulan.",
            "PIC": "Seluruh Pegawai ASN",
            "Status": "DIRENCANAKAN",
          });
        }
      }
    }
  }

  const dir = path.join(process.cwd(), "public", "templates");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Jadwal Pakaian Dinas 2026");

  worksheet["!cols"] = [
    { wch: 35 }, // Judul Agenda
    { wch: 16 }, // Kategori
    { wch: 15 }, // Tanggal Mulai
    { wch: 15 }, // Tanggal Selesai
    { wch: 12 }, // Waktu Mulai
    { wch: 12 }, // Waktu Selesai
    { wch: 25 }, // Lokasi
    { wch: 55 }, // Deskripsi
    { wch: 22 }, // PIC
    { wch: 16 }, // Status
  ];

  const filePath = path.join(dir, "Jadwal_Pakaian_Dinas_ASN_2026.xlsx");
  XLSX.writeFile(workbook, filePath);
  console.log(`✅ File Excel berhasil dibuat di: ${filePath} (${rows.length} baris)`);
}

generate();
