// Konvensi ruang: lihat docs/01-KONVENSI-RUANG.md
// Resolusi internal 640x400; final = x4 = 2560x1600 (MatePad Mini landscape)
//
// KAMERA: posisi tengah (CE, CW) + zoom Q. Pada Q default 1.625 kamera
// full-bleed (ruangan menutup layar). Zoom out = peta seluruh ruangan;
// zoom in = pandangan dekat untuk penempatan presisi.

export const SCALE = 4
export const IW = 640
export const IH = 400

export const TILE_W = 32
export const TILE_H = 16
export const Z_PX = 16

export const ROOM = {
  E: 22,
  W: 22,
  WALL_Z: 6.5,
}

// Level zoom: dipilih agar HW/HH/ZH selalu integer (pixel-art tajam)
export const ZOOM_LEVELS = [0.75, 1, 1.25, 1.625, 2, 2.5]
export const DEFAULT_ZOOM_IDX = 3
export const DEFAULT_CENTER = { e: 8, w: 8 }

export const CAM = { Q: ZOOM_LEVELS[DEFAULT_ZOOM_IDX], CE: DEFAULT_CENTER.e, CW: DEFAULT_CENTER.w }

export let HW = (TILE_W / 2) * CAM.Q
export let HH = (TILE_H / 2) * CAM.Q
export let ZH = Z_PX * CAM.Q

export function setZoom(q: number) {
  CAM.Q = q
  HW = (TILE_W / 2) * q
  HH = (TILE_H / 2) * q
  ZH = Z_PX * q
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

export function setCenter(e: number, w: number) {
  CAM.CE = clamp(e, 3, 19)
  CAM.CW = clamp(w, 3, 19)
}

export function resetView() {
  setZoom(ZOOM_LEVELS[DEFAULT_ZOOM_IDX])
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
