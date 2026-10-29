import { DENS, HW, arahKamera, px, type P } from './space'
import { MATERIALS, UNKNOWN_STYLE } from './palette'
import type { SceneObject } from '../scene/types'

import { gelap as gelapPalet, kePalet, terang as terangPalet, warna } from './palet-referensi'

export interface Box { x0: number; y0: number; x1: number; y1: number }

// ---------------------------------------------------------------------------
// REGISTRI SPRITE (opsi C "campuran", permintaan user 2026-10-29)
// Gambar hasil potongan langsung dari referensi, dimuat sekali oleh
// scene/aset.ts lalu dipakai di sini. Renderer tidak pernah menunggu gambar:
// kalau belum siap, objek digambar sebagai kotak penanda.
// ---------------------------------------------------------------------------
const SPRITE: Record<string, HTMLImageElement> = {}

export function daftarSprite(nama: string, img: HTMLImageElement) {
  SPRITE[nama] = img
}

export function spriteSiap(nama?: string): boolean {
  return !!nama && !!SPRITE[nama] && SPRITE[nama].naturalWidth > 0
}

function drawSprite(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const img = SPRITE[o.sprite!]
  const { se, sw } = footprintOf(o)
  // lebar layar objek isometrik = (se + sw) · HW  (lebar bayangan footprint)
  const wpx = Math.max(2, (se + sw) * HW)
  const skala = wpx / img.naturalWidth
  const hpx = img.naturalHeight * skala
  const kaki = px(o.pos.e + se, o.pos.w + sw, o.pos.z)
  const tengah = px(o.pos.e + se / 2, o.pos.w + sw / 2, o.pos.z)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(img, Math.round(tengah.x - wpx / 2), Math.round(kaki.y - hpx), Math.round(wpx), Math.round(hpx))
}

// ---------------------------------------------------------------------------
// GARIS TEPI (outline) — permintaan user 2026-10-29 "identik dengan referensi".
// Gambar referensi memberi garis tipis lebih gelap di tepi setiap bidang.
// Warnanya diturunkan otomatis dari warna isi (dicampur ke arah tinta gelap),
// jadi tidak perlu menambah warna baru ke palet.
// ---------------------------------------------------------------------------
// Tinta gelap HANGAT (cokelat-marun) — diambil dari garis tepi pada gambar
// referensi tema diorama. Tinta ungu dingin tidak dipakai lagi.
const CAMPUR = 0.42        // 0 = tanpa garis, 1 = banyak tingkat turun
const TEBAL_TEPI = 2       // piksel internal (resolusi naik 1,775x 2026-10-29)

/**
 * GARIS TEPI & SHADING — 2026-10-29
 * Dulu: campur warna dengan tinta cokelat / dengan putih (menghasilkan warna di
 * luar palet). Sekarang: turun/naik beberapa TINGKAT di kolom hue yang sama
 * pada palet referensi 16x12, jadi SEMUA warna tetap anggota palet dan
 * bayangannya bergaya cell-shading (tangga, bukan gradasi).
 */
/** tinta garis tepi: cokelat sangat tua dari palet (bukan warna turunan) */
const TINTA = warna(17, 18)   // #341b10

function gelapkan(warna: string, f = CAMPUR): string {
  // f >= 0.4 dipakai oleh GARIS TEPI: selalu tinta gelap yang sama, supaya
  // tepi tetap terbaca di atas bidang terang maupun gelap (dan tidak pernah
  // berubah jadi pink/salmon seperti saat memakai "turun 2 tingkat").
  if (f >= 0.4) return TINTA
  return gelapPalet(kePalet(warna), Math.max(1, Math.round(f * 5)))
}

/** versi terang dari sebuah warna (untuk bibir/sorot) */
function terangkan(warna: string, f = 0.30): string {
  return terangPalet(kePalet(warna), Math.max(1, Math.round(f * 4)))
}

