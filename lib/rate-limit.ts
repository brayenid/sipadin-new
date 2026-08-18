/**
 * In-Memory Sliding Window Rate Limiter
 * Digunakan untuk memproteksi endpoint autentikasi / login dari serangan Brute-Force & Credential Stuffing.
 */

type RateLimitRecord = {
  count: number;
  firstAttempt: number;
  lastAttempt: number;
  lockedUntil: number | null;
};

// Map penyimpanan percobaan login per identifier (username / IP)
const loginAttemptsStore = new Map<string, RateLimitRecord>();

// Default konfigurasi proteksi login
const DEFAULT_MAX_ATTEMPTS = 5; // Maksimal 5 kali gagal
const DEFAULT_WINDOW_MS = 15 * 60 * 1000; // Jendela waktu 15 menit
const DEFAULT_LOCKOUT_MS = 15 * 60 * 1000; // Kunci sementara 15 menit

// Pembersihan otomatis record yang kedaluwarsa setiap 5 menit
if (typeof setInterval !== "undefined") {
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of loginAttemptsStore.entries()) {
      const isExpired =
        (!record.lockedUntil && now - record.lastAttempt > DEFAULT_WINDOW_MS) ||
        (record.lockedUntil && now > record.lockedUntil && now - record.lastAttempt > DEFAULT_WINDOW_MS);

      if (isExpired) {
        loginAttemptsStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Unref interval agar tidak menghalangi proses shutdown Node.js
  if (cleanupInterval && typeof cleanupInterval.unref === "function") {
    cleanupInterval.unref();
  }
}

/**
 * Memeriksa apakah identifier (username/IP) sedang dibatasi / terkunci
 */
export function checkLoginRateLimit(
  identifier: string,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  lockoutMs: number = DEFAULT_LOCKOUT_MS
): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
  message?: string;
} {
  if (!identifier) return { allowed: true, remainingAttempts: maxAttempts, retryAfterSeconds: 0 };

  const key = identifier.toLowerCase().trim();
  const now = Date.now();
  const record = loginAttemptsStore.get(key);

  if (!record) {
    return {
      allowed: true,
      remainingAttempts: maxAttempts,
      retryAfterSeconds: 0,
    };
  }

  // Cek apakah masih dalam masa lockout
  if (record.lockedUntil && record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    const retryMinutes = Math.ceil(retryAfterSeconds / 60);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
      message: `Terlalu banyak percobaan login gagal. Akun dibatasi sementara selama ${retryMinutes} menit demi keamanan.`,
    };
  }

  // Jika masa lockout telah lewat, reset record
  if (record.lockedUntil && record.lockedUntil <= now) {
    loginAttemptsStore.delete(key);
    return {
      allowed: true,
      remainingAttempts: maxAttempts,
      retryAfterSeconds: 0,
    };
  }

  // Cek apakah sudah melebihi batas percobaan gagal
  if (record.count >= maxAttempts) {
    record.lockedUntil = now + lockoutMs;
    const retryAfterSeconds = Math.ceil(lockoutMs / 1000);
    const retryMinutes = Math.ceil(retryAfterSeconds / 60);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
      message: `Batas percobaan login terlampaui. Akun dibatasi sementara selama ${retryMinutes} menit.`,
    };
  }

  return {
    allowed: true,
    remainingAttempts: Math.max(0, maxAttempts - record.count),
    retryAfterSeconds: 0,
  };
}

/**
 * Mencatat kegagalan percobaan login
 */
export function recordLoginFailure(
  identifier: string,
  maxAttempts: number = DEFAULT_MAX_ATTEMPTS,
  windowMs: number = DEFAULT_WINDOW_MS,
  lockoutMs: number = DEFAULT_LOCKOUT_MS
): {
  isLocked: boolean;
  remainingAttempts: number;
  retryAfterSeconds: number;
} {
  if (!identifier) return { isLocked: false, remainingAttempts: maxAttempts, retryAfterSeconds: 0 };

  const key = identifier.toLowerCase().trim();
  const now = Date.now();
  let record = loginAttemptsStore.get(key);

  if (!record || now - record.lastAttempt > windowMs) {
    record = {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
      lockedUntil: null,
    };
    loginAttemptsStore.set(key, record);
    return {
      isLocked: false,
      remainingAttempts: maxAttempts - 1,
      retryAfterSeconds: 0,
    };
  }

  record.count += 1;
  record.lastAttempt = now;

  if (record.count >= maxAttempts) {
    record.lockedUntil = now + lockoutMs;
    return {
      isLocked: true,
      remainingAttempts: 0,
      retryAfterSeconds: Math.ceil(lockoutMs / 1000),
    };
  }

  return {
    isLocked: false,
    remainingAttempts: Math.max(0, maxAttempts - record.count),
    retryAfterSeconds: 0,
  };
}

/**
 * Mereset status percobaan saat login berhasil
 */
export function resetLoginAttempts(identifier: string): void {
  if (!identifier) return;
  const key = identifier.toLowerCase().trim();
  loginAttemptsStore.delete(key);
}

/**
 * Rate Limiter generik untuk API endpoints
 */
export function rateLimit(options: {
  key: string;
  limit?: number;
  windowMs?: number;
}): { success: boolean; remaining: number; reset: number } {
  const { key, limit = 60, windowMs = 60 * 1000 } = options;
  const now = Date.now();
  let record = loginAttemptsStore.get(key);

  if (!record || now - record.firstAttempt > windowMs) {
    record = {
      count: 1,
      firstAttempt: now,
      lastAttempt: now,
      lockedUntil: null,
    };
    loginAttemptsStore.set(key, record);
    return { success: true, remaining: limit - 1, reset: now + windowMs };
  }

  if (record.count >= limit) {
    return { success: false, remaining: 0, reset: record.firstAttempt + windowMs };
  }

  record.count += 1;
  record.lastAttempt = now;
  return { success: true, remaining: limit - record.count, reset: record.firstAttempt + windowMs };
}
