// LANGIT DINAMIS & CUACA — permintaan user 2026-10-29:
//   "apakah warna biru itu bisa diganti dengan animasi pergerakan bulan atau
//    matahari, warna background menyesuaikan warna langit nyata ... animasi
//    pergerakan awan jika cuaca berawan ... hujan rintik-rintik ketika cuaca
//    gerimis ... warna langit sesuaikan jam atau waktu pada perangkat, bagi
//    menjadi suasana pagi, siang, senja, malam, dan fajar."
//
// ATURAN YANG DIPEGANG:
//   1. SEMUA warna tetap dari palet referensi 342 warna (docs/07) — tidak ada
//      hex baru. Tiap fase memakai 3 tingkat dari satu/dua kolom hue palet.
//   2. Tanpa anti-alias: semua bentuk digambar sebagai poligon/balok dengan
//      koordinat dibulatkan, jadi tetap tajam seperti pixel-art.
//   3. Deterministik: gerak awan/hujan dihitung dari `detik` + fungsi acak
//      berbasis indeks (bukan Math.random), supaya renderer APK dan PNG uji
//      menghasilkan gambar yang sama untuk waktu yang sama.
//
// Modul ini TIDAK menggambar seluruh layar — hanya MENGISI BIDANG KACA jendela
// (objek ber-`langit: true`). Latar kanvas tetap hitam OLED.

import { gelap, warna } from './palet-referensi'

export interface P { x: number; y: number }

/** empat sudut bidang kaca; v = 0 di ATAS, v = 1 di BAWAH */
export interface Bidang {
  atasKiri: P
  atasKanan: P
  bawahKanan: P
  bawahKiri: P
}

export type Fase = 'fajar' | 'pagi' | 'siang' | 'senja' | 'malam'
export type Cuaca = 'cerah' | 'berawan' | 'gerimis' | 'hujan' | 'badai'

export const SEMUA_CUACA: Cuaca[] = ['cerah', 'berawan', 'gerimis', 'hujan', 'badai']

export interface PengaturanLangit {
  /** jam perangkat dalam desimal, mis. 14.5 = 14:30 */
  jam: number
  cuaca: Cuaca
}

// ---------------------------------------------------------------------------
// keadaan global (dipakai renderer tanpa mengubah tanda tangan drawObject)
// ---------------------------------------------------------------------------
let keadaan: PengaturanLangit = { jam: 12, cuaca: 'cerah' }
let detik = 0

export function setLangit(p: Partial<PengaturanLangit>) {
  if (typeof p.jam === 'number' && Number.isFinite(p.jam)) keadaan.jam = ((p.jam % 24) + 24) % 24
  if (p.cuaca) keadaan.cuaca = p.cuaca
}

export function getLangit(): PengaturanLangit {
  return { ...keadaan }
}

/** dipanggil renderer sekali per bingkai (detik berjalan) */
export function setDetik(d: number) {
  detik = d
}

// ---------------------------------------------------------------------------
// 1. FASE WAKTU
// ---------------------------------------------------------------------------
export const BATAS_FASE: { fase: Fase; mulai: number; selesai: number; label: string }[] = [
  { fase: 'fajar', mulai: 4.5, selesai: 6, label: 'FAJAR' },
  { fase: 'pagi', mulai: 6, selesai: 10, label: 'PAGI' },
  { fase: 'siang', mulai: 10, selesai: 15, label: 'SIANG' },
  { fase: 'senja', mulai: 15, selesai: 18, label: 'SENJA' },
  { fase: 'malam', mulai: 18, selesai: 24, label: 'MALAM' },
]

export function faseDariJam(jam: number): Fase {
  const j = ((jam % 24) + 24) % 24
  if (j >= 4.5 && j < 6) return 'fajar'
  if (j >= 6 && j < 10) return 'pagi'
  if (j >= 10 && j < 15) return 'siang'
  if (j >= 15 && j < 18) return 'senja'
  return 'malam'
}

