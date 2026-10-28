import { ROOM_FIXED } from '../scene/types'

// Konvensi ruang: lihat docs/01-KONVENSI-RUANG.md
// Resolusi internal 640x400; final = x4 = 2560x1600 (MatePad Mini landscape)
//
// ATURAN RUANGAN DIHAPUS (permintaan user 2026-10-28: "hapus semua aturan
// ruangan, nanti saya beri referensi baru"). Tidak ada lagi kunci dimensi,
// kunci zoom, kunci posisi, atau perpanjangan visual paksa. Semua nilai di
// bawah hanya NILAI AWAL yang bebas diubah; user akan memberi referensi baru.
//
// KAMERA: posisi tengah (CE, CW) + zoom Q. Posisi kamera disimpan otomatis
// (isola-kamera-v1) sehingga pan/zoom tidak hilang saat reload / hot-reload.

export const SCALE = 4
export const IW = 640
export const IH = 400

export const TILE_W = 32
export const TILE_H = 16
export const Z_PX = 16

// Dimensi ruangan = satu sumber kebenaran ROOM_FIXED (bebas diubah).
export const ROOM = {
  E: ROOM_FIXED.e,
  W: ROOM_FIXED.w,
  WALL_Z: ROOM_FIXED.wallZ,
}

// Perpanjangan visual dinding & lantai di luar batas ruangan.
// 0 = dinding & lantai digambar tepat sebatas ruangan (tanpa aturan tambahan).
export const EXT_E = 0
export const EXT_W = 0

// RUANGAN DIHAPUS dari tampilan (permintaan user 2026-10-28: "hapus juga
// ruangan ini"). true = lantai, dinding, plint, slab, dan refleksi tidak
// digambar sama sekali -> kanvas kosong, siap menerima referensi ruangan baru.
// Objek & editor tetap berfungsi normal. Set false untuk memunculkan lagi.
export const ROOM_VISIBLE = false

export interface ViewState {
  q: number
  e: number
  w: number
}

// Komposisi acuan untuk tombol TENGAH / ZOOM reset (bukan kunci).
// Diambil dari komposisi yang terakhir disetujui user: x0.88 di (-1.2, 1.3).
export const VIEW_FIXED: ViewState = { q: 0.88, e: -1.2, w: 1.3 }
export const DEFAULT_Q: number = VIEW_FIXED.q
export const DEFAULT_CENTER: { e: number; w: number } = { e: VIEW_FIXED.e, w: VIEW_FIXED.w }

export const Q_MIN = 0.5
export const Q_MAX = 6

// --- penyimpanan posisi kamera -------------------------------------------
const CAM_KEY = 'isola-kamera-v2'

function readView(): ViewState | null {
  try {
    const raw = localStorage.getItem(CAM_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<ViewState>
    if (typeof v.q !== 'number' || typeof v.e !== 'number' || typeof v.w !== 'number') return null
    return { q: v.q, e: v.e, w: v.w }
  } catch {
    return null
  }
}

function writeView(v: ViewState) {
  try {
    localStorage.setItem(CAM_KEY, JSON.stringify(v))
  } catch {
    /* storage penuh/private — kamera tetap jalan di memori */
  }
}

const initialView: ViewState = readView() ?? VIEW_FIXED

export const CAM = { Q: initialView.q, CE: initialView.e, CW: initialView.w }

export let HW = 32
export let HH = 16
export let ZH = 32

let saveTimer: ReturnType<typeof setTimeout> | null = null
function scheduleSaveCam() {
  if (typeof window === 'undefined') return
  if (saveTimer) return
  saveTimer = setTimeout(() => {
    saveTimer = null
    writeView({ q: CAM.Q, e: CAM.CE, w: CAM.CW })
  }, 250)
}

function applyZoom(q: number) {
  CAM.Q = Math.min(Q_MAX, Math.max(Q_MIN, q))
  HW = Math.min(160, Math.max(8, Math.round(16 * CAM.Q)))
  HH = Math.round(HW / 2)
  ZH = HW
}

export function setZoom(q: number) {
  applyZoom(q)
  scheduleSaveCam()
}

// Level zoom saat ini (untuk tampilan tombol/chip)
export function zoomValue(): number {
  return Math.round((HW / 16) * 100) / 100
}

// Pan kamera TIDAK dibatasi: ruangan boleh digeser ke mana pun di kanvas
// (permintaan user: jangan batasi perpindahan ruangan)
export function setCenter(e: number, w: number) {
  CAM.CE = e
  CAM.CW = w
  scheduleSaveCam()
}

/** Kembalikan kamera ke komposisi acuan. */
export function resetView() {
  applyZoom(VIEW_FIXED.q)
  CAM.CE = VIEW_FIXED.e
  CAM.CW = VIEW_FIXED.w
  scheduleSaveCam()
}

// terapkan zoom awal (HW/HH/ZH) sesuai posisi awal
applyZoom(CAM.Q)

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
