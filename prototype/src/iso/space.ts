// Konvensi ruang: lihat docs/01-KONVENSI-RUANG.md
// Resolusi internal 640x400; final = x4 = 2560x1600 (MatePad Mini landscape)
//
// KAMERA FULL-BLEED: ruangan sengaja lebih besar dari layar.
// Lantai & dinding melewati keempat tepi layar sehingga tidak ada
// ruang void tersisa — layar penuh oleh ruangan.

export const SCALE = 4
export const IW = 640
export const IH = 400

export const TILE_W = 32 // ukuran tile dasar (sebelum zoom kamera)
export const TILE_H = 16 // rasio isometrik 2:1
export const Z_PX = 16   // 1 satuan tinggi z = 16px internal

// Ruangan: lebih besar dari viewport (kamera berada di dalam ruangan).
// Area lantai yang terlihat kira-kira e,w = 1..20; pojok U/T/S/B di luar layar.
export const ROOM = {
  E: 22,        // tile ke arah Timur
  W: 22,        // tile ke arah Barat
  WALL_Z: 6.5,  // tinggi dinding (z)
}

// Zoom kamera. 2*HW & HH dibuat bulat supaya semua langkah piksel integer
// (pixel-art tetap tajam, tanpa jitter antar tile).
export const CAM = { Q: 1.625, OX: IW / 2, OY: 0 }

export const HW = (TILE_W / 2) * CAM.Q // 26 px internal per langkah e/w pada x
export const HH = (TILE_H / 2) * CAM.Q // 13 px internal per langkah e/w pada y
export const ZH = Z_PX * CAM.Q         // px internal per satuan z

// OY supaya full-bleed (margin m px di luar layar):
//  hi: puncak dinding di tepi kiri & kanan layar harus sudah di atas layar
//  lo: titik sudut bawah layar harus masih jatuh di dalam grid lantai
function fitOY(): number {
  const m = 8
  const edge = CAM.OX / HW                    // langkah e/w pada x=0 / x=IW
  const hi = ZH * ROOM.WALL_Z - edge * HH - m // OY maksimum
  const lo = IH - HH * (2 * Math.min(ROOM.E, ROOM.W) - edge) + m // OY minimum
  if (lo > hi) {
    console.warn('[space] konfigurasi ROOM tidak bisa full-bleed, dipakai nilai hi')
    return Math.round(hi)
  }
  return Math.round((lo + hi) / 2)
}
CAM.OY = fitOY()

export interface P { x: number; y: number }

// Proyeksi grid (e, w, z) -> piksel internal
export function px(e: number, w: number, z = 0): P {
  return {
    x: CAM.OX + (e - w) * HW,
    y: CAM.OY + (e + w) * HH - z * ZH,
  }
}

// Invers: piksel internal -> koordinat grid lantai (z=0)
export function unpx(sx: number, sy: number): { e: number; w: number } {
  const dx = (sx - CAM.OX) / HW
  const dy = (sy - CAM.OY) / HH
  return { e: (dy + dx) / 2, w: (dy - dx) / 2 }
}

// Zona kasar untuk instruksi: U / T / S / B / TENGAH
export function zoneName(e: number, w: number): string {
  const fe = e / ROOM.E
  const fw = w / ROOM.W
  if (fe < 1 / 3 && fw < 1 / 3) return 'U'
  if (fe > 2 / 3 && fw < 1 / 3) return 'T'
  if (fe > 2 / 3 && fw > 2 / 3) return 'S'
  if (fe < 1 / 3 && fw > 2 / 3) return 'B'
  return 'TENGAH'
}