export interface LangitFase {
  /** 6 pita langit dari ATAS ke BAWAH (indeks = kolom hue, tingkat palet) */
  pita: [string, string, string, string, string, string]
  /** benda langit yang terlihat */
  benda: 'matahari' | 'bulan'
  bintang: boolean
  /** warna awan dasar untuk fase ini */
  awan: string
}

/**
 * Warna langit tiap fase — ENAM pita bertangga (ciri pixel-art, bukan gradasi).
 * Tiap angka = (kolom hue, tingkat kecerahan) pada palet referensi 18x19:
 *   1 oranye · 2 jingga · 3 kuning · 9 sian · 10 biru-langit · 11 biru ·
 *   12 biru-ungu · 13 ungu · 14 magenta · 15 rose · 18 abu-abu.
 * Tingkat 1 paling terang, 19 paling gelap.
 */
export function langitFase(f: Fase): LangitFase {
  switch (f) {
    case 'fajar':
      return {
        pita: [warna(12, 11), warna(12, 9), warna(13, 7), warna(2, 4), warna(3, 3), warna(3, 2)],
        benda: 'matahari', bintang: false, awan: warna(15, 3),
      }
    case 'pagi':
      return {
        pita: [warna(11, 8), warna(11, 6), warna(10, 4), warna(10, 3), warna(9, 3), warna(9, 2)],
        benda: 'matahari', bintang: false, awan: warna(18, 1),
      }
    case 'siang':
      return {
        pita: [warna(11, 7), warna(11, 5), warna(10, 4), warna(10, 3), warna(9, 3), warna(9, 2)],
        benda: 'matahari', bintang: false, awan: warna(18, 1),
      }
    case 'senja':
      return {
        pita: [warna(11, 10), warna(12, 8), warna(2, 3), warna(2, 2), warna(3, 2), warna(3, 1)],
        benda: 'matahari', bintang: false, awan: warna(18, 3),
      }
    default:
      return {
        pita: [warna(12, 13), warna(12, 12), warna(11, 12), warna(11, 11), warna(10, 11), warna(10, 10)],
        benda: 'bulan', bintang: true, awan: warna(18, 6),
      }
  }
}

// ---------------------------------------------------------------------------
// 2. CUACA
// ---------------------------------------------------------------------------
export interface EfekCuaca {
  /** jumlah awan yang melintas */
  awan: number
  /** jumlah butir hujan (0 = tidak hujan) */
  hujan: number
  /** kilat sesekali */
  kilat: boolean
  /** pelangi tipis (sehabis gerimis di siang hari) */
  pelangi: boolean
  /** warna langit mendung (6 pita); null = pakai warna fase */
  mendung: [string, string, string, string, string, string] | null
  label: string
}

export function efekCuaca(c: Cuaca): EfekCuaca {
  switch (c) {
    case 'berawan':
      return { awan: 3, hujan: 0, kilat: false, pelangi: false, mendung: null, label: 'BERAWAN' }
    case 'gerimis':
      return {
        awan: 4, hujan: 20, kilat: false, pelangi: true, label: 'GERIMIS',
        mendung: [warna(18, 4), warna(18, 5), warna(18, 6), warna(18, 7), warna(18, 8), warna(18, 8)],
      }
    case 'hujan':
      return {
        awan: 5, hujan: 46, kilat: false, pelangi: false, label: 'HUJAN',
        mendung: [warna(18, 5), warna(18, 6), warna(18, 7), warna(18, 8), warna(18, 9), warna(18, 10)],
      }
    case 'badai':
      return {
        awan: 6, hujan: 70, kilat: true, pelangi: false, label: 'BADAI',
        mendung: [warna(18, 6), warna(18, 8), warna(18, 9), warna(18, 10), warna(18, 11), warna(18, 12)],
      }
    default:
      return { awan: 1, hujan: 0, kilat: false, pelangi: false, mendung: null, label: 'CERAH' }
  }
}

