// ===========================================================================
// PALET REFERENSI — 51 warna (ronde 39, 2026-10-29)
// ===========================================================================
// Permintaan user: "Saya rasa masih terlihat terlalu modern, bisa buat seperti
// referensi untuk Style dan warnanya?" + dua gambar referensi diorama
// pixel-art (rumah Tudor beratap bata, tanah mint bertitik, jalan batu krem,
// pohon hijau cerah, air toska).
//
// Jawaban user saat ditanya:
//   • palet   : PALET BARU dari kedua gambar referensi (bukan Endesga 32)
//   • outline : DIPAKAI lagi (aturan ronde 19 "jangan beri outline" dicabut)
//   • latar   : tetap HITAM OLED #000000 (aturan ronde 13 tidak dicabut)
//   • dinding : Tudor — krem + balok kayu
//
// Palet ini diekstrak dari dua gambar itu (kuantisasi median-cut), lalu
// disusun jadi 10 TANGGA NADA yang urut gelap -> terang. Tiap warna masuk tepat
// satu tangga, jadi `gelap()`/`terang()` selalu bergerak dalam satu keluarga
// warna (hue-shifted shading seperti referensi) dan tidak pernah mencampur
// warna (campuran akan menghasilkan warna di luar palet).
//
// Ciri khas referensi yang sekarang dipakai:
//   - latar mint + titik dither (untuk gambar referensi) TIDAK dipakai: layar
//     tetap hitam OLED sesuai pilihan user;
//   - outline 1 px di setiap objek, warnanya versi gelap dari warna isi
//     (`tinta()`), bukan hitam rata;
//   - tiga nada per material + bayangan bertangga dither Bayer 4x4.
// ===========================================================================

/** 51 warna referensi, urut per keluarga. */
export const PALET_RETRO: readonly string[] = [
  // kayu & outline umum
  '#2b1a12', '#391d0b', '#452d1e', '#5f3d28', '#8a5a3a', '#a8764f', '#c99b6a', '#e4b98a',
  // batu / krem / kertas
  '#3d432a', '#574d36', '#8e8a6d', '#c5c7a4', '#dadab8', '#f1e1bb', '#f7f2cd', '#fff9e3',
  // bata / merah
  '#833422', '#a8412b', '#c95b3f', '#ee734c', '#fb836b',
  // oranye / amber (cahaya lampu, matahari)
  '#a05a2a', '#d8894a', '#ef9762', '#f0ce92', '#fdd792',
  // hijau daun
  '#1a3121', '#1c5e40', '#2f8a52', '#4cb45c', '#7ad46f', '#a3ed75',
  // zaitun
  '#566b32', '#9aa84e', '#c9dd41',
  // mint / toska (batu toska, air, latar referensi)
  '#0f4f42', '#1b865f', '#2fa56e', '#70c297', '#8dd8a5', '#befae4', '#cef4e5',
  // langit & air
  '#2e4a63', '#3f7fa3', '#66b6cf', '#a9e0ea', '#2b8fa8', '#51dce1', '#a9f3f2',
  // putih
  '#f4fefb', '#ffffff',
]

export const SEMUA_RETRO: readonly string[] = PALET_RETRO
const SET_RETRO = new Set(PALET_RETRO)

/**
 * TANGGA NADA (ramp) — dipakai `gelap()` / `terang()` supaya bayangan tetap
 * satu keluarga warna. Tiap warna palet masuk TEPAT SATU tangga, urut dari
 * GELAP ke TERANG.
 */
export const TANGGA: readonly (readonly string[])[] = [
  // kayu & outline umum (cokelat tua -> kayu terang)
  ['#2b1a12', '#391d0b', '#452d1e', '#5f3d28', '#8a5a3a', '#a8764f', '#c99b6a', '#e4b98a'],
  // batu / krem / kertas
  ['#3d432a', '#574d36', '#8e8a6d', '#c5c7a4', '#dadab8', '#f1e1bb', '#f7f2cd', '#fff9e3'],
  // bata / merah
  ['#833422', '#a8412b', '#c95b3f', '#ee734c', '#fb836b'],
  // oranye / amber
  ['#a05a2a', '#d8894a', '#ef9762', '#f0ce92', '#fdd792'],
  // hijau daun
  ['#1a3121', '#1c5e40', '#2f8a52', '#4cb45c', '#7ad46f', '#a3ed75'],
  // zaitun
  ['#566b32', '#9aa84e', '#c9dd41'],
  // mint / toska
  ['#0f4f42', '#1b865f', '#2fa56e', '#70c297', '#8dd8a5', '#befae4', '#cef4e5'],
  // langit
  ['#2e4a63', '#3f7fa3', '#66b6cf', '#a9e0ea'],
  // air
  ['#2b8fa8', '#51dce1', '#a9f3f2'],
  // putih
  ['#f4fefb', '#ffffff'],
]

