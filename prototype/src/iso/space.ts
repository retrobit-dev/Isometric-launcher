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

// ---------------------------------------------------------------------------
// RESOLUSI INTERNAL DINAIKKAN (permintaan user 2026-10-29: objek harus bisa
// diedit/dianimasikan TETAPI sedekat mungkin dengan referensi).
//
// Dulu: kanvas 640x400 untuk 2560x1600 (x4). Gambar referensi 1135x711, jadi
// 1 px referensi hanya 0,56 px kanvas -> detail referensi hilang ~44% dan
// mustahil dibuat identik.
//
// Sekarang: kanvas 1136x710 (= 640x400 x 1,775). Skala dunia TIDAK berubah
// (1 tile tetap 1 tile), yang berubah hanya kerapatan piksel: satu tile kini
// 56,8 px internal, bukan 32 px. Jadi semua koordinat objek lama tetap sah,
// tetapi detail sekecil ~0,02 tile (= 1 px) kini bisa digambar.
// ---------------------------------------------------------------------------
// RONDE 40 — "rasa retronya masih kurang berasa, masih terasa modern": ukuran
// piksel diperbesar. Kanvas internal dibagi PIKSEL, lalu CSS memperbesarnya
// kembali dengan `image-rendering: pixelated`, jadi di tablet satu piksel
// internal = 4,5 px layar (dulu 2,25). Ini knob paling kuat untuk rasa retro;
// set PIKSEL = 1 kalau ingin kembali ke versi halus 1136x710.
export const PIKSEL = 2
export const DENS = 1.775 / PIKSEL  // pengali kerapatan piksel (0,8875)
export const IW = Math.round(640 * DENS)   // 568
export const IH = Math.round(400 * DENS)   // 355
export const SCALE = 2560 / IW             // 4,5 (dulu 2,25)

export const TILE_W = 32 * DENS    // 56,8 px internal (lebar ubin)
export const TILE_H = 16 * DENS    // 28,4
export const Z_PX = 16 * DENS      // 28,4

// ---------------------------------------------------------------------------
// PROYEKSI — RONDE 43 (2026-10-29)
// ---------------------------------------------------------------------------
// Permintaan user: "saya mau yang seperti ini" (tangkapan layar interior
// Pokémon NDS/Gen 5) dan "saya ijinkan untuk mengubah semuanya".
//
// Di referensi, lantai adalah KISI PERSEGI menghadap layar (garis nat
// mendatar & tegak, TIDAK ada diagonal), dinding belakang satu bidang tegak,
// dan perabot menghadap depan dengan atap terlihat sedikit. Itu bukan
// isometrik belah ketupat 2:1.
//
// `PROYEKSI_DATAR = true` -> proyeksi sumbu-sejajar ("datar"):
//     x = (w - CW) * 2HW
//     y = (e - CE) * 2HH - z * ZH      dengan 2HH = 0,72 * 2HW
// Sumbu e = KEDALAMAN (0 = dinding belakang, makin besar makin dekat ke
// pemain), sumbu w = MENDATAR. Sistem koordinat dunia TIDAK berubah, jadi
// semua posisi objek di scene lama tetap sah dan hanya berubah cara
// memproyeksikannya.
//
// Set false untuk kembali ke isometrik 2:1 lama (kode jalur lama tetap ada).
export const PROYEKSI_DATAR = true
/** kedalaman satu ubin relatif terhadap lebarnya (1 = persegi di layar) */
export const RASIO_DATAR = 0.72

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
// ZOOM x1 di pusat (0, 0) — permintaan user 2026-10-28: "buat kamera X1 (0,0)".
// HW 16, HH 8, ZH 16 -> puncak belakang ruangan (e=0,w=0) tepat di titik
// tengah kanvas (320, 200).
export const VIEW_FIXED: ViewState = { q: 1, e: 0, w: 0 }
export const DEFAULT_Q: number = VIEW_FIXED.q
export const DEFAULT_CENTER: { e: number; w: number } = { e: VIEW_FIXED.e, w: VIEW_FIXED.w }

export const Q_MIN = 0.5
export const Q_MAX = 6

// --- kamera: SELALU mulai dari acuan x1 (0,0) -----------------------------
// Kamera TIDAK lagi dipulihkan dari localStorage (permintaan user 2026-10-28:
// "buat kamera default x1 (0,0)"). Setiap kali halaman dibuka / reload /
// hot-reload, kamera mulai persis di VIEW_FIXED. Pan & pinch tetap bebas
// selama sesi berjalan, dan nilai lama yang tersimpan di browser dibersihkan.
const LEGACY_CAM_KEYS = ['isola-kamera-v2', 'isola-kamera-v3', 'isola-kamera-v4', 'isola-kamera-v5']

