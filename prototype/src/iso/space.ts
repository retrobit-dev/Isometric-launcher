// Konvensi ruang: lihat docs/01-KONVENSI-RUANG.md
// Resolusi internal 640x400; final = x4 = 2560x1600 (MatePad Mini landscape)

export const SCALE = 4
export const IW = 640
export const IH = 400

export const TILE_W = 32 // 1 tile = 32px internal
export const TILE_H = 16 // rasio isometrik 2:1
export const Z_PX = 16   // 1 satuan tinggi z = 16px internal

// Ukuran ruangan (menunggu kesepakatan — ubah di sini saja)
export const ROOM = {
  E: 11,        // jumlah tile ke arah Timur
  W: 8,         // jumlah tile ke arah Barat
  WALL_Z: 5.5,  // tinggi dinding dalam satuan z
}

// Titik asal: pojok U (pertemuan dua dinding)
export const OX = IW / 2
export const OY = 168

export interface P { x: number; y: number }

// Proyeksi grid (e, w, z) -> piksel internal
export function px(e: number, w: number, z = 0): P {
  return {
    x: OX + (e - w) * (TILE_W / 2),
    y: OY + (e + w) * (TILE_H / 2) - z * Z_PX,
  }
}

// Invers: piksel internal -> koordinat grid lantai (z=0)
export function unpx(sx: number, sy: number): { e: number; w: number } {
  const dx = (sx - OX) / (TILE_W / 2)
  const dy = (sy - OY) / (TILE_H / 2)
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