/** kode cuaca WMO (Open-Meteo) -> jenis cuaca aplikasi */
export function cuacaDariKode(kode: number): Cuaca {
  if (kode === 0) return 'cerah'
  if (kode <= 3) return 'berawan'          // 1-3: cerah berawan s/d mendung
  if (kode === 45 || kode === 48) return 'berawan' // kabut
  if (kode >= 51 && kode <= 57) return 'gerimis'
  if (kode >= 61 && kode <= 67) return 'hujan'
  if (kode >= 71 && kode <= 77) return 'hujan'     // salju dianggap hujan
  if (kode >= 80 && kode <= 82) return 'hujan'
  if (kode >= 85 && kode <= 86) return 'hujan'
  if (kode >= 95) return 'badai'
  return 'cerah'
}

// ---------------------------------------------------------------------------
// 3. ACak deterministik (bukan Math.random) + posisi matahari/bulan
// ---------------------------------------------------------------------------
function acak(i: number, garam = 0): number {
  const x = Math.sin(i * 12.9898 + garam * 78.233) * 43758.5453
  return x - Math.floor(x)
}

/** posisi benda langit dalam koordinat bidang kaca: u 0..1 (kiri->kanan), v 0..1 (atas->bawah) */
export function posisiBenda(jam: number, fase: Fase): { u: number; v: number; bulan: boolean } {
  if (fase === 'malam') {
    // bulan: terbit 18, tenggelam 05
    const t = jam >= 18 ? (jam - 18) / 11 : (jam + 6) / 11
    return { u: 0.14 + 0.72 * t, v: 0.62 - 0.42 * Math.sin(Math.PI * t), bulan: true }
  }
  const t = Math.min(1, Math.max(0, (jam - 5) / 13))   // matahari: 05 -> 18
  return { u: 0.14 + 0.72 * t, v: 0.62 - 0.46 * Math.sin(Math.PI * t), bulan: false }
}

// ---------------------------------------------------------------------------
// 4. MENGGAMBAR
// ---------------------------------------------------------------------------
function titik(k: Bidang, u: number, v: number): P {
  const atas = {
    x: k.atasKiri.x + (k.atasKanan.x - k.atasKiri.x) * u,
    y: k.atasKiri.y + (k.atasKanan.y - k.atasKiri.y) * u,
  }
  const bawah = {
    x: k.bawahKiri.x + (k.bawahKanan.x - k.bawahKiri.x) * u,
    y: k.bawahKiri.y + (k.bawahKanan.y - k.bawahKiri.y) * u,
  }
  return { x: atas.x + (bawah.x - atas.x) * v, y: atas.y + (bawah.y - atas.y) * v }
}

