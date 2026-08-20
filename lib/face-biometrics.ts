/**
 * Utilitas Kalkulasi & Verifikasi Biometrik Wajah
 */

export function calculateEuclideanDistance(
  desc1: number[] | Float32Array,
  desc2: number[] | Float32Array
): number {
  if (desc1.length !== desc2.length) {
    throw new Error("Face descriptor dimensions do not match");
  }

  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Menghitung persentase kemiripan (0% - 100%) dari Euclidean Distance.
 * Jarak 0.0 -> 100% mirip
 * Jarak 0.4 -> ~85% mirip
 * Jarak 0.55 -> ~70% mirip (Batas Ambang Match)
 * Jarak 0.8+ -> <50% mirip
 */
export function calculateFaceSimilarity(distance: number): number {
  if (distance <= 0) return 100;
  if (distance >= 1.0) return 0;
  const score = Math.max(0, Math.min(100, Math.round((1 - distance / 1.0) * 100)));
  return score;
}

export const BIOMETRIC_MATCH_THRESHOLD = 0.55; // Euclidean distance <= 0.55 dianggap MATCH (>= 70% similarity)