/** Warna tergelap palet (outline & bayangan terdalam). */
export const GELAP_MAKS = '#2b1a12'

/**
 * SKALA sel pola dither (cermin SKALA di iso/dither.ts): 2 = blok 2x2 piksel
 * internal. Disimpan di sini hanya sebagai dokumentasi nilai yang disepakati.
 */
export const SKALA_POLA = 2

function rgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
}

function luma(hex: string): number {
  const [r, g, b] = rgb(hex)
  return r * 0.299 + g * 0.587 + b * 0.114
}

/**
 * Jarak warna "redmean" (0..~765^2): lebih dekat ke persepsi mata daripada
 * RGB mentah, tapi tetap murni bilangan bulat sehingga renderer Python bisa
 * menghitung hasil yang PERSIS sama.
 */
export function jarakWarna(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a)
  const [r2, g2, b2] = rgb(b)
  const rmean = (r1 + r2) / 2
  const dr = r1 - r2
  const dg = g1 - g2
  const db = b1 - b2
  return (2 + rmean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rmean) / 256) * db * db
}

const cache = new Map<string, string>()

/**
 * Warna palet terdekat dari sembarang warna hex.
 * Warna yang SUDAH anggota palet dikembalikan apa adanya (tanpa pembulatan).
 */
export function keRetro(hex: string): string {
  const kunci = hex.toLowerCase()
  if (SET_RETRO.has(kunci)) return kunci
  const tersimpan = cache.get(kunci)
  if (tersimpan) return tersimpan
  if (!/^#[0-9a-f]{6}$/i.test(kunci)) return hex     // 'rgba(...)' dsb. dilewatkan
  let terbaik = PALET_RETRO[0]
  let jarak = Infinity
  for (const c of PALET_RETRO) {
    const d = jarakWarna(kunci, c)
    if (d < jarak) { jarak = d; terbaik = c }
  }
  cache.set(kunci, terbaik)
  return terbaik
}

/** true kalau warna ini anggota palet */
export function diRetro(hex: string): boolean {
  return SET_RETRO.has(hex.toLowerCase())
}

/** posisi warna di tangga nada: indeks tangga (0..) dan tingkat (0..) */
export function tanggaDari(hex: string): { tangga: number; tingkat: number } {
  const c = keRetro(hex)
  for (let i = 0; i < TANGGA.length; i++) {
    const k = TANGGA[i].indexOf(c)
    if (k >= 0) return { tangga: i, tingkat: k }
  }
  return { tangga: 0, tingkat: 0 }
}

/**
 * Warna `n` tingkat LEBIH GELAP di tangga yang sama (mentok di ujung).
 * `n` boleh 0 (warna itu sendiri).
 */
export function lebihGelap(hex: string, n = 1): string {
  const { tangga, tingkat } = tanggaDari(hex)
  const i = tingkat - Math.max(0, Math.round(n))
  // ujung bawah tangga tercapai -> pakai nada tergelap palet, jangan diam di
  // tempat (kalau diam, "sisi teduh" jadi sama dengan "sisi cahaya")
  if (i < 0) return GELAP_MAKS
  return TANGGA[tangga][i]
}

/** Warna `n` tingkat LEBIH TERANG di tangga yang sama (mentok di ujung). */
export function lebihTerang(hex: string, n = 1): string {
  const { tangga, tingkat } = tanggaDari(hex)
  const i = Math.min(TANGGA[tangga].length - 1, tingkat + Math.max(0, Math.round(n)))
  return TANGGA[tangga][i]
}

/**
 * TINTA OUTLINE — ciri paling khas referensi: tiap objek punya garis tepi
 * tipis yang warnanya versi GELAP dari warna isi (bukan hitam rata).
 * Cara: turun tangga sampai kecerahannya <= 55% kecerahaan asal, minimal 2
 * langkah, mentok di nada tergelap.
 */
export function tinta(hex: string): string {
  const c = keRetro(hex)
  const { tangga, tingkat } = tanggaDari(c)
  const target = luma(c) * 0.55
  let k = Math.max(0, tingkat - 2)
  while (k > 0 && luma(TANGGA[tangga][k]) > target) k--
  return TANGGA[tangga][k]
}