function isiPoligon(ctx: CanvasRenderingContext2D, pts: P[], warnaIsi: string) {
  ctx.fillStyle = warnaIsi
  ctx.beginPath()
  pts.forEach((p, i) => {
    const x = Math.round(p.x)
    const y = Math.round(p.y)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fill()
}

/** pita horizontal v0..v1 selebar bidang (untuk gradasi langit bertangga) */
function pita(ctx: CanvasRenderingContext2D, k: Bidang, v0: number, v1: number, warnaI: string) {
  isiPoligon(ctx, [
    titik(k, 0, v0), titik(k, 1, v0), titik(k, 1, v1), titik(k, 0, v1),
  ], warnaI)
}

/**
 * kotak kecil di koordinat bidang, DIPOTONG di tepi kaca.
 * Tanpa pemotongan, awan & butir hujan yang berada di luar bidang akan
 * menimpa kusen kayu (bug tampak di uji ronde langit pertama).
 */
function kotak(ctx: CanvasRenderingContext2D, k: Bidang, u0: number, v0: number, du: number, dv: number, warnaI: string) {
  const u = Math.max(0, Math.min(1, u0))
  const v = Math.max(0, Math.min(1, v0))
  const du2 = Math.min(du, 1 - u)
  const dv2 = Math.min(dv, 1 - v)
  if (du2 <= 0 || dv2 <= 0) return
  isiPoligon(ctx, [
    titik(k, u, v), titik(k, u + du2, v), titik(k, u + du2, v + dv2), titik(k, u, v + dv2),
  ], warnaI)
}

function cakram(ctx: CanvasRenderingContext2D, k: Bidang, u: number, v: number, ru: number, rv: number, warnaI: string) {
  const SEG = 10
  const pts: P[] = []
  for (let i = 0; i < SEG; i++) {
    const t = (i / SEG) * Math.PI * 2
    pts.push(titik(k, u + Math.cos(t) * ru, v + Math.sin(t) * rv))
  }
  isiPoligon(ctx, pts, warnaI)
}

function awan(ctx: CanvasRenderingContext2D, k: Bidang, dasar: string, n: number) {
  for (let i = 0; i < n; i++) {
    const lebar = 0.26 + acak(i, 3) * 0.14
    const v = 0.12 + acak(i, 4) * 0.38
    const arah = i % 2 === 0 ? 1 : -1
    // melayang lambat; dibungkus 0..1 supaya masuk lagi dari sisi lain
    let u = (acak(i, 5) + arah * detik * 0.010) % 1
    if (u < 0) u += 1
    const terang = i % 2 === 0 ? dasar : gelap(dasar, 1)
    const gelapBawah = gelap(dasar, 1)
    // awan bergaya pixel-art: tiga tumpuk balok, bukan garis tipis
    kotak(ctx, k, u, v, lebar, 0.075, terang)
    kotak(ctx, k, u + lebar * 0.14, v + 0.07, lebar * 0.66, 0.055, gelapBawah)
    kotak(ctx, k, u + lebar * 0.30, v - 0.055, lebar * 0.42, 0.065, terang)
    kotak(ctx, k, u + lebar * 0.62, v + 0.03, lebar * 0.26, 0.05, gelapBawah)
  }
}

function bintang(ctx: CanvasRenderingContext2D, k: Bidang, warnaI: string) {
  for (let i = 0; i < 22; i++) {
    const u = acak(i, 7)
    const v = acak(i, 8) * 0.72
    const kedip = Math.sin(detik * 1.6 + i) > -0.35
    if (!kedip) continue
    kotak(ctx, k, u, v, 0.012, 0.03, warnaI)
  }
}

function hujan(ctx: CanvasRenderingContext2D, k: Bidang, n: number, warnaI: string) {
  const lebat = n > 40
  const cepat = lebat ? 1.8 : 1.3            // hujan lebat jatuh lebih cepat
  const tinggi = lebat ? 0.07 : 0.045        // butir rintik lebih pendek
  const lebar = lebat ? 0.010 : 0.008
  for (let i = 0; i < n; i++) {
    const u = acak(i, 11)
    const faseTurun = (acak(i, 12) + detik * cepat) % 1
    // jarak antar butir dirapatkan di dalam kaca (tidak ada di luar bidang)
    const v = faseTurun * (1 - tinggi)
    kotak(ctx, k, u, v, lebar, tinggi, warnaI)
  }
}

function pelangi(ctx: CanvasRenderingContext2D, k: Bidang) {
  // BUSUR setengah lingkaran, tiga pita (bukan garis lurus yang terlihat
  // seperti bendera). Pusat di bawah kaca, jari-jari mengecil ke dalam.
  const warnaPita = [warna(15, 5), warna(3, 4), warna(9, 5)]
  const SEG = 9
  for (let p = 0; p < warnaPita.length; p++) {
    const rLuar = 0.62 - p * 0.05
    const rDalam = rLuar - 0.045
    const pts: P[] = []
    for (let i = 0; i <= SEG; i++) {
      const a = Math.PI - (i / SEG) * Math.PI      // 180° -> 0°
      pts.push(titik(k, 0.5 + Math.cos(a) * rLuar, 1.05 - Math.sin(a) * rLuar * 1.7))
    }
    for (let i = SEG; i >= 0; i--) {
      const a = Math.PI - (i / SEG) * Math.PI
      pts.push(titik(k, 0.5 + Math.cos(a) * rDalam, 1.05 - Math.sin(a) * rDalam * 1.7))
    }
    isiPoligon(ctx, pts, warnaPita[p])
  }
}

export interface OpsiLangit extends Partial<PengaturanLangit> {
  /** waktu animasi (detik); bila kosong memakai `detik` global */
  waktu?: number
}

/** gambar langit + cuaca di dalam satu bidang kaca */
export function drawLangit(ctx: CanvasRenderingContext2D, k: Bidang, opsi: OpsiLangit = {}) {
  const jam = opsi.jam ?? keadaan.jam
  const cuaca = opsi.cuaca ?? keadaan.cuaca
  const t = opsi.waktu ?? detik
  const simpanDetik = detik
  detik = t

  const fase = faseDariJam(jam)
  const L = langitFase(fase)
  const e = efekCuaca(cuaca)
  const pitaWarna = e.mendung ?? L.pita
  const gelapCuaca = (hex: string) => (e.mendung ? hex : hex)

  // 1) langit: enam pita bertangga (bukan gradasi halus)
  for (let i = 0; i < 6; i++) {
    pita(ctx, k, i / 6, (i + 1) / 6, gelapCuaca(pitaWarna[i]))
  }

  // 2) bintang (malam, tidak terlihat saat mendung tebal)
  if (L.bintang && !e.mendung) bintang(ctx, k, warna(18, 1))

  // 3) pelangi tipis (sehabis gerimis, hanya pagi/siang)
  if (e.pelangi && (fase === 'pagi' || fase === 'siang')) pelangi(ctx, k)

  // 4) matahari / bulan mengikuti jam perangkat
  const b = posisiBenda(jam, fase)
  if (b.bulan) {
    cakram(ctx, k, b.u, b.v, 0.075, 0.13, warna(18, 2))
    cakram(ctx, k, b.u - 0.015, b.v - 0.02, 0.052, 0.09, warna(18, 1))
  } else if (!e.mendung || e.hujan === 0) {
    // matahari: kekuningan; saat fajar/senja warnanya lebih jingga
    const hangat = fase === 'senja' || fase === 'fajar'
    const tepi = hangat ? warna(2, 3) : warna(3, 3)
    const inti = hangat ? warna(2, 2) : warna(3, 2)
    cakram(ctx, k, b.u, b.v, 0.085, 0.15, tepi)
    cakram(ctx, k, b.u - 0.012, b.v - 0.02, 0.062, 0.11, inti)
  }

  // 5) awan melayang
  const awanCuaca = e.mendung
    ? gelap(L.awan, cuaca === 'badai' ? 5 : cuaca === 'hujan' ? 4 : 3)
    : L.awan
  if (e.awan > 0) awan(ctx, k, awanCuaca, e.awan)

  // 6) hujan
  if (e.hujan > 0) hujan(ctx, k, e.hujan, e.mendung ? warna(18, 2) : warna(10, 2))

  // 7) kilat: setiap ±7 detik menyala 0,12 detik
  if (e.kilat) {
    const siklus = t % 7
    if (siklus < 0.12) {
      pita(ctx, k, 0, 1, warna(18, 1))
    } else if (siklus > 3.4 && siklus < 3.52) {
      const zig = [
        titik(k, 0.55, 0.05), titik(k, 0.47, 0.3), titik(k, 0.56, 0.32),
        titik(k, 0.44, 0.62), titik(k, 0.46, 0.34), titik(k, 0.38, 0.31),
      ]
      isiPoligon(ctx, zig, warna(3, 1))
    }
  }

  detik = simpanDetik
}