function poly(ctx: CanvasRenderingContext2D, pts: P[], color: string, garis = true) {
  ctx.fillStyle = color
  ctx.beginPath()
  pts.forEach((p, i) => {
    const x = Math.round(p.x)
    const y = Math.round(p.y)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
  ctx.fill()
  if (!garis) return
  ctx.strokeStyle = gelapkan(color)
  ctx.lineWidth = TEBAL_TEPI
  ctx.lineJoin = 'round'
  ctx.stroke()
}

/** garis tepi untuk objek ini (bawaan ON, `tepi: false` mematikannya) */
function tepiOf(o: SceneObject): boolean {
  return o.tepi !== false
}

function colorsOf(o: SceneObject) {
  // style tak dikenal TIDAK lagi diam-diam jadi kayu: magenta supaya terlihat
  if (typeof o.style === 'string') return MATERIALS[o.style] ?? UNKNOWN_STYLE
  return o.style
}

// Footprint setelah rotasi: rotasi 90/270 derajat menukar panjang <-> lebar.
export function footprintOf(o: SceneObject): { se: number; sw: number } {
  const rot = o.rot ?? 0
  return rot % 2 === 1
    ? { se: o.size.w, sw: o.size.e }
    : { se: o.size.e, sw: o.size.w }
}

// Balok iso prosedural — 6 WAJAH, dipilih lewat arah kamera.
// Versi lama hanya menggambar 3 wajah (kiri, kanan, atas) karena kamera selalu
// di YAW 0. Sejak ORBIT 15° (permintaan user 2026-10-29) kamera bisa berputar,
// jadi wajah yang terlihat dihitung: wajah tampak bila normalnya menghadap
// kamera. Urutan gambar antar-wajah memakai kedalaman layar (jauh dulu).
export function drawBox(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const { e, w, z } = o.pos
  const { se, sw } = footprintOf(o)
  const sz = o.size.z
  const c0 = colorsOf(o)
  // REFLEKSI objek = cermin: sisi kiri & kanan bertukar (arah cahaya terbalik)
  const c = o.refleksi ? { top: c0.top, left: c0.right, right: c0.left } : c0
  const g = tepiOf(o)
  const kam = arahKamera()

  /** titik sudut balok; bit 1 = e+, bit 2 = w+, bit 4 = z+ */
  const V = (i: number, zFrac = 1): P =>
    px(e + (i & 1 ? se : 0), w + (i & 2 ? sw : 0), z + (i & 4 ? sz * zFrac : 0))

  // [indeks sudut, normal e, normal w, normal z]
  const WAJAH: [number[], number, number, number][] = [
    [[1, 3, 7, 5], 1, 0, 0],    // +e
    [[0, 2, 6, 4], -1, 0, 0],   // -e
    [[2, 3, 7, 6], 0, 1, 0],    // +w
    [[0, 1, 5, 4], 0, -1, 0],   // -w
    [[4, 5, 7, 6], 0, 0, 1],    // atas
  ]
  const tampak = WAJAH.filter(([, ne, nw, nz]) =>
    ne * kam.e + nw * kam.w + nz * kam.z > 0.001)

  const kedalaman = (idx: number[]) => idx.reduce((t, i) => t + V(i).y, 0) / idx.length
  tampak.sort((a, b) => kedalaman(a[0]) - kedalaman(b[0]))

  for (const [idx, ne, nw, nz] of tampak) {
    poly(ctx, idx.map(i => V(i)), warnaWajah(c, ne, nw, nz), g)
  }

  if (!g) return

  // PITA NADA: 26% kaki tiap sisi tegak digelapkan (menghilangkan kesan
  // "kotak dicat rata"). Dipotong ke bentuk wajahnya masing-masing.
  if (sz > 0.02) {
    for (const [idx, ne, nw, nz] of tampak) {
      if (nz !== 0) continue
      poly(ctx, idx.map(i => V(i, 0.26)), gelapkan(warnaWajah(c, ne, nw, nz), 0.28), false)
    }

    // RIM TERANG di rusuk bidang atas yang menjauhi kamera
    const warna = terangkan(c.top)
    const rusuk: [number, number, number, number][] = [
      [4, 5, 0, -1], [4, 6, -1, 0], [5, 7, 0, 1], [6, 7, 1, 0],
    ]
    ctx.strokeStyle = warna
    ctx.lineWidth = TEBAL_TEPI
    ctx.lineJoin = 'round'
    for (const [a, b, ne, nw] of rusuk) {
      if (ne * kam.e + nw * kam.w > 0) continue
      ctx.beginPath()
      ctx.moveTo(Math.round(V(a).x), Math.round(V(a).y))
      ctx.lineTo(Math.round(V(b).x), Math.round(V(b).y))
      ctx.stroke()
    }
  }
}

/** warna satu wajah balok menurut arah normalnya (cahaya tetap di dunia) */
function warnaWajah(
  c: { top: string; left: string; right: string },
  ne: number, nw: number, nz: number,
): string {
  if (nz > 0.5) return c.top
  if (ne > 0.5) return c.right     // sisi +e = kena cahaya
  if (nw > 0.5) return c.left      // sisi +w = teduh
  // sisi belakang (-e / -w): lebih gelap lagi supaya bentuk tetap terbaca
  return gelapkan(c.left, 0.22)
}

// ---------------------------------------------------------------------------
// BENTUK SILINDER & KERUCUT (permintaan user 2026-10-29)
// Alas berbentuk elips di bidang e-w. Karena proyeksi isometrik, elips di
// dunia menjadi elips 2:1 di layar — titik-titiknya dihitung di dunia lalu
// diproyeksikan lewat px(), jadi hasilnya sama dengan renderer APK nanti
// (lihat docs/04-KONTRAK-RENDERER.md §4a).
// ---------------------------------------------------------------------------
const SEGMEN = 24

/** titik alas (z = pos.z) & titik atas (z + size.z) untuk silinder/kerucut */
function cincin(o: SceneObject) {
  const { e, w, z } = o.pos
  const { se, sw } = footprintOf(o)
  const ce = e + se / 2
  const cw = w + sw / 2
  const re = se / 2
  const rw = sw / 2
  const bawah: P[] = []
  const atas: P[] = []
  const sudut: number[] = []
  for (let i = 0; i < SEGMEN; i++) {
    const t = (i / SEGMEN) * Math.PI * 2
    const ee = ce + re * Math.cos(t)
    const ww = cw + rw * Math.sin(t)
    bawah.push(px(ee, ww, z))
    atas.push(px(ee, ww, z + o.size.z))
    sudut.push(t)
  }
  return { bawah, atas, sudut }
}

/** warna 3 tone yang sudah memperhitungkan `refleksi` */
function toneOf(o: SceneObject) {
  const c = colorsOf(o)
  return o.refleksi ? { top: c.top, left: c.right, right: c.left } : c
}

export function drawSilinder(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const { bawah, atas, sudut } = cincin(o)
  const c = toneOf(o)
  // segmen digambar dari belakang ke depan; warna dipilih dari arah KAMERA
  // (dulu memakai aturan tetap "+e & -w = kanan", yang hanya benar di YAW 0)
  const kam = arahKamera()
  const seg = sudut.map((t, i) => {
    const j = (i + 1) % SEGMEN
    const tengahY = (bawah[i].y + bawah[j].y + atas[i].y + atas[j].y) / 4
    const ne = (Math.cos(t) + Math.cos(sudut[j])) / 2
    const nw = (Math.sin(t) + Math.sin(sudut[j])) / 2
    const hadap = ne * kam.e + nw * kam.w
    return { i, j, tengahY, warna: hadap >= 0 ? c.right : c.left }
  }).sort((a, b) => a.tengahY - b.tengahY)
  const g = tepiOf(o)
  for (const s of seg) {
    poly(ctx, [bawah[s.i], bawah[s.j], atas[s.j], atas[s.i]], s.warna, false)
  }
  // tutup atas: elips penuh
  poly(ctx, atas, c.top, g)
  // sisi luar saja yang diberi garis: rusuk tegak tiap 6 segmen
  for (let i = 0; i < SEGMEN; i += 6) {
    ctx.strokeStyle = gelapkan(bawah[i] ? c.left : c.left)
    ctx.beginPath()
    ctx.moveTo(Math.round(atas[i].x), Math.round(atas[i].y))
    ctx.lineTo(Math.round(bawah[i].x), Math.round(bawah[i].y))
    ctx.stroke()
  }
}

export function drawKerucut(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const { e, w, z } = o.pos
  const { se, sw } = footprintOf(o)
  const { bawah, sudut } = cincin(o)
  const ce = e + se / 2
  const cw = w + sw / 2
  const re = se / 2
  const rw = sw / 2
  // `puncak` = perbandingan jari-jari atas (0 = runcing, 1 = silinder,
  // >1 = melebar ke atas seperti pot bunga)
  const rasio = Math.max(0, o.puncak ?? 0)
  const atas: P[] = rasio === 0
    ? sudut.map(() => px(ce, cw, z + o.size.z))
    : sudut.map(t => px(ce + re * rasio * Math.cos(t), cw + rw * rasio * Math.sin(t), z + o.size.z))
  const c = toneOf(o)
  const seg = sudut.map((t, i) => {
    const j = (i + 1) % SEGMEN
    const tengahY = (bawah[i].y + bawah[j].y + atas[i].y + atas[j].y) / 4
    const kanan = (Math.cos(t) + Math.cos(sudut[j])) - (Math.sin(t) + Math.sin(sudut[j]))
    return { i, j, tengahY, warna: kanan >= 0 ? c.right : c.left }
  }).sort((a, b) => a.tengahY - b.tengahY)
  const g = tepiOf(o)
  for (const s of seg) {
    poly(ctx, [bawah[s.i], bawah[s.j], atas[s.j], atas[s.i]], s.warna, false)
  }
  if (rasio > 0) poly(ctx, atas, c.top, g)
  ctx.strokeStyle = gelapkan(c.left)
  ctx.beginPath()
  for (let i = 0; i < SEGMEN; i += 6) {
    ctx.moveTo(Math.round(atas[i].x), Math.round(atas[i].y))
    ctx.lineTo(Math.round(bawah[i].x), Math.round(bawah[i].y))
  }
  ctx.stroke()
}

/**
 * BOLA (permintaan user 2026-10-29): bulatan untuk matahari di kaca jendela,
 * daun, atau bola lampu. Jari-jari dunia = min(size.e, size.w, size.z) / 2.
 * Di layar bola tampak hampir bulat (skala proyeksi isometrik ±1.31 × HW),
 * jadi digambar sebagai lingkaran bertone 3 lapis (gelap → dasar → sorot).
 */
export function drawBola(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const { e, w, z } = o.pos
  const { se, sw } = footprintOf(o)
  const r = Math.min(se, sw, o.size.z) / 2
  if (r <= 0) return
  const pusat = px(e + se / 2, w + sw / 2, z + o.size.z / 2)
  const HWpiksel = px(e + 1, w, z).x - px(e, w, z).x
  const R = r * HWpiksel * 1.31
  const c = toneOf(o)
  const bulat = (cx: number, cy: number, rad: number, warna: string) => {
    ctx.fillStyle = warna
    ctx.beginPath()
    ctx.arc(cx, cy, rad, 0, Math.PI * 2)
    ctx.fill()
  }
  bulat(pusat.x, pusat.y, R, c.right)                       // bayangan
  if (tepiOf(o)) {
    ctx.strokeStyle = gelapkan(c.right)
    ctx.lineWidth = TEBAL_TEPI
    ctx.beginPath()
    ctx.arc(Math.round(pusat.x), Math.round(pusat.y), Math.round(R), 0, Math.PI * 2)
    ctx.stroke()
  }
  bulat(pusat.x - R * 0.1, pusat.y - R * 0.1, R * 0.86, c.left)  // badan
  bulat(pusat.x - R * 0.3, pusat.y - R * 0.3, R * 0.5, c.top)    // sorot
}

/**
 * CAKRAM: bulatan DATAR yang menghadap ruangan (bidang e-z) — dipakai untuk
 * matahari di kaca jendela, jam dinding, atau hiasan bulat. Digambar dari 24
 * titik dunia lalu diproyeksikan, jadi bentuk elipsnya geometris benar.
 */
export function drawCakram(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const { e, w, z } = o.pos
  const { se, sw } = footprintOf(o)
  const ce = e + se / 2
  const cw = w + sw / 2
  const cz = z + o.size.z / 2
  const re = se / 2
  const rz = o.size.z / 2
  const c = toneOf(o)
  const titik = (re2: number, rz2: number, de = 0, dz = 0) => {
    const out: P[] = []
    for (let i = 0; i < SEGMEN; i++) {
      const t = (i / SEGMEN) * Math.PI * 2
      out.push(px(ce + de + re2 * Math.cos(t), cw, cz + dz + rz2 * Math.sin(t)))
    }
    return out
  }
  const g = tepiOf(o)
  poly(ctx, titik(re, rz), c.left, g)
  poly(ctx, titik(re * 0.82, rz * 0.82, -re * 0.08, rz * 0.1), c.top, false)
  poly(ctx, titik(re * 0.34, rz * 0.34, -re * 0.3, rz * 0.3), c.right, false)
}

/**
 * DAUN (permintaan user 2026-10-29): lonjong berujung runcing di bidang e-z.
 * size.e = panjang, size.z = lebar, `miring` = sudut sumbu (derajat, 90 tegak).
 * Rumus lebar: setengah-lebar = (size.z/2) · sin(πs)^0.75 · (1 − 0.35s),
 * jadi pangkal & ujung runcing, bagian tengah paling lebar.
 */
export function drawDaun(ctx: CanvasRenderingContext2D, o: SceneObject) {
  // ANCHOR = pangkal daun di pos (e, w, z); daun tumbuh sepanjang `miring`.
  const P0 = o.pos
  const L = o.size.e            // panjang daun
  const Wd = o.size.z           // lebar daun
  if (L <= 0 || Wd <= 0) return
  const t = ((o.miring ?? 90) * Math.PI) / 180
  const ct = Math.cos(t)
  const st = Math.sin(t)
  const N = 16
  const c = toneOf(o)
  const g = tepiOf(o)
  // titik(s, skala): s = 0..1 sepanjang daun, skala = pengali lebar
  const titik = (s: number, skala: number): P => {
    const along = s * L
    const lebar = (Wd / 2) * Math.pow(Math.sin(Math.PI * s), 0.75) * (1 - 0.35 * s) * skala
    return px(P0.e + along * ct - lebar * st, P0.w + lebar * ct, P0.z + along * st)
  }
  const badan = (skala: number): P[] => {
    const kiri: P[] = []
    const kanan: P[] = []
    for (let i = 0; i <= N; i++) {
      const s = i / N
      kiri.push(titik(s, +1 * skala))
      kanan.push(titik(s, -1 * skala))
    }
    return [...kiri, ...kanan.reverse()]
  }
  poly(ctx, badan(1), c.left, g)
  // sorotan: bagian tengah daun lebih terang, digeser sedikit ke arah cahaya
  poly(ctx, badan(0.5).map(q => ({ x: q.x - 1, y: q.y - 1 })), c.top, false)
}

// ---------------------------------------------------------------------------
// ANIMASI (permintaan user 2026-10-29)
// Transform hanya saat MENGGAMBAR: ctx.save/translate/rotate/restore. Data
// scene tidak diubah, jadi hit-test, bbox, kunci, dan JSON tetap sama.
// ---------------------------------------------------------------------------
const sekarang = () => (typeof performance !== 'undefined' ? performance.now() : Date.now())

type StatusAnim = 'tidak' | 'geser' | 'lewat'

function terapkanAnim(ctx: CanvasRenderingContext2D, o: SceneObject): StatusAnim {
  const a = o.anim
  if (!a) return 'tidak'
  const { se, sw } = footprintOf(o)
  const dasar = px(o.pos.e + se / 2, o.pos.w + sw / 2, o.pos.z)
  const laju = a.laju ?? 0.5
  const besar = a.besar ?? 1
  const fase = (a.fase ?? 0) * Math.PI * 2
  const s = Math.sin((sekarang() / 1000) * laju * Math.PI * 2 + fase)
  if (a.jenis === 'kedip') {
    // 30% siklus mati -> terlihat berkedip; crispify membuat tepinya tegas
    if (s < -0.55) return 'lewat'
  }
  ctx.save()
  if (a.jenis === 'naik-turun') {
    ctx.translate(0, -besar * 4 * DENS * (0.5 + 0.5 * s))
  } else if (a.jenis === 'ayun') {
    ctx.translate(dasar.x, dasar.y)
    ctx.rotate(((besar * 3.5 * Math.PI) / 180) * s)
    ctx.translate(-dasar.x, -dasar.y)
  } else if (a.jenis === 'denyut') {
    const k = 1 + besar * 0.05 * s
    ctx.translate(dasar.x, dasar.y)
    ctx.scale(k, k)
    ctx.translate(-dasar.x, -dasar.y)
  } else if (a.jenis === 'putar') {
    ctx.translate(dasar.x, dasar.y)
    ctx.rotate(((besar * 8 * Math.PI) / 180) * s)
    ctx.translate(-dasar.x, -dasar.y)
  }
  return 'geser'
}

/** penggambar objek: pilih bentuk sesuai field `bentuk` */

// ---------------------------------------------------------------------------
// BENTUK "PROFIL" — siluet bebas yang dijembatani (extrude) selebar size.w.
// Permintaan user 2026-10-29: "kenapa masih terlihat kotak-kotak". Balok hanya
// bisa kotak; dengan profil, sandaran kursi bisa membulat, kap lampu bisa
// melengkung, dan tepi meja bisa tumpul — tanpa kehilangan sifat parametrik
// (semua tetap satu objek dengan pos/size/warna yang bisa diedit).
// ---------------------------------------------------------------------------
function drawProfil(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const titik = o.profil
  if (!titik || titik.length < 3) {
    drawBox(ctx, o)
    return
  }
  const { se, sw } = footprintOf(o)
  const { e, w, z } = o.pos
  const c0 = colorsOf(o)
  const c = o.refleksi ? { top: c0.top, left: c0.right, right: c0.left } : c0
  const g = tepiOf(o)
  const wDpn = w + sw        // sisi dekat kamera
  const wBlk = w             // sisi jauh
  const P = (u: number, zz: number, ww: number) => px(e + u * se, ww, z + zz * o.size.z)
  const dpn = titik.map(([u, zz]) => P(u, zz, wDpn))
  const blk = titik.map(([u, zz]) => P(u, zz, wBlk))

  // 1) sisi jauh (gelap) supaya tidak ada lubang di tepi
  poly(ctx, blk, gelapkan(c.left, 0.35), false)

  // 2) sisi jembatan: tiap sisi siluet yang menghadap kamera (+e / +z)
  const n = titik.length
  let luas = 0
  for (let i = 0; i < n; i++) {
    const [ua, za] = titik[i]
    const [ub, zb] = titik[(i + 1) % n]
    luas += ua * zb - ub * za
  }
  const arah = luas > 0 ? 1 : -1      // pastikan normal menghadap keluar
  for (let i = 0; i < n; i++) {
    const [ua, za] = titik[i]
    const [ub, zb] = titik[(i + 1) % n]
    const du = ub - ua
    const dz = zb - za
    if (Math.abs(du) < 1e-6 && Math.abs(dz) < 1e-6) continue
    // normal luar bidang e-z
    const ne = dz * arah
    const nz = -du * arah
    const dilihat = ne * 0.707 + nz * 0.707      // kamera dari +e dan +z
    if (dilihat <= 0.02) continue
    const warna = Math.abs(nz) >= Math.abs(ne) ? c.top : c.right
    poly(ctx, [dpn[i], dpn[(i + 1) % n], blk[(i + 1) % n], blk[i]], warna, g)
  }

  // 3) muka depan
  poly(ctx, dpn, c.left, g)
}

export function drawObject(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const status = terapkanAnim(ctx, o)
  if (status === 'lewat') return
  if (o.sprite && spriteSiap(o.sprite)) drawSprite(ctx, o)
  else if (o.bentuk === 'silinder') drawSilinder(ctx, o)
  else if (o.bentuk === 'kerucut') drawKerucut(ctx, o)
  else if (o.bentuk === 'bola') drawBola(ctx, o)
  else if (o.bentuk === 'cakram') drawCakram(ctx, o)
  else if (o.bentuk === 'daun') drawDaun(ctx, o)
  else if (o.bentuk === 'profil') drawProfil(ctx, o)
  else drawBox(ctx, o)
  if (status === 'geser') ctx.restore()
}

export function bboxOf(o: SceneObject): Box {
  const { e, w, z } = o.pos
  const { se, sw } = footprintOf(o)
  const pts = [
    px(e, w, z + o.size.z), px(e + se, w, z + o.size.z),
    px(e + se, w + sw, z + o.size.z), px(e, w + sw, z + o.size.z),
    px(e + se, w, z), px(e + se, w + sw, z), px(e, w + sw, z),
  ]
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

// Kedalaman gambar: yang lebih dekat ke kamera (S) digambar terakhir
export function depthOf(o: SceneObject): number {
  const { se, sw } = footprintOf(o)
  return o.pos.e + se / 2 + o.pos.w + sw / 2
}

/**
 * Urutan gambar: `urutan` eksplisit (dari tombol NAIKKAN / TURUNKAN) menang;
 * yang belum punya `urutan` tetap memakai kedalaman isometrik. Nilai eksplisit
 * selalu dianggap di atas nilai otomatis, supaya objek baru (urutan terbesar)
 * benar-benar menimpa objek lama.
 */
export function sortedObjects(objects: SceneObject[]): SceneObject[] {
  return [...objects].sort((a, b) => {
    const ua = a.urutan
    const ub = b.urutan
    if (ua !== undefined && ub !== undefined) {
      if (ua !== ub) return ua - ub
      return depthOf(a) - depthOf(b)
    }
    if (ua !== undefined) return 1
    if (ub !== undefined) return -1
    return depthOf(a) - depthOf(b)
  })
}