function clearLegacyCam() {
  try {
    for (const k of LEGACY_CAM_KEYS) localStorage.removeItem(k)
  } catch {
    /* abaikan */
  }
}
clearLegacyCam()

const initialView: ViewState = VIEW_FIXED

export const CAM = { Q: initialView.q, CE: initialView.e, CW: initialView.w }

// HW = setengah lebar satu tile di zoom x1 (dulu 16 px, kini 28,4 px)
export const HW_BASE = 16 * DENS
export let HW = HW_BASE
export let HH = HW_BASE / 2
export let ZH = HW_BASE

function applyZoom(q: number) {
  CAM.Q = Math.min(Q_MAX, Math.max(Q_MIN, q))
  HW = HW_BASE * CAM.Q
  HH = PROYEKSI_DATAR ? HW * RASIO_DATAR : HW / 2
  ZH = HW
}

export function setZoom(q: number) {
  applyZoom(q)
}

// Level zoom saat ini (untuk tampilan tombol/chip)
export function zoomValue(): number {
  return Math.round((HW / HW_BASE) * 100) / 100
}

// Pan kamera TIDAK dibatasi: ruangan boleh digeser ke mana pun di kanvas
// (permintaan user: jangan batasi perpindahan ruangan)
export function setCenter(e: number, w: number) {
  CAM.CE = e
  CAM.CW = w
}

/** Kembalikan kamera ke komposisi acuan. */
export function resetView() {
  applyZoom(VIEW_FIXED.q)
  CAM.CE = VIEW_FIXED.e
  CAM.CW = VIEW_FIXED.w
}

export interface KotakObjek {
  pos: { e: number; w: number; z: number }
  size: { e: number; w: number; z: number }
}

/**
 * KOMPOSISI DIORAMA — permintaan user 2026-10-29 ("tema seperti gambar
 * referensi"): diorama harus terlihat UTUH dalam bingkai, dengan tepi papan
 * (deck) dan balok atas dinding kelihatan, seperti ketiga gambar referensi.
 *
 * Diambil dari isi scene (bukan angka mati): zoom + titik tengah dihitung
 * dari kotak pembungkus semua objek. Dipakai saat membuka aplikasi dan oleh
 * tombol REFRESH/TENGAH, jadi hasilnya selalu sama (deterministik).
 */
export function fitToScene(objs: KotakObjek[], margin = 0.95) {
  if (!objs.length) {
    resetView()
    return
  }
  let e0 = Infinity, e1 = -Infinity, w0 = Infinity, w1 = -Infinity, zmax = 0
  for (const o of objs) {
    e0 = Math.min(e0, o.pos.e)
    e1 = Math.max(e1, o.pos.e + o.size.e)
    w0 = Math.min(w0, o.pos.w)
    w1 = Math.max(w1, o.pos.w + o.size.w)
    zmax = Math.max(zmax, o.pos.z + o.size.z)
  }
  const ce0 = (e0 + e1) / 2
  const cw0 = (w0 + w1) / 2
  const zc = zmax / 2
  const { c, s } = kosYaw()

  // Ukur sebaran di layar pada zoom x1 dengan kamera tepat di pusat bbox.
  applyZoom(1)
  CAM.CE = ce0
  CAM.CW = cw0
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity
  for (const ex of [e0, e1]) {
    for (const wx of [w0, w1]) {
      for (const zz of [0, zmax]) {
        const p = px(ex, wx, zz)
        xmin = Math.min(xmin, p.x); xmax = Math.max(xmax, p.x)
        ymin = Math.min(ymin, p.y); ymax = Math.max(ymax, p.y)
      }
    }
  }
  const wLebar = Math.max(0.001, xmax - xmin)
  const wTinggi = Math.max(0.001, ymax - ymin)
  applyZoom(Math.min((IW * margin) / wLebar, (IH * margin) / wTinggi))

  // Geser supaya titik tengah bbox proyeksi jatuh di tengah kanvas.
  // Proyeksi linear terhadap (e,w), jadi satu koreksi sudah pasti pas.
  const p = px(ce0, cw0, zc)
  const dx = p.x - OX
  const dy = p.y - CY
  const rw = PROYEKSI_DATAR ? dx / (HW * 2) : (dy / HH - dx / HW) / 2
  const re = PROYEKSI_DATAR ? dy / (HH * 2) : (dy / HH + dx / HW) / 2
  CAM.CE = ce0 + (re * c + rw * s)
  CAM.CW = cw0 + (-re * s + rw * c)
}

/** Dinding mana yang harus disembunyikan (muka dalamnya membelakangi kamera) */
export function dindingTersembunyi(): { kiri: boolean; kanan: boolean } {
  const kam = arahKamera()
  return { kiri: kam.e <= 0.001, kanan: kam.w <= 0.001 }
}


// terapkan zoom awal (HW/HH/ZH) sesuai posisi awal
applyZoom(CAM.Q)

