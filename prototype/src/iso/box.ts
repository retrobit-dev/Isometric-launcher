import { DENS, HW, ZH, arahKamera, px, type P } from './space'
import { MATERIALS, UNKNOWN_STYLE } from './palette'
import { drawLangit, setDetik, type Bidang } from './langit'
import type { SceneObject } from '../scene/types'

import { gelap as gelapPalet, kePalet, terang as terangPalet, warna } from './palet-referensi'

export interface Box { x0: number; y0: number; x1: number; y1: number }

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

// Permintaan user (2026-10-29): "jangan berikan outline untuk objek".
// GARIS_TEPI = false -> TIDAK ADA stroke sama sekali pada objek: warna bidang
// polos, hanya dibedakan oleh tangga nada (pita nada) antar wajah.
// Field lama `tepi: true` di scene/preset diabaikan (tidak perlu migrasi data).
const GARIS_TEPI = false

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
  if (!garis || !GARIS_TEPI) return
  ctx.strokeStyle = gelapkan(color)
  ctx.lineWidth = TEBAL_TEPI
  ctx.lineJoin = 'round'
  ctx.stroke()
}

/** garis tepi objek — MATI total sejak permintaan "jangan berikan outline" */
function tepiOf(o: SceneObject): boolean {
  return GARIS_TEPI && o.tepi !== false
}

function colorsOf(o: SceneObject) {
  // style tak dikenal TIDAK lagi diam-diam jadi kayu: magenta supaya terlihat
  if (typeof o.style === 'string') return MATERIALS[o.style] ?? UNKNOWN_STYLE
  return o.style
}

/**
 * ROTASI OBJEK 2026-10-29 — kelipatan 30° (permintaan user).
 * `sudutObjek()` mengembalikan sudut dalam RADIAN.
 */
export function sudutObjek(o: SceneObject): number {
  const deg = o.rotasi ?? 0
  return ((deg % 360) * Math.PI) / 180
}

/** 4 sudut alas objek di ruang dunia SETELAH rotasi (urut: -e-w, +e-w, +e+w, -e+w) */
export function alasDunia(o: SceneObject): { e: number; w: number }[] {
  const he = o.size.e / 2
  const hw = o.size.w / 2
  const ce = o.pos.e + he
  const cw = o.pos.w + hw
  const th = sudutObjek(o)
  const co = Math.cos(th)
  const si = Math.sin(th)
  return ([[-he, -hw], [he, -hw], [he, hw], [-he, hw]] as [number, number][])
    .map(([de, dw]) => ({ e: ce + de * co - dw * si, w: cw + de * si + dw * co }))
}

/** ukuran footprint setelah rotasi (untuk kedalaman & bbox) */
export function sebaranFootprint(o: SceneObject): { se: number; sw: number } {
  const th = sudutObjek(o)
  const co = Math.abs(Math.cos(th))
  const si = Math.abs(Math.sin(th))
  return {
    se: o.size.e * co + o.size.w * si,
    sw: o.size.e * si + o.size.w * co,
  }
}

/** true kalau rotasi masih kelipatan 90° (footprint tidak bertukar) */
export function rotasiSegi90(o: SceneObject): boolean {
  return (o.rotasi ?? 0) % 90 === 0
}

