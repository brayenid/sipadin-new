/**
 * Fonnte WhatsApp API Client
 * Mengirim pesan teks, notifikasi, dan respon chat ke nomor/grup WhatsApp.
 */

export interface FonnteSendOptions {
  target: string; // Nomor HP (misal: "08123456789" atau "628123456789") atau Group ID
  message: string;
  countryCode?: string;
  delay?: number; // Delay dalam detik
}

export interface FonnteResponse {
  status: boolean;
  target?: string[];
  message?: string;
  detail?: string;
}

/**
 * Kirim pesan teks WhatsApp via API Fonnte
 */
export async function sendFonnteMessage(options: FonnteSendOptions): Promise<FonnteResponse> {
  const token = process.env.FONNTE_TOKEN?.trim();

  if (!token) {
    console.error("[Fonnte Client] FONNTE_TOKEN belum diatur di environment variable (.env).");
    return {
      status: false,
      message: "FONNTE_TOKEN belum dikonfigurasi pada server.",
    };
  }

  // Normalisasi nomor target: Hapus karakter non-digit jika bukan group ID
  let normalizedTarget = options.target.trim();
  if (!normalizedTarget.includes("@g.us")) {
    normalizedTarget = normalizedTarget.replace(/\D/g, "");
    if (normalizedTarget.startsWith("0")) {
      normalizedTarget = "62" + normalizedTarget.slice(1);
    }
  }

  try {
    const formData = new URLSearchParams();
    formData.append("target", normalizedTarget);
    formData.append("message", options.message);
    if (options.countryCode) {
      formData.append("countryCode", options.countryCode);
    }
    if (options.delay) {
      formData.append("delay", String(options.delay));
    }

    const response = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: {
        Authorization: token,
      },
      body: formData,
    });

    const data = await response.json();

    if (!response.ok || data.status === false) {
      console.error("[Fonnte Client] Gagal mengirim pesan:", data);
      return {
        status: false,
        message: data.reason || data.detail || "Gagal mengirim pesan via Fonnte.",
      };
    }

    return {
      status: true,
      target: data.target,
      message: "Pesan berhasil dikirim.",
    };
  } catch (error: any) {
    console.error("[Fonnte Client] Network error saat memanggil API Fonnte:", error);
    return {
      status: false,
      message: error?.message || "Terjadi kesalahan jaringan saat menghubungi Fonnte.",
    };
  }
}