export const OX = IW / 2
export const CY = IH / 2

export interface P { x: number; y: number }

// ---------------------------------------------------------------------------
// ORBIT KAMERA — kelipatan 15 derajat (permintaan user 2026-10-29).
//
// Kamera boleh mengelilingi diorama. YAW = 0 berarti komposisi isometrik
// klasik (2:1, paling tajam). Setiap kelipatan 15 derajat memutar DUNIA
// terhadap kamera — objek tetap sejajar grid (tidak ikut miring sendiri),
// karena itu bentuk balok/objek tidak perlu diubah, hanya arah pandang.
//
// Catatan jujur: pada 0/90/180/270 hasilnya tetap grid 2:1 yang tajam.
// Di sudut lain ubin tidak lagi 2:1 (nat jadi bertangga) — itu konsekuensi
// wajar dari kamera miring pada pixel-art, dan sengaja dibiarkan apa adanya
// (tanpa anti-alias) supaya tetap pixel-art.
// ---------------------------------------------------------------------------
export const YAW_LANGKAH = 15      // sudut kamera selalu kelipatan 15°
export const YAW_MIN = 0
export const YAW_MAX = 345
export let YAW = 0

/** bulatkan & normalkan sudut ke 0..345 kelipatan 15 */
export function normalYaw(deg: number): number {
  if (!Number.isFinite(deg)) return 0
  const n = Math.round(deg / YAW_LANGKAH) * YAW_LANGKAH
  return ((n % 360) + 360) % 360
}

export function setYaw(deg: number) {
  YAW = normalYaw(deg)
}

/** geser orbit sejumlah langkah 15° (positif = searah jarum jam) */
export function putarKamera(langkah: number) {
  setYaw(YAW + langkah * YAW_LANGKAH)
}


/** sudut kamera sekarang (derajat, kelipatan 15) */
export function yawValue(): number {
  return YAW
}

/** true bila tampilan masih grid 2:1 murni (0/90/180/270) */
export function yawBersih(): boolean {
  const sisa = YAW % 90
  return sisa < 0.0005 || sisa > 89.9995
}

function kosYaw() {
  // Proyeksi datar hanya masuk akal pada kelipatan 90°: sudut lain membuat
  // nat lantai jadi bertangga. Jadi di mode datar sudutnya DIBULATKAN ke
  // 90° terdekat (orbit tetap berfungsi, dalam 4 arah).
  const deg = PROYEKSI_DATAR ? Math.round(YAW / 90) * 90 : YAW
  const a = (deg * Math.PI) / 180
  return { c: Math.cos(a), s: Math.sin(a) }
}

/**
 * Vektor arah KAMERA di ruang dunia (tidak dinormalisasi).
 * Dipakai untuk memilih wajah objek yang terlihat & sisi dinding yang tampak.
 * YAW = 0 -> (1, 1, 1): sisi +e dan +w dan atas, sama seperti renderer lama.
 */
export function arahKamera(): { e: number; w: number; z: number } {
  const { c, s } = kosYaw()
  if (PROYEKSI_DATAR) {
    // Kamera tepat di depan (+e) dan sedikit di atas. Komponen w = 0 supaya
    // sisi samping balok TIDAK digambar (di proyeksi datar lebarnya nol).
    return { e: Math.round(c), w: Math.round(s), z: 1 }
  }
  return { e: c + s, w: c - s, z: 1 }
}

/** putar koordinat relatif-kamera (dipakai px & fitToScene) */
export function putarRelatif(de: number, dw: number): { e: number; w: number } {
  const { c, s } = kosYaw()
  return { e: de * c - dw * s, w: de * s + dw * c }
}

// Proyeksi grid (e, w, z) -> piksel internal, relatif terhadap tengah kamera
export function px(e: number, w: number, z = 0): P {
  const r = putarRelatif(e - CAM.CE, w - CAM.CW)
  if (PROYEKSI_DATAR) {
    return {
      x: OX + r.w * HW * 2,
      y: CY + r.e * HH * 2 - z * ZH,
    }
  }
  return {
    x: OX + (r.e - r.w) * HW,
    y: CY + (r.e + r.w) * HH - z * ZH,
  }
}

// Invers: piksel internal -> koordinat grid lantai (z=0)
export function unpx(sx: number, sy: number): { e: number; w: number } {
  const dx = (sx - OX) / HW
  const dy = (sy - CY) / HH
  const re = PROYEKSI_DATAR ? dy / 2 : (dy + dx) / 2
  const rw = PROYEKSI_DATAR ? dx / 2 : (dy - dx) / 2
  const { c, s } = kosYaw()
  // rotasi balik (invers): pakai sudut negatif
  return { e: CAM.CE + (re * c + rw * s), w: CAM.CW + (-re * s + rw * c) }
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