// Footprint kasar untuk bentuk bulat: rotasi 90/270 menukar
// panjang <-> lebar. Untuk sudut lain dipakai ukuran asli (bentuk bulat tidak
// berubah oleh rotasi).
export function footprintOf(o: SceneObject): { se: number; sw: number } {
  return (o.rotasi ?? 0) % 180 === 90
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
  const sz = o.size.z
  const c0 = colorsOf(o)
  // REFLEKSI objek = cermin: sisi kiri & kanan bertukar (arah cahaya terbalik)
  const c = o.refleksi ? { top: c0.top, left: c0.right, right: c0.left } : c0
  const g = tepiOf(o)
  const kam = arahKamera()

  // --- footprint yang SUDAH DIPUTAR (kelipatan 30°) -----------------------
  // Pusat footprint tidak berubah oleh rotasi; keempat sudutnya dihitung di
  // ruang dunia lalu diproyeksikan, jadi balok tetap benar di sudut kamera
  // mana pun DAN di rotasi objek mana pun.
  const th = sudutObjek(o)
  const co = Math.cos(th)
  const si = Math.sin(th)
  // sudut alas (-e-w, +e-w, +e+w, -e+w) sudah diputar di ruang dunia
  const alas = alasDunia(o)

  /** titik sudut; 0-3 alas, 4-7 atas (pasangan sama), zFrac memotong tinggi */
  const V = (i: number, zFrac = 1): P => {
    const t = alas[i & 3]
    return px(t.e, t.w, z + (i >= 4 ? sz * zFrac : 0))
  }

  // Normal tiap sisi (lokal) diputar bersama objeknya.
  const NORMAL: [number, number][] = [[0, -1], [1, 0], [0, 1], [-1, 0]]
  const normalDunia = NORMAL.map(([de, dw]) => ({
    e: de * co - dw * si,
    w: de * si + dw * co,
  }))

  // sisi ke-k memakai sudut k, k+1 (alas & atas); atap memakai 4..7
  type Wajah = { idx: number[]; ne: number; nw: number; nz: number }
  const wajah: Wajah[] = [0, 1, 2, 3].map(k => ({
    idx: [k, (k + 1) % 4, 4 + ((k + 1) % 4), 4 + k],
    ne: normalDunia[k].e,
    nw: normalDunia[k].w,
    nz: 0,
  }))
  wajah.push({ idx: [4, 5, 6, 7], ne: 0, nw: 0, nz: 1 })

  const tampak = wajah.filter(f => f.ne * kam.e + f.nw * kam.w + f.nz * kam.z > 0.001)
  const kedalaman = (idx: number[]) => idx.reduce((t, i) => t + V(i).y, 0) / idx.length
  tampak.sort((a, b) => kedalaman(a.idx) - kedalaman(b.idx))

  for (const f of tampak) {
    poly(ctx, f.idx.map(i => V(i)), warnaWajah(c, f.ne, f.nw, f.nz), g)
  }

  // PITA NADA: 26% kaki tiap sisi tegak digelapkan (menghilangkan kesan
  // "kotak dicat rata"). Ini SHADING, bukan outline -> tetap digambar walau
  // garis tepi dimatikan.
  if (sz > 0.02) {
    for (const f of tampak) {
      if (f.nz !== 0) continue
      poly(ctx, f.idx.map(i => V(i, 0.26)), gelapkan(warnaWajah(c, f.ne, f.nw, f.nz), 0.28), false)
    }

    // RIM TERANG di rusuk bidang atas yang menjauhi kamera (garis -> hanya
    // bila GARIS_TEPI hidup)
    if (g) {
    const warna = terangkan(c.top)
    ctx.strokeStyle = warna
    ctx.lineWidth = TEBAL_TEPI
    ctx.lineJoin = 'round'
    for (let k = 0; k < 4; k++) {
      const n = normalDunia[k]
      if (n.e * kam.e + n.w * kam.w > 0) continue   // sisi ini menghadap kamera
      const a = 4 + k
      const b = 4 + ((k + 1) % 4)
      ctx.beginPath()
      ctx.moveTo(Math.round(V(a).x), Math.round(V(a).y))
      ctx.lineTo(Math.round(V(b).x), Math.round(V(b).y))
      ctx.stroke()
    }
    }
  }
}

