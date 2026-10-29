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

import { gelap } from './palet-referensi'
import { polaBayang, polaDither } from './dither'

export interface P { x: number; y: number }

// ---------------------------------------------------------------------------
// RENCANA LANGIT (RONDE 38) — 6 pita keras + peralihan BER-DITHER
//
// Dulu (ronde 36) gradasi dibuat dengan mencampur warna kendali -> hasil
// campuran itu BUKAN anggota palet. Sekarang langit dibangun seperti game
// 16-bit: enam pita warna Endesga yang rata, lalu di tiap batas pita dipasang
// DUA jalur pola Bayer 4x4 (25% dan 75%) sehingga peralihannya berangsur tapi
// tetap hanya memakai warna palet.
//
// Rencana ini dipakai DUA renderer (canvas & tools/render_scene.py). Karena
// itu isinya data murni (tanpa gambar), jadi mudah diuji paritas.
// ---------------------------------------------------------------------------
export interface JalurPita { v0: number; v1: number; warna: string }
export interface JalurDither { v0: number; v1: number; a: string; b: string; level: number }

/** tinggi tiap jalur peralihan (bagian dari tinggi kaca, v 0..1) */
export const TINGGI_DITHER = 0.028

/**
 * Susun langit dari N warna kendali (atas -> bawah):
 *   • N pita rata (warna kendali apa adanya)
 *   • 2 jalur dither di setiap batas pita (level 0,25 lalu 0,75)
 */
export function rencanaLangit(kendali: readonly string[]): {
  pita: JalurPita[]; dither: JalurDither[]
} {
  const n = kendali.length
  const pita: JalurPita[] = []
  const dither: JalurDither[] = []
  for (let i = 0; i < n; i++) pita.push({ v0: i / n, v1: (i + 1) / n, warna: kendali[i] })
  for (let i = 0; i < n - 1; i++) {
    const vc = (i + 1) / n
    dither.push({
      v0: vc - TINGGI_DITHER, v1: vc, a: kendali[i], b: kendali[i + 1], level: 0.25,
    })
    dither.push({
      v0: vc, v1: vc + TINGGI_DITHER, a: kendali[i], b: kendali[i + 1], level: 0.75,
    })
  }
  return { pita, dither }
}

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
 * Warna langit tiap fase — ENAM pita keras (ciri pixel-art 16-bit).
 * Semua warna = anggota palet Endesga 32; peralihan antar pita dibuat
 * DITHER oleh `rencanaLangit`, bukan gradasi campuran warna.
 */
