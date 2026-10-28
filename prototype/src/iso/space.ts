// Konvensi ruang: lihat docs/01-KONVENSI-RUANG.md
// Resolusi internal 640x400; final = x4 = 2560x1600 (MatePad Mini landscape)
//
// KAMERA: posisi tengah (CE, CW) + zoom Q. Default mengikuti komposisi
// referensi user: puncak belakang lantai ≈ tengah kanvas, lantai mengisi
// separuh bawah. Zoom out = peta seluruh ruangan; zoom in = pandangan dekat
// untuk penempatan presisi.

export const SCALE = 4
export const IW = 640
export const IH = 400

export const TILE_W = 32
export const TILE_H = 16
export const Z_PX = 16

// Ruangan: skala tile-vs-furnitur dari referensi malam-biru (meja ≈ 3.5 tile).
// Ukuran total = keputusan desain: referensi berupa crop, dan ruangan besar
// memberi densitas slot app yang cukup untuk launcher.
// Dinding sangat tinggi (loft). Ruangan diperpanjang +6 tile ke selatan atas
// permintaan eksplisit user (perubahan terkunci pertama); setelah ini beku lagi.
export const ROOM = {
  E: 20,        // tile ke arah Timur  = 12.0 m
  W: 19,        // tile ke arah Barat  = 11.4 m
  WALL_Z: 12,   // tinggi dinding      = 6.0 m
}

// Zoom kontinu via pinch: berapa pun nilainya, HW/HH/ZH dibulatkan integer
// supaya pixel-art tetap tajam (tidak ada jitter antar tile).
// Default = komposisi referensi user (mockup 1280x800, diskalakan ke 640x400):
// lantai mengisi separuh bawah kanvas, puncak belakang diamond ≈(318,199),
// memotong tepi kiri y≈358 & kanan y≈360, bawah terpotong tepi layar.
export const DEFAULT_Q = 1.05 // HW 17px, HH 9px — tile ≈68x36 pada skala 1280
export const DEFAULT_CENTER = { e: 0.1, w: 0 }
export const Q_MIN = 0.5
export const Q_MAX = 6

export const CAM = { Q: DEFAULT_Q, CE: DEFAULT_CENTER.e, CW: DEFAULT_CENTER.w }

export let HW = 32
export let HH = 16
export let ZH = 32

export function setZoom(q: number) {
  CAM.Q = Math.min(Q_MAX, Math.max(Q_MIN, q))
  HW = Math.min(160, Math.max(8, Math.round(16 * CAM.Q)))
  HH = Math.round(HW / 2)
  ZH = HW
}

// Level zoom saat ini (untuk tampilan tombol/chip)
export function zoomValue(): number {
  return Math.round((HW / 16) * 100) / 100
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

// Pan kamera TIDAK dibatasi: ruangan boleh digeser ke mana pun di kanvas
// (permintaan user: jangan batasi perpindahan ruangan)
export function setCenter(e: number, w: number) {
  CAM.CE = e
  CAM.CW = w
}

export function resetView() {
  setZoom(DEFAULT_Q)
  setCenter(DEFAULT_CENTER.e, DEFAULT_CENTER.w)
}

export const OX = IW / 2
export const CY = IH / 2

export interface P { x: number; y: number }

// Proyeksi grid (e, w, z) -> piksel internal, relatif terhadap tengah kamera
export function px(e: number, w: number, z = 0): P {
  return {
    x: OX + ((e - CAM.CE) - (w - CAM.CW)) * HW,
    y: CY + ((e - CAM.CE) + (w - CAM.CW)) * HH - z * ZH,
  }
}

// Invers: piksel internal -> koordinat grid lantai (z=0)
export function unpx(sx: number, sy: number): { e: number; w: number } {
  const dx = (sx - OX) / HW
  const dy = (sy - CY) / HH
  return { e: CAM.CE + (dy + dx) / 2, w: CAM.CW + (dy - dx) / 2 }
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
