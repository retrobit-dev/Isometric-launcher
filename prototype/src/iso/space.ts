import { ROOM_FIXED } from '../scene/types'

// Konvensi ruang: lihat docs/01-KONVENSI-RUANG.md
// Resolusi internal 640x400; final = x4 = 2560x1600 (MatePad Mini landscape)
//
// KAMERA: posisi tengah (CE, CW) + zoom Q.
//
// Semua kunci ruangan & kamera DIBUKA (permintaan user 2026-10-28 "buka kunci").
// Posisi kamera kini DISIMPAN (localStorage) sehingga pan/zoom tidak hilang saat
// halaman di-reload atau saat dev server hot-reload karena perubahan kode.
// Tombol "KUNCI POSISI INI" merekam posisi yang sedang dilihat user menjadi
// komposisi tetap (tanpa perlu screenshot).

export const SCALE = 4
export const IW = 640
export const IH = 400

export const TILE_W = 32
export const TILE_H = 16
export const Z_PX = 16

// Ruangan: satu sumber kebenaran ROOM_FIXED (kunci ruangan sedang dibuka).
export const ROOM = {
  E: ROOM_FIXED.e,
  W: ROOM_FIXED.w,
  WALL_Z: ROOM_FIXED.wallZ,
}

export interface ViewState {
  q: number
  e: number
  w: number
}

// Komposisi acuan (dipakai tombol TENGAH / ZOOM reset) = komposisi referensi:
// puncak belakang lantai (324,182), ubin 80x40 px, dasar dinding memotong tepi
// kiri y≈344 & kanan y≈340.
export const VIEW_FIXED: ViewState = { q: 2.5, e: 0.4, w: 0.5 }

// KUNCI ZOOM + POSISI tingkat kode (permintaan user 2026-10-28: "sekarang kunci
// zoom dan posisinya"). true = kamera BEKU: pan, pinch, roda tetikus, tombol
// ZOOM, dan TENGAH tidak lagi memindahkan ruangan. Yang dibekukan adalah posisi
// yang terakhir tampil (tersimpan di isola-kamera-v1), jadi bukan tebakan.
// Set false untuk membuka lagi; editor objek tetap bisa dipakai walau kamera beku.
export const VIEW_LOCKED = true
export const DEFAULT_Q: number = VIEW_FIXED.q
export const DEFAULT_CENTER: { e: number; w: number } = { e: VIEW_FIXED.e, w: VIEW_FIXED.w }

export const Q_MIN = 0.5
export const Q_MAX = 6

// --- penyimpanan posisi kamera -------------------------------------------
const CAM_KEY = 'isola-kamera-v1'
const LOCK_KEY = 'isola-posisi-terkunci-v1'

function readView(key: string): ViewState | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const v = JSON.parse(raw) as Partial<ViewState>
    if (typeof v.q !== 'number' || typeof v.e !== 'number' || typeof v.w !== 'number') return null
    return { q: v.q, e: v.e, w: v.w }
  } catch {
    return null
  }
}
function writeView(key: string, v: ViewState) {
  try {
    localStorage.setItem(key, JSON.stringify(v))
  } catch {
    /* storage penuh/private — kamera tetap jalan di memori */
  }
}

/** Posisi yang dikunci user lewat tombol "KUNCI POSISI INI" (null = bebas). */
export function lockedView(): ViewState | null {
  return readView(LOCK_KEY)
}

// Saat kunci kode aktif dan belum ada posisi terkunci: bekukan posisi terakhir
// yang tampil (isola-kamera-v1). Kalau belum pernah pan/zoom -> VIEW_FIXED.
if (VIEW_LOCKED && !lockedView()) {
  writeView(LOCK_KEY, readView(CAM_KEY) ?? VIEW_FIXED)
}

// posisi awal: posisi terkunci > posisi terakhir > komposisi acuan
const initialView: ViewState = lockedView() ?? readView(CAM_KEY) ?? VIEW_FIXED

// kamera beku kalau dikunci di kode atau user mengunci posisi lewat tombol
let frozen = VIEW_LOCKED || lockedView() !== null

/** Apakah kamera sedang beku (pan/zoom tidak berpengaruh)? */
export function viewFrozen(): boolean {
  return frozen
}

/** Rekam posisi kamera saat ini sebagai komposisi tetap. */
export function lockCurrentView(): ViewState {
  const v = { q: CAM.Q, e: CAM.CE, w: CAM.CW }
  writeView(LOCK_KEY, v)
  writeView(CAM_KEY, v)
  frozen = true
  return v
}

/** Hapus posisi terkunci (kamera kembali bebas) — diabaikan bila dikunci di kode. */
export function unlockView() {
  if (VIEW_LOCKED) return
  try {
    localStorage.removeItem(LOCK_KEY)
  } catch {
    /* abaikan */
  }
  frozen = false
}

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
    writeView(CAM_KEY, { q: CAM.Q, e: CAM.CE, w: CAM.CW })
  }, 250)
}

function applyZoom(q: number) {
  CAM.Q = Math.min(Q_MAX, Math.max(Q_MIN, q))
  HW = Math.min(160, Math.max(8, Math.round(16 * CAM.Q)))
  HH = Math.round(HW / 2)
  ZH = HW
}

// beku -> tidak melakukan apa pun (pan/pinch/roda/zoom diabaikan)
export function setZoom(q: number) {
  if (frozen) return
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
  if (frozen) return
  CAM.CE = e
  CAM.CW = w
  scheduleSaveCam()
}

/** Kembalikan kamera ke komposisi acuan (posisi terkunci kalau ada). */
export function resetView() {
  const v = lockedView() ?? VIEW_FIXED
  applyZoom(v.q)
  CAM.CE = v.e
  CAM.CW = v.w
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