/** warna satu wajah balok menurut arah normalnya (cahaya tetap di dunia) */
function warnaWajah(
  c: { top: string; left: string; right: string },
  ne: number, nw: number, nz: number,
): string {
  if (nz > 0.5) return c.top
  // Rotasi objek 30° membuat normal tidak lagi 0/1, jadi wajah dipilih dari
  // komponen yang DOMINAN (bukan ambang 0.5 yang hanya benar untuk 90°).
  if (Math.abs(ne) >= Math.abs(nw)) return ne > 0 ? c.right : gelapkan(c.left, 0.22)
  return nw > 0 ? c.left : gelapkan(c.left, 0.22)
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
  if (g) for (let i = 0; i < SEGMEN; i += 6) {
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
  if (g) {
    ctx.strokeStyle = gelapkan(c.left)
    ctx.beginPath()
    for (let i = 0; i < SEGMEN; i += 6) {
      ctx.moveTo(Math.round(atas[i].x), Math.round(atas[i].y))
      ctx.lineTo(Math.round(bawah[i].x), Math.round(bawah[i].y))
    }
    ctx.stroke()
  }
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
  // KEBULATAN (`bulat` 0..1): 0 = meruncing di kedua ujung (bawaan), 1 = elips
  // membulat. Hanya mengubah bentuk siluet, bukan ukuran/posisi di data scene.
  const bulat = Math.min(1, Math.max(0, o.bulat ?? 0))
  // titik(s, skala): s = 0..1 sepanjang daun, skala = pengali lebar.
  // Dua siluet dicampur menurut `bulat`:
  //   meruncing : sin(pi·s)^0.75 · (1 − 0.35·s)  -> ujung tirus seperti rumput
  //   membulat  : akar(1 − (2s−1)²)              -> ELIPS, ujung tumpul
  const titik = (s: number, skala: number): P => {
    const along = s * L
    const runcing = Math.pow(Math.sin(Math.PI * s), 0.75) * (1 - 0.35 * s)
    const elips = Math.sqrt(Math.max(0, 1 - (2 * s - 1) * (2 * s - 1)))
    const lebar = (Wd / 2) * ((1 - bulat) * runcing + bulat * elips) * skala
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

/** opasitas objek (0.05..1). Tidak diisi = 1 (pekat). */
export function opasitasOf(o: SceneObject): number {
  const v = o.opasitas
  if (typeof v !== 'number' || !Number.isFinite(v)) return 1
  return Math.min(1, Math.max(0.05, v))
}

/**
 * BIDANG KACA — empat sudut muka kaca yang menghadap kamera.
 * Dipakai objek ber-`langit: true` (kaca jendela) untuk menggambar langit
 * dinamis. Sisi dipilih dari arah kamera supaya kaca tetap benar walau kamera
 * diorbit; urutan sudut selalu kiri -> kanan agar u = 0 di kiri.
 */
export function bidangKaca(o: SceneObject): Bidang | null {
  const { e, w, z } = o.pos
  const { se, sw } = footprintOf(o)
  const kam = arahKamera()
  const z0 = z
  const z1 = z + o.size.z
  let a: P, b: P
  if (Math.abs(kam.w) >= Math.abs(kam.e)) {
    // muka tegak lurus sumbu w
    const ww = kam.w >= 0 ? w + sw : w
    a = px(e, ww, z0); b = px(e + se, ww, z0)
  } else {
    // muka tegak lurus sumbu e (bentang sepanjang w)
    const ee = kam.e >= 0 ? e + se : e
    a = px(ee, w, z0); b = px(ee, w + sw, z0)
  }
  if (a.x > b.x) { const t = a; a = b; b = t }
  const atasKiri = { x: a.x, y: a.y - o.size.z * ZH }
  const atasKanan = { x: b.x, y: b.y - o.size.z * ZH }
  if (o.size.z <= 0 || Math.abs(b.x - a.x) < 1) return null
  void z1
  return { atasKiri, atasKanan, bawahKanan: b, bawahKiri: a }
}

/** gambar langit dinamis di bidang kaca (menggantikan warna biru statis) */
function drawKacaLangit(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const bidang = bidangKaca(o)
  if (!bidang) { drawBox(ctx, o); return }
  setDetik(sekarang() / 1000)
  drawLangit(ctx, bidang)
}

export function drawObject(ctx: CanvasRenderingContext2D, o: SceneObject) {
  const status = terapkanAnim(ctx, o)
  if (status === 'lewat') return
  // TRANSPARANSI: hanya mengubah cara menggambar, data objek tetap utuh
  const alphaAwal = ctx.globalAlpha
  const op = opasitasOf(o)
  if (op < 0.999) ctx.globalAlpha = alphaAwal * op
  if (o.langit) drawKacaLangit(ctx, o)
  else if (o.bentuk === 'silinder') drawSilinder(ctx, o)
  else if (o.bentuk === 'kerucut') drawKerucut(ctx, o)
  else if (o.bentuk === 'bola') drawBola(ctx, o)
  else if (o.bentuk === 'cakram') drawCakram(ctx, o)
  else if (o.bentuk === 'daun') drawDaun(ctx, o)
  else if (o.bentuk === 'profil') drawProfil(ctx, o)
  else drawBox(ctx, o)
  ctx.globalAlpha = alphaAwal
  if (status === 'geser') ctx.restore()
}

export function bboxOf(o: SceneObject): Box {
  // 8 titik sudut dari alas YANG SUDAH DIPUTAR — supaya garis seleksi &
  // hit-test tetap pas pada rotasi 30° (dulu memakai kotak sejajar sumbu).
  const alas = alasDunia(o)
  const zAtas = o.pos.z + o.size.z
  const pts = alas.flatMap(t => [px(t.e, t.w, zAtas), px(t.e, t.w, o.pos.z)])
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}

// Kedalaman gambar: yang lebih dekat ke kamera (S) digambar terakhir
export function depthOf(o: SceneObject): number {
  const { se, sw } = sebaranFootprint(o)
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
