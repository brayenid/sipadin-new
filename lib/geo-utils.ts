/**
 * Utilitas Perhitungan Jarak Geografis (Haversine Formula)
 */

/**
 * Menghitung jarak antara dua pasang koordinat (latitude, longitude) dalam satuan meter.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Radius Bumi dalam meter
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Memformat jarak dalam meter ke string yang mudah dibaca (misal: "45 m" atau "1.4 km").
 */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || isNaN(meters)) {
    return "-";
  }

  if (meters < 1000) {
    return `${meters} m`;
  }

  const km = (meters / 1000).toFixed(1);
  return `${km} km`;
}

/**
 * Memeriksa apakah jarak berada dalam batas radius toleransi
 */
export function isWithinRadius(
  distanceMeters: number | null | undefined,
  radiusMeters: number | null | undefined
): boolean {
  if (
    distanceMeters === null ||
    distanceMeters === undefined ||
    radiusMeters === null ||
    radiusMeters === undefined
  ) {
    return true; // Default true jika tidak ditentukan
  }

  return distanceMeters <= radiusMeters;
}