export function langitFase(f: Fase): LangitFase {
  switch (f) {
    case 'fajar':
      // biru malam -> ungu -> jingga -> kuning (matahari baru naik)
      return {
        pita: ['#2e4a63', '#3f7fa3', '#66b6cf', '#c95b3f', '#ef9762', '#f0ce92'],
        benda: 'matahari', bintang: false, awan: '#f1e1bb',
      }
    case 'pagi':
      return {
        pita: ['#2e4a63', '#3f7fa3', '#66b6cf', '#a9e0ea', '#f1e1bb', '#fdd792'],
        benda: 'matahari', bintang: false, awan: '#ffffff',
      }
    case 'siang':
      return {
        pita: ['#2e4a63', '#3f7fa3', '#66b6cf', '#a9e0ea', '#cef4e5', '#fff9e3'],
        benda: 'matahari', bintang: false, awan: '#ffffff',
      }
    case 'senja':
      // kuning -> jingga -> merah bata -> ungu -> malam
      return {
        pita: ['#3f7fa3', '#2e4a63', '#833422', '#ee734c', '#ef9762', '#fdd792'],
        benda: 'matahari', bintang: false, awan: '#fb836b',
      }
    default:
      // RONDE 46 — malam diperbaiki. Dulu pita paling atas memakai #1a3121
      // (hijau tua dari tangga nada hijau) sehingga langit malam terlihat
      // kehijauan, dan pita bawahnya #66b6cf (biru terang) sehingga kaca
      // jendela terlihat seperti siang yang digelapkan.
      // Sekarang: nyaris hitam di zenith -> biru tua -> biru pucat di horizon.
      return {
        pita: ['#2b1a12', '#2e4a63', '#2e4a63', '#2e4a63', '#2e4a63', '#3f7fa3'],
        benda: 'bulan', bintang: true, awan: '#3f7fa3',
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
        mendung: ['#8e8a6d', '#8e8a6d', '#574d36', '#574d36', '#3d432a', '#3d432a'],
      }
    case 'hujan':
      return {
        awan: 5, hujan: 46, kilat: false, pelangi: false, label: 'HUJAN',
        mendung: ['#574d36', '#574d36', '#3d432a', '#3d432a', '#2b1a12', '#2b1a12'],
      }
    case 'badai':
      return {
        awan: 6, hujan: 70, kilat: true, pelangi: false, label: 'BADAI',
        mendung: ['#3d432a', '#3d432a', '#2b1a12', '#2b1a12', '#1a3121', '#1a3121'],
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

function isiPoligon(ctx: CanvasRenderingContext2D, pts: P[], warnaIsi: string | CanvasPattern) {
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
function pita(
  ctx: CanvasRenderingContext2D, k: Bidang, v0: number, v1: number,
  warnaI: string | CanvasPattern,
) {
  isiPoligon(ctx, [
    titik(k, 0, v0), titik(k, 1, v0), titik(k, 1, v1), titik(k, 0, v1),
  ], warnaI)
}

/**
 * kotak kecil di koordinat bidang, DIPOTONG di tepi kaca.
 * Tanpa pemotongan, awan & butir hujan yang berada di luar bidang akan
 * menimpa kusen kayu (bug tampak di uji ronde langit pertama).
 */
function kotak(
  ctx: CanvasRenderingContext2D, k: Bidang, u0: number, v0: number,
  du: number, dv: number, warnaI: string | CanvasPattern,
) {
  const u = Math.max(0, Math.min(1, u0))
  const v = Math.max(0, Math.min(1, v0))
  const du2 = Math.min(du, 1 - u)
  const dv2 = Math.min(dv, 1 - v)
  if (du2 <= 0 || dv2 <= 0) return
  isiPoligon(ctx, [
    titik(k, u, v), titik(k, u + du2, v), titik(k, u + du2, v + dv2), titik(k, u, v + dv2),
  ], warnaI)
}

function cakram(
  ctx: CanvasRenderingContext2D, k: Bidang,
  u: number, v: number, ru: number, rv: number, warnaI: string | CanvasPattern,
  seg = 12,
) {
  const SEG = seg
  const pts: P[] = []
  for (let i = 0; i < SEG; i++) {
    const t = (i / SEG) * Math.PI * 2
    pts.push(titik(k, u + Math.cos(t) * ru, v + Math.sin(t) * rv))
  }
  isiPoligon(ctx, pts, warnaI)
}

/**
 * AWAN GUMPAL (permintaan user: "bisakah buat langit lebih realistis?").
 * Dulu: empat kotak persegi bertumpuk -> terlihat seperti balok kayu.
 * Sekarang: alas lebar yang RATA di bawah (ciri awan kumulus) + 3-4 gumpalan
 * elips di atasnya, perut lebih gelap, dan puncak paling terang. Semua tetap
 * poligon tajam (tanpa anti-alias); warna tepi = CAMPURAN awan dengan langit
 * sehingga gumpalan tidak tampak sebagai kotak yang ditempel.
 */
function awanSatu(
  ctx: CanvasRenderingContext2D, k: Bidang,
  u: number, v: number, lebar: number, skala: number,
  atas: string | CanvasPattern, bawah: string, lingkar: string | CanvasPattern,
) {
  const h = 0.075 * skala
  const dasar = v + h * 0.55
  // lingkar luar (tepi lembut)
  cakram(ctx, k, u + lebar * 0.30, dasar - h * 0.10, lebar * 0.26, h * 0.55, lingkar)
  cakram(ctx, k, u + lebar * 0.58, dasar - h * 0.18, lebar * 0.30, h * 0.60, lingkar)
  cakram(ctx, k, u + lebar * 0.82, dasar - h * 0.05, lebar * 0.22, h * 0.50, lingkar)
  // perut awan (lebih gelap), alas rata
  kotak(ctx, k, u + lebar * 0.10, dasar - h * 0.35, lebar * 0.80, h * 0.40, bawah)
  // badan terang
  cakram(ctx, k, u + lebar * 0.30, dasar - h * 0.40, lebar * 0.24, h * 0.56, atas)
  cakram(ctx, k, u + lebar * 0.60, dasar - h * 0.46, lebar * 0.29, h * 0.62, atas)
  cakram(ctx, k, u + lebar * 0.84, dasar - h * 0.34, lebar * 0.20, h * 0.48, atas)
  // puncak paling terang (sorotan matahari)
  cakram(ctx, k, u + lebar * 0.50, dasar - h * 0.72, lebar * 0.17, h * 0.40, atas)
}

function awan(ctx: CanvasRenderingContext2D, k: Bidang, dasar: string, n: number) {
  for (let i = 0; i < n; i++) {
    const lebar = 0.24 + acak(i, 3) * 0.16
    const skala = 0.85 + acak(i, 9) * 0.45
    const v = 0.10 + acak(i, 4) * 0.40
    const arah = i % 2 === 0 ? 1 : -1
    // melayang lambat; dibungkus 0..1 supaya masuk lagi dari sisi lain
    let u = (acak(i, 5) + arah * detik * 0.010) % 1
    if (u < 0) u += 1
    const terang = i % 2 === 0 ? dasar : gelap(dasar, 1)
    const bawah = gelap(dasar, 2)
    // lingkar luar = DITHER antara nada terang & perut awan (tepi lembut
    // khas pixel-art, tanpa mencampur warna)
    const lingkar = polaDither(ctx, terang, bawah, 0.5)
    awanSatu(ctx, k, u, v, lebar, skala, terang, bawah, lingkar)
  }
}

/**
 * BINTANG beragam ukuran & terang (user: lebih realistis). Bintang paling
 * terang diberi salib tipis; bintang redup cuma 1-2 piksel. Tiap bintang
 * berkedip dengan fase sendiri supaya tidak serempak.
 */
function bintang(ctx: CanvasRenderingContext2D, k: Bidang, warnaI: string) {
  const redup = gelap(warnaI, 1)
  // RONDE 46 — KENAPA DULU TERLIHAT SEPERTI TITIK AIR:
  // ada 34 bintang, tersebar RATA di seluruh bidang, masing-masing digambar
  // sebagai kotak 1-2 px yang menyala sepanjang waktu. Pola titik putih rapat
  // dan seragam seperti itu terbaca sebagai RINTIK HUJAN / embun di kaca,
  // bukan bintang.
  // Sekarang: lebih sedikit (16), mengumpul di langit atas, ukurannya 1 px,
  // dan sebagian besar berkedip mati — jadi terlihat seperti langit berbintang.
  const N = 12
  for (let i = 0; i < N; i++) {
    const u = acak(i, 7)
    const v = acak(i, 8) * 0.62          // hanya di 62% atas bidang
    const besar = acak(i, 13)
    const kedip = Math.sin(detik * (0.9 + besar) + i * 1.7)
    if (kedip < -0.2) continue           // lebih sering padam -> tidak "confetti"
    const warnaB = kedip > 0.75 ? warnaI : redup
    const w = 0.006 + besar * 0.004      // ~1 px internal
    const h = 0.012 + besar * 0.010
    kotak(ctx, k, u, v, w, h, warnaB)
    if (besar > 0.84) {                  // hanya bintang paling terang diberi salib
      kotak(ctx, k, u - w * 0.8, v + h * 0.38, w * 2.6, h * 0.30, warnaB)
      kotak(ctx, k, u + w * 0.1, v - h * 0.30, w * 0.8, h * 1.5, warnaB)
    }
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
  const warnaPita = ['#fb836b', '#fdd792', '#a9f3f2']   // merah · kuning · sian
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

  // 1) LANGIT: 6 pita KERAS (warna kendali Endesga) + peralihan BER-DITHER.
  //    Tidak ada campuran warna sama sekali -> tidak ada warna di luar palet.
  //    Bagian bawah tetap terasa beruap karena dither 25% -> 75% memberi
  //    "kabut bertangga" khas game 16-bit.
  const rencana = rencanaLangit(pitaWarna)
  const warnaLangit: string[] = pitaWarna.slice()
  for (const b of rencana.pita) pita(ctx, k, b.v0, b.v1, b.warna)
  for (const d of rencana.dither) {
    pita(ctx, k, Math.max(0, d.v0), Math.min(1, d.v1),
      polaDither(ctx, d.a, d.b, d.level))
  }
  /** warna langit pada ketinggian v (untuk halo & tepi awan) */
  const langitDi = (v: number) => {
    const i = Math.max(0, Math.min(warnaLangit.length - 1, Math.round(v * (warnaLangit.length - 1))))
    return warnaLangit[i]
  }

  // 2) bintang (malam, tidak terlihat saat mendung tebal)
  // RONDE 46: warnanya #fff9e3 (bukan #ffffff yang bahkan bukan anggota palet)
  // dan sebagian besar diredupkan, supaya tidak terbaca sebagai titik air.
  if (L.bintang && !e.mendung) bintang(ctx, k, '#fff9e3')

  // 3) pelangi tipis (sehabis gerimis, hanya pagi/siang)
  if (e.pelangi && (fase === 'pagi' || fase === 'siang')) pelangi(ctx, k)

  // 4) MATAHARI / BULAN + HALO (cincin cahaya berlapis, warna campuran ke
  //    langit sekitarnya sehingga menyatu, bukan cakram yang ditempel).
  const b = posisiBenda(jam, fase)
  if (b.bulan) {
    const sekitar = langitDi(b.v)
    // halo sempit ber-DITHER: makin ke luar makin jarang piksel bulan, jadi
    // menyatu dengan langit tanpa perlu mencampur warna (tetap 32 warna)
    // halo bulan dibuat LEBIH TIPIS (dulu 18%/48% -> bintik putih di sekeliling
    // bulan ikut terbaca sebagai titik air di kaca)
    cakram(ctx, k, b.u, b.v, 0.128, 0.225, polaDither(ctx, sekitar, '#dadab8', 0.10), 20)
    cakram(ctx, k, b.u, b.v, 0.104, 0.182, polaDither(ctx, sekitar, '#dadab8', 0.30), 20)
    cakram(ctx, k, b.u, b.v, 0.082, 0.142, '#c5c7a4')
    cakram(ctx, k, b.u - 0.012, b.v - 0.018, 0.058, 0.100, '#dadab8')
    // kawah: tiga bintik gelap
    cakram(ctx, k, b.u + 0.021, b.v + 0.017, 0.014, 0.025, '#8e8a6d', 8)
    cakram(ctx, k, b.u - 0.016, b.v + 0.045, 0.010, 0.018, '#8e8a6d', 8)
    cakram(ctx, k, b.u + 0.004, b.v - 0.042, 0.008, 0.014, '#8e8a6d', 8)
  } else if (!e.mendung || e.hujan === 0) {
    // matahari: kekuningan; saat fajar/senja lebih jingga
    const hangat = fase === 'senja' || fase === 'fajar'
    const tepi = hangat ? '#d8894a' : '#ef9762'
    const inti = hangat ? '#ef9762' : '#fdd792'
    const sekitar = langitDi(b.v)
    // halo SEMPIT berlapis (dither 18% lalu 48% lalu tepi pekat)
    cakram(ctx, k, b.u, b.v, 0.138, 0.238, polaDither(ctx, sekitar, tepi, 0.14), 20)
    cakram(ctx, k, b.u, b.v, 0.110, 0.190, polaDither(ctx, sekitar, tepi, 0.42), 20)
    cakram(ctx, k, b.u, b.v, 0.082, 0.144, tepi, 20)
    cakram(ctx, k, b.u - 0.010, b.v - 0.016, 0.058, 0.102, inti)
  }

  // 5) awan melayang
  const awanCuaca = e.mendung
    ? gelap(L.awan, cuaca === 'badai' ? 5 : cuaca === 'hujan' ? 4 : 3)
    : L.awan
  if (e.awan > 0) awan(ctx, k, awanCuaca, e.awan)

  // 6) hujan
  if (e.hujan > 0) hujan(ctx, k, e.hujan, e.mendung ? '#8e8a6d' : '#a9f3f2')

  // 7) kilat: setiap ±7 detik menyala 0,12 detik
  if (e.kilat) {
    const siklus = t % 7
    if (siklus < 0.12) {
      // kilat menyala: seluruh kaca diputihkan (pola penuh, bukan campuran)
      pita(ctx, k, 0, 1, '#ffffff')
    } else if (siklus > 3.4 && siklus < 3.52) {
      // KILAT BERCABANG: batang utama + dua cabang (user: lebih realistis)
      const petir: P[][] = [
        [
          titik(k, 0.56, 0.02), titik(k, 0.49, 0.20), titik(k, 0.55, 0.24),
          titik(k, 0.46, 0.46), titik(k, 0.52, 0.50), titik(k, 0.42, 0.72),
          titik(k, 0.45, 0.50), titik(k, 0.40, 0.45), titik(k, 0.48, 0.23),
          titik(k, 0.44, 0.19),
        ],
        [
          titik(k, 0.53, 0.24), titik(k, 0.46, 0.34), titik(k, 0.40, 0.40),
          titik(k, 0.47, 0.30), titik(k, 0.51, 0.26),
        ],
        [
          titik(k, 0.52, 0.50), titik(k, 0.58, 0.58), titik(k, 0.62, 0.62),
          titik(k, 0.57, 0.54), titik(k, 0.51, 0.47),
        ],
      ]
      for (const bentuk of petir) isiPoligon(ctx, bentuk, '#fdd792')
    }
  }

  detik = simpanDetik
}
