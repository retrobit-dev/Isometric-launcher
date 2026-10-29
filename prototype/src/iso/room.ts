import { CAM, CY, DENS, EXT_E, EXT_W, HH, IH, IW, ROOM, ROOM_VISIBLE, TILE_W, ZH, dindingTersembunyi, px, type P } from './space'
import { PAL, floorMat, gelapkanWarna, isTudor, wallColors } from './palette'
import { drawObject, footprintOf, sortedObjects } from './box'
import { polaBayang, polaDither } from './dither'
import { gelap } from './palet-referensi'
import type { SceneObject } from '../scene/types'

function pathOf(ctx: CanvasRenderingContext2D, pts: P[]) {
  ctx.beginPath()
  pts.forEach((p, i) => {
    const x = Math.round(p.x)
    const y = Math.round(p.y)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.closePath()
}

function poly(
  ctx: CanvasRenderingContext2D, pts: P[], color: string | CanvasGradient | CanvasPattern,
) {
  ctx.fillStyle = color
  pathOf(ctx, pts)
  ctx.fill()
}

function line(ctx: CanvasRenderingContext2D, a: P, b: P, color: string, dash?: number[]) {
  ctx.strokeStyle = color
  ctx.lineWidth = 1
  ctx.setLineDash(dash ?? [])
  ctx.beginPath()
  ctx.moveTo(Math.round(a.x) + 0.5, Math.round(a.y) + 0.5)
  ctx.lineTo(Math.round(b.x) + 0.5, Math.round(b.y) + 0.5)
  ctx.stroke()
  ctx.setLineDash([])
}

// Buang anti-aliasing tepi: pixel-art tetap kotak & tajam
function crispify(ctx: CanvasRenderingContext2D) {
  const img = ctx.getImageData(0, 0, IW, IH)
  const d = img.data
  for (let i = 3; i < d.length; i += 4) d[i] = d[i] > 127 ? 255 : 0
  ctx.putImageData(img, 0, 0)
}

const DADO_Z = 0.18  // plint kayu tipis di dasar dinding (referensi ~6px @640)

// Dinding & lantai DIGAMBAR melewati batas ruangan (EXT_E / EXT_W) supaya area
// kosong hanya tersisa kecil di sudut kiri bawah pada komposisi terkunci.
// Ruangan SEBENARNYA tetap ROOM.E x ROOM.W untuk objek, grid, dan zona.
function walls(ctx: CanvasRenderingContext2D) {
  const E = ROOM.E + EXT_E
  const W = ROOM.W + EXT_W
  const { WALL_Z } = ROOM
  // Dinding digambar sampai melewati tepi atas layar pada zoom/pan apa pun,
  // sehingga tidak ada ruang kosong di atas (permintaan user).
  // Tinggi fungsional untuk objek tetap WALL_Z; sisanya hanya visual.
  const zTop = Math.max(
    WALL_Z,
    Math.ceil((CY + (Math.max(E, W) - CAM.CE - CAM.CW) * HH) / ZH) + 1,
  )
  const T = 0.4 // (tidak dipakai: volume balok dibatalkan user) — disimpan utk referensi
  void T

  // sisi dalam dinding (bidang utama ruangan) — tanpa volume balok
  poly(ctx, [px(0, 0, zTop), px(0, W, zTop), px(0, W, 0), px(0, 0, 0)], PAL.wallB)
  poly(ctx, [px(0, 0, DADO_Z), px(0, W, DADO_Z), px(0, W, 0), px(0, 0, 0)], PAL.trimB)
  poly(ctx, [px(0, 0, zTop), px(E, 0, zTop), px(E, 0, 0), px(0, 0, 0)], PAL.wallT)
  poly(ctx, [px(0, 0, DADO_Z), px(E, 0, DADO_Z), px(E, 0, 0), px(0, 0, 0)], PAL.trimT)

  // ---- DITHER KAKI DINDING (ronde 38: ciri retro = pola kotak) ----
  // Peralihan dinding -> lantai TIDAK lagi garis rata: dibuat TIGA pita pola
  // Bayer 4x4 yang makin rapat ke bawah (bayangan ambient). Warna bayangan
  // diambil dari tangga nada palet (`gelapkanWarna`), jadi tetap 32 warna.
  const kakiDinding = (sumbu: 'w' | 'e', panjang: number, dasar: string) => {
    const teduh = gelap(dasar, 1)   // cukup 1 langkah lebih gelap
    const pita: [number, number, number][] = [
      [DADO_Z + 0.55, DADO_Z + 1.05, 0.14],
      [DADO_Z + 0.22, DADO_Z + 0.55, 0.26],
      [DADO_Z, DADO_Z + 0.22, 0.44],
    ]
    for (const [z0, z1, kuat] of pita) {
      const pts = sumbu === 'w'
        ? [px(0, 0, z1), px(0, panjang, z1), px(0, panjang, z0), px(0, 0, z0)]
        : [px(0, 0, z1), px(panjang, 0, z1), px(panjang, 0, z0), px(0, 0, z0)]
      poly(ctx, pts, polaBayang(ctx, teduh, kuat))
    }
  }
  kakiDinding('w', W, PAL.wallB)
  kakiDinding('e', E, PAL.wallT)

  line(ctx, px(0, 0, 0), px(0, 0, zTop), PAL.seam)
}

function floor(ctx: CanvasRenderingContext2D) {
  const E = ROOM.E + EXT_E
  const W = ROOM.W + EXT_W
  const tones = [PAL.floorBase, PAL.floorAlt, PAL.floorC]
  // Ubin PERSEGI 1x1 tile (gambar referensi: ubin persegi, bukan papan
  // selang-seling). Tiap ubin diberi tone halus agar lantai tidak datar.
  for (let w = 0; w < W; w++) {
    for (let e = 0; e < E; e++) {
      poly(ctx, [px(e, w), px(e + 1, w), px(e + 1, w + 1), px(e, w + 1)],
        tones[(e * 7 + w * 13) % 3])
    }
  }
  // nat: garis tipis setiap 1 tile ke dua arah (kisi diamond)
  for (let w = 0; w <= W; w++) line(ctx, px(0, w), px(E, w), PAL.grout)
  for (let e = 0; e <= E; e++) line(ctx, px(e, 0), px(e, W), PAL.grout)

  // ---- DITHER BAYANGAN LANTAI di kaki dua dinding (ronde 38) ----
  // Tiga pita pola kotak: makin dekat dinding makin rapat. Hasilnya bayangan
  // bertangga khas game 16-bit, bukan gradasi halus.
  const AO = Math.min(2.0, E * 0.2, W * 0.2)
  if (AO > 0.2) {
    const pita: [number, number][] = [
      [AO * 0.33, 0.62], [AO * 0.66, 0.36], [AO, 0.16],
    ]
    for (const [d, kuat] of pita) {
      const luar = Math.max(0, d - AO * 0.33)
      poly(ctx, [px(0, 0), px(luar, 0), px(luar, W, 0), px(0, W, 0)],
        polaBayang(ctx, PAL.grout, kuat))
      poly(ctx, [px(0, 0), px(E, 0), px(E, luar, 0), px(0, luar, 0)],
        polaBayang(ctx, PAL.grout, kuat))
    }
  }
  // slab alas tipis (volume balok dibatalkan user)
  const SK = 10
  const bL = px(0, W), sL = px(E, W), tR = px(E, 0)
  poly(ctx, [bL, sL, { x: sL.x, y: sL.y + SK }, { x: bL.x, y: bL.y + SK }], PAL.skirtL)
  poly(ctx, [tR, sL, { x: sL.x, y: sL.y + SK }, { x: tR.x, y: tR.y + SK }], PAL.skirtR)
}

function overlays(ctx: CanvasRenderingContext2D, grid: boolean, edit: boolean) {
  const { E, W } = ROOM
  if (grid) {
    for (let e = 0; e <= E; e++) line(ctx, px(e, 0), px(e, W), PAL.grid)
    for (let w = 0; w <= W; w++) line(ctx, px(0, w), px(E, w), PAL.grid)
    ctx.font = '7px monospace'
    ctx.fillStyle = PAL.hud
    const onScreen = (p: P) => p.x > -20 && p.x < IW + 20 && p.y > -10 && p.y < IH + 10
    ctx.textAlign = 'left'
    for (let e = 1; e <= E; e += 1) {
      const p = px(e, 0)
      if (onScreen(p)) ctx.fillText(String(e), p.x + 3, p.y + 9)
    }
    ctx.textAlign = 'right'
    for (let w = 1; w <= W; w += 1) {
      const p = px(0, w)
      if (onScreen(p)) ctx.fillText(String(w), p.x - 3, p.y + 9)
    }
    ctx.textAlign = 'center'
    ctx.fillText('DT', px(6, 0, 3.2).x, px(6, 0, 3.2).y)
    ctx.fillText('DB', px(0, 6, 3.2).x, px(0, 6, 3.2).y)
  }
  if (edit) {
    // batas zona: strip 1.5 tile menempel dinding = zona objek dinding/dekor
    // (docs/03 §3); objek interaktif/app hidup di t >= 1.5
    line(ctx, px(1.5, 0), px(1.5, W), PAL.zone, [3, 3])
    line(ctx, px(0, 1.5), px(E, 1.5), PAL.zone, [3, 3])
    // batas ruangan SEBENARNYA (di luar ini hanya perpanjangan visual)
    line(ctx, px(E, 0), px(E, W), PAL.zone, [2, 4])
    line(ctx, px(0, W), px(E, W), PAL.zone, [2, 4])
  }
}

export interface DrawOpts {
  grid: boolean
  edit: boolean
  objects: SceneObject[]
  selectedId: string | null
  /** id tambahan yang ikut tersorot (anggota grup dari objek terpilih) */
  highlightIds?: string[]
  /**
   * GAMBAR LATAR (background kanvas) — permintaan user 2026-10-29.
   * Digambar paling bawah (di atas warna void), sebelum semua objek.
   */
  latarGambar?: CanvasImageSource | null
  /** 'isi' = memenuhi kanvas (crop, bawaan) · 'muat' = utuh di tengah */
  latarMode?: 'isi' | 'muat'
}

// Objek ber-role 'lantai': digambar sebagai bidang lantai datar (bukan balok).
// Luas = (pos.e .. pos.e+size.e, pos.w .. pos.w+size.w), tinggi = pos.z.
// Palet & pola diambil dari field `style` lewat FLOOR_MATERIALS:
//   'lantai-kayu'        -> papan kayu 2x1 selang-seling (running bond)
//   'lantai-kayu-terang' -> idem, nada terang
//   'lantai-kayu-gelap'  -> idem, nada gelap
//   'lantai-ubin'        -> ubin persegi 1x1
function drawFloorObjects(ctx: CanvasRenderingContext2D, objects: SceneObject[]) {
  for (const o of objects) {
    if (o.role !== 'lantai') continue
    const mat = floorMat(o.style)
    const e0 = o.pos.e, e1 = o.pos.e + o.size.e
    const w0 = o.pos.w, w1 = o.pos.w + o.size.w
    const z = o.pos.z
    if (e1 <= e0 || w1 <= w0) continue

    const piece = (a: number, b: number, c: number, d: number, tone: string) =>
      poly(ctx, [px(a, c, z), px(b, c, z), px(b, d, z), px(a, d, z)], tone)

    if (mat.pattern === 'papan') {
      // PAPAN KAYU PANJANG (default 4x1 tile) dengan sambungan digeser
      // setengah papan tiap baris -> kesan lantai kayu, bukan bata.
      // `polaRot: 1` memutar arah papan 90 derajat (permintaan user
      // 2026-10-28): papan membentang sepanjang sumbu w, dan barisannya
      // menumpuk sepanjang sumbu e. Nat, serat kayu, dan sambungan ujung
      // ikut berputar karena semua koordinat dipetakan lewat `at()`.
      const L = Math.max(2, Math.round(mat.plank ?? 4))
      const stagger = Math.round(L / 2)
      const rot90 = o.polaRot === 1
      // r = sumbu baris (tepi pendek papan), p = sumbu panjang papan
      const R0 = rot90 ? e0 : w0
      const R1 = rot90 ? e1 : w1
      const P0 = rot90 ? w0 : e0
      const P1 = rot90 ? w1 : e1
      const at = (r: number, p: number) => (rot90 ? px(r, p, z) : px(p, r, z))
      const quad = (pA: number, pB: number, rA: number, rB: number, tone: string) =>
        poly(ctx, [at(rA, pA), at(rA, pB), at(rB, pB), at(rB, pA)], tone)

      for (let rr = Math.floor(R0); rr < Math.ceil(R1); rr++) {
        const rA = Math.max(rr, R0), rB = Math.min(rr + 1, R1)
        if (rB <= rA) continue
        const off = ((rr % 2) + 2) % 2 === 0 ? 0 : stagger
        const first = Math.floor((P0 - off) / L) * L + off
        for (let p0 = first; p0 < P1; p0 += L) {
          const pA = Math.max(p0, P0), pB = Math.min(p0 + L, P1)
          if (pB <= pA) continue
          const toneIdx = (Math.abs(Math.round(p0 / L)) * 5 + rr * 3) % 3
          quad(pA, pB, rA, rB, mat.tones[toneIdx])

          // SERAT KAYU: satu garis tipis searah panjang papan
          if (mat.grain && (rr * 7 + toneIdx * 5 + Math.round(pA)) % 3 !== 0) {
            const h = rB - rA
            const g1 = rA + h * (0.42 + ((rr * 5 + toneIdx) % 3) * 0.12)
            line(ctx, at(g1, pA), at(g1, pB), mat.grain)
          }
        }
      }
      // nat TIPIS hanya di batas baris papan
      for (let rr = Math.ceil(R0); rr < R1; rr++) line(ctx, at(rr, P0), at(rr, P1), mat.grout)
      line(ctx, at(R1, P0), at(R1, P1), mat.grout)
      line(ctx, at(R0, P0), at(R0, P1), mat.grout)
      // sambungan ujung papan (ikut pergeseran baris)
      for (let rr = Math.floor(R0); rr < Math.ceil(R1); rr++) {
        const rA = Math.max(rr, R0), rB = Math.min(rr + 1, R1)
        if (rB <= rA) continue
        const off = ((rr % 2) + 2) % 2 === 0 ? 0 : stagger
        const first = Math.floor((P0 - off) / L) * L + off
        for (let pp = first + L; pp < P1; pp += L) {
          if (pp <= P0) continue
          line(ctx, at(rA, pp), at(rB, pp), mat.grout)
        }
      }
    } else {
      // UBIN PERSEGI 1x1 tile
      for (let wr = Math.floor(w0); wr < Math.ceil(w1); wr++) {
        for (let ee = Math.floor(e0); ee < Math.ceil(e1); ee++) {
          const a = Math.max(ee, e0), b = Math.min(ee + 1, e1)
          const c = Math.max(wr, w0), d = Math.min(wr + 1, w1)
          if (b <= a || d <= c) continue
          piece(a, b, c, d, mat.tones[(ee * 7 + wr * 13) % 3])
        }
      }
      for (let ww = Math.ceil(w0); ww < w1; ww++) line(ctx, px(e0, ww, z), px(e1, ww, z), mat.grout)
      line(ctx, px(e0, w1, z), px(e1, w1, z), mat.grout)
      line(ctx, px(e0, w0, z), px(e1, w0, z), mat.grout)
      for (let ee = Math.ceil(e0); ee < e1; ee++) line(ctx, px(ee, w0, z), px(ee, w1, z), mat.grout)
      line(ctx, px(e1, w0, z), px(e1, w1, z), mat.grout)
    }

    // ---- BAYANGAN AMBIENT di kaki dinding (dua tepi belakang lantai) ----
    // Gambar referensi menggelapkan lantai dekat dinding. Gradien halus ini
    // yang membuat lantai terasa "masuk" ke dalam ruangan.
    const AO = Math.min(1.8, (e1 - e0) * 0.22, (w1 - w0) * 0.22)
    if (AO > 0.15) {
      // RONDE 38: bayangan di kaki dinding = DITHER pola Bayer 4x4 (dulu rgba
      // semi-transparan = warna di luar palet). Tiga langkah, makin rapat ke
      // dinding. Warna bayangan diambil dari nat lantai material itu.
      // RONDE 41 (gaya NDS): bayangan kaki dinding = DUA PITA WARNA KERAS,
      // bukan bintik dither. Warna diambil dari tangga nada lantai itu sendiri
      // (2 langkah & 1 langkah lebih gelap), jadi tetap di dalam palet.
      const gelap2 = gelap(mat.tones[0], 2)
      const gelap1 = gelap(mat.tones[0], 1)
      const dalam2 = AO * 0.34
      const dalam1 = AO
      poly(ctx, [px(e0, w0, z), px(e0, w1, z), px(e0 + dalam1, w1, z), px(e0 + dalam1, w0, z)], gelap1)
      poly(ctx, [px(e0, w0, z), px(e1, w0, z), px(e1, w0 + dalam1, z), px(e0, w0 + dalam1, z)], gelap1)
      poly(ctx, [px(e0, w0, z), px(e0, w1, z), px(e0 + dalam2, w1, z), px(e0 + dalam2, w0, z)], gelap2)
      poly(ctx, [px(e0, w0, z), px(e1, w0, z), px(e1, w0 + dalam2, z), px(e0, w0 + dalam2, z)], gelap2)
    }

    // ---- TEPI SLAB = DECK PAPAN (ciri paling khas diorama referensi) ----
    // Dua sisi depan digambar sebagai papan kayu: bidang + sambungan vertikal
    // + rim terang di bibir atas.
    const SK = 10
    const bL = px(e0, w1, z), bR = px(e1, w1, z), tR = px(e1, w0, z)
    const bawah = (p: P) => ({ x: p.x, y: p.y + SK })
    poly(ctx, [bL, bR, bawah(bR), bawah(bL)], mat.skirtL)
    poly(ctx, [tR, bR, bawah(bR), bawah(tR)], mat.skirtR)
    // sambungan papan: tiap ~0.55 tile mengikuti sumbu tepi
    const papan = (p0: P, p1: P, warna: string) => {
      const n = Math.max(1, Math.round(Math.hypot(p1.x - p0.x, p1.y - p0.y) / (0.55 * TILE_W / Math.SQRT2 * 1.15)))
      for (let i = 1; i < n; i++) {
        const t = i / n
        const x = Math.round(p0.x + (p1.x - p0.x) * t) + 0.5
        const y = p0.y + (p1.y - p0.y) * t
        ctx.strokeStyle = warna
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x, Math.round(y) + 0.5)
        ctx.lineTo(x, Math.round(y) + SK - 0.5)
        ctx.stroke()
      }
    }
    papan(bL, bR, PAL.deckSeam)
    papan(tR, bR, PAL.deckSeam)
    // rim terang di bibir atas deck
    line(ctx, bL, bR, PAL.deckLight)
    line(ctx, tR, bR, PAL.deckLight)
    // garis gelap di dasar deck (memisahkan diorama dari void)
    line(ctx, bawah(bL), bawah(bR), PAL.beamDark)
    line(ctx, bawah(tR), bawah(bR), PAL.beamDark)
  }
}

// Objek ber-role 'dinding': bidang vertikal yang mengikuti tepi belakang
// lantai. side 'kiri' (DB) = bidang e konstan, membentang sepanjang w;
// side 'kanan' (DT) = bidang w konstan, membentang sepanjang e.
// Palet: sisi teduh/cahaya + plint kayu di kaki dinding (seperti palet ruangan).
export function drawWallObjects(ctx: CanvasRenderingContext2D, objects: SceneObject[]) {
  const sembunyi = dindingTersembunyi()
  for (const o of objects) {
    if (o.role !== 'dinding') continue
    const z0 = o.pos.z
    if (o.size.z <= 0) continue
    // ORBIT: dinding yang muka DALAMnya membelakangi kamera disembunyikan,
    // kalau tidak ruangan tertutup saat kamera berputar (seperti melihat
    // kotak dari luar). Objek yang menempel dinding itu ikut disembunyikan
    // (lihat objekMenempelDinding di bawah), supaya tidak melayang.
    if (o.side === 'kiri' && sembunyi.kiri) continue
    if (o.side !== 'kiri' && sembunyi.kanan) continue

    let a: P, b: P
    let panj: number
    if (o.side === 'kiri') {
      a = px(o.pos.e, o.pos.w, z0)
      b = px(o.pos.e, o.pos.w + o.size.w, z0)
      panj = o.size.w
    } else {
      a = px(o.pos.e, o.pos.w, z0)
      b = px(o.pos.e + o.size.e, o.pos.w, z0)
      panj = o.size.e
    }
    if (panj <= 0.2) continue

    const side: 'kiri' | 'kanan' = o.side === 'kanan' ? 'kanan' : 'kiri'
    const { face, trim } = wallColors(o.style, side)

    /** titik pada garis kaki dinding (t = 0..1) pada ketinggian dz */
    const at = (t: number, dz = 0): P => ({
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t - dz * ZH,
    })
    const Z = o.size.z
    const kotak = (
      t0: number, t1: number, zA: number, zB: number,
      warna: string | CanvasGradient | CanvasPattern,
    ) =>
      poly(ctx, [at(t0, zA), at(t1, zA), at(t1, zB), at(t0, zB)], warna)

    // =====================================================================
    // GAYA INTERIOR "POKÉMON NDS" (ronde 41)
    // ---------------------------------------------------------------------
    // Permintaan user: "saya hanya ingin style, warna, dan tema seperti
    // gambar referensi atau buat saja seperti game pokemon nds".
    // Ciri yang ditiru dari interior Pokémon Generasi 4/5 (NDS):
    //   • warna RATA dan cerah, tanpa bintik/dither di bidang dinding;
    //   • dua nada saja per bidang, batasnya GARIS KERAS 1 px;
    //   • wainscot (panel kayu) di bawah + lis kayu terang di atasnya;
    //   • bayangan hanya satu pita gelap tipis di kaki dinding.
    // =====================================================================
    kotak(0, 1, Z, 0, face)

    // tinggi wainscot (maksimal 1,7 z supaya proporsinya sama di dinding tinggi)
    const zW = Math.min(1.7, Z * 0.34)
    const zBatas = zW + (Z - zW) * 0.78   // batas nada plester atas/bawah

    // 1) PLESTER: dua nada keras
    kotak(0, 1, Z, zBatas, face)
    kotak(0, 1, zBatas, zW, gelap(face, 1))
    line(ctx, at(0, zBatas), at(1, zBatas), gelap(face, 2))

    // 2) WAINSCOT KAYU: papan mendatar + sambungan tegak tiap ~0,85 tile
    kotak(0, 1, zW, 0, trim)
    const nPapan = Math.max(2, Math.round(panj / 0.85))
    for (let i = 1; i < nPapan; i++) {
      const t = i / nPapan
      line(ctx, at(t, zW), at(t, 0), PAL.beamDark)
    }
    // papan atas wainscot sedikit lebih terang (kesan panel ber-volume)
    kotak(0, 1, zW, zW - Math.min(0.22, zW * 0.22), PAL.post)

    // 3) LIS KAYU di atas wainscot: pita terang + garis gelap
    kotak(0, 1, zW + 0.16, zW, PAL.beamTop)
    kotak(0, 1, zW + 0.16, zW + 0.11, PAL.peg)
    line(ctx, at(0, zW), at(1, zW), PAL.beamDark)

    // 4) KAKI DINDING: satu pita gelap tipis (tanpa dither)
    kotak(0, 1, Math.min(0.14, zW * 0.2), 0, PAL.beamDark)

    // 5) CORNICE — balok kayu gelap di puncak dinding
    const hb = Math.min(0.5, Z * 0.4)
    if (Z > 1) {
      kotak(0, 1, Z, Z - hb, PAL.beam)
      // rim terang di bibir atas balok
      const rim = Math.min(0.07, hb * 0.3)
      kotak(0, 1, Z, Z - rim, PAL.beamTop)
      // bayangan gelap di bawah balok
      kotak(0, 1, Z - hb, Z - hb - Math.min(0.05, hb * 0.2), PAL.beamDark)
    }

    // 4) TIANG KAYU di kedua ujung dinding + pasak bulat
    const tp = Math.min(0.5, 0.42 / panj)   // lebar tiang ~0.42 tile
    for (const [t0, t1] of [[0, tp], [1 - tp, 1]] as [number, number][]) {
      kotak(t0, t1, Z, 0, PAL.post)
      // sisi kena cahaya
      kotak(t0, t0 + (t1 - t0) * 0.45, Z, 0, PAL.postLit)
      // garis gelap di sisi teduh tiang
      line(ctx, at(t1, Z), at(t1, 0), PAL.beamDark)
      if (Z > 1.2) {
        // pasak (paku kayu) bundar di dekat puncak
        const p = at((t0 + t1) / 2, Z - Math.min(0.75, Z * 0.35))
        ctx.fillStyle = PAL.peg
        ctx.beginPath()
        ctx.arc(Math.round(p.x), Math.round(p.y), 1.6 * DENS * 0.6, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // 5) BAYANGAN SUDUT: garis gelap tipis di pertemuan dinding & lantai
    line(ctx, at(0, 0), at(1, 0), PAL.beamDark)
  }
}

/**
 * Gambar latar dipetakan ke kanvas internal 640x400.
 * - 'isi'  : skala terbesar -> menutupi seluruh kanvas, sisi lebih terpotong
 * - 'muat' : skala terkecil -> gambar utuh, sisa kanvas tetap warna void
 * Interpolasi dimatikan supaya gambar Paint (pixel-art) tetap tajam.
 */
function drawLatarGambar(ctx: CanvasRenderingContext2D, img: CanvasImageSource, mode: 'isi' | 'muat') {
  const iw = Number((img as HTMLImageElement).naturalWidth ?? (img as HTMLCanvasElement).width)
  const ih = Number((img as HTMLImageElement).naturalHeight ?? (img as HTMLCanvasElement).height)
  if (!iw || !ih) return
  ctx.imageSmoothingEnabled = false
  const skala = mode === 'muat'
    ? Math.min(IW / iw, IH / ih)
    : Math.max(IW / iw, IH / ih)
  const w = iw * skala
  const h = ih * skala
  ctx.drawImage(img, (IW - w) / 2, (IH - h) / 2, w, h)
}

/** true bila objek ini menempel pada dinding yang sedang disembunyikan */
export function menempelDindingTersembunyi(o: SceneObject): boolean {
  if (o.role === 'dinding' || o.role === 'lantai') return false
  if (o.pos.z < 0.3) return false          // hanya barang yang dipasang di dinding
  const sembunyi = dindingTersembunyi()
  // dinding kiri = bidang e tetap (dekat e kecil), kanan = bidang w tetap
  if (sembunyi.kiri && o.pos.e < 1.2) return true
  if (sembunyi.kanan && o.pos.w < 1.2) return true
  return false
}

export function drawScene(ctx: CanvasRenderingContext2D, o: DrawOpts) {
  ctx.fillStyle = PAL.void
  ctx.fillRect(0, 0, IW, IH)

  // LATAR GAMBAR: paling bawah, menutupi seluruh kanvas
  if (o.latarGambar) drawLatarGambar(ctx, o.latarGambar, o.latarMode ?? 'isi')
  // Bila gambar latar dipasang, objek ber-latar (dinding & lantai bawaan) tidak
  // digambar karena gambarnya sudah memuat ruangan. DATANYA TETAP UTUH dan
  // kembali muncul begitu gambar latar dihapus.
  const objek = o.latarGambar ? o.objects.filter(x => x.latar !== true) : o.objects

  // ruangan dihapus sementara -> kanvas kosong, menunggu referensi baru user
  if (ROOM_VISIBLE) {
    walls(ctx)
    floor(ctx)
  }
  // dinding dari objek (role 'dinding') digambar lebih dulu (paling belakang);
  // dinding LATAR didahulukan supaya tetap di belakang dinding lain
  drawWallObjects(ctx, [...objek].sort((a, b) => Number(b.latar === true) - Number(a.latar === true)))

  overlays(ctx, o.grid, o.edit)

  // lantai dari objek (role 'lantai') digambar paling bawah
  // (lantai latar didahulukan, lalu lantai biasa)
  drawFloorObjects(ctx, [...objek].sort((a, b) => Number(b.latar === true) - Number(a.latar === true)))

  // tiga lapis: underlay (bawah) -> main -> overlay (atas),
  // masing-masing tetap diurutkan kedalaman agar isometrik benar
  const layerOf = (x: SceneObject) => x.layer ?? 'main'
  const solid = objek.filter(x =>
    x.role !== 'lantai' && x.role !== 'dinding' && !menempelDindingTersembunyi(x))
  // LATAR lebih dulu: apa pun objek latar, selalu di belakang perabot
  for (const obj of sortedObjects(solid.filter(x => x.latar === true))) drawObject(ctx, obj)
  for (const obj of sortedObjects(solid.filter(x => x.latar !== true && layerOf(x) === 'underlay'))) drawObject(ctx, obj)
  for (const obj of sortedObjects(solid.filter(x => x.latar !== true && layerOf(x) === 'main'))) drawObject(ctx, obj)
  for (const obj of sortedObjects(solid.filter(x => x.latar !== true && layerOf(x) === 'overlay'))) drawObject(ctx, obj)

  const marks = objek.filter(x =>
    x.id === o.selectedId || (o.highlightIds ?? []).includes(x.id))
  for (const sel of marks) {
    // sorot: garis dasar tile tempat objek berdiri
    const { e, w } = sel.pos
    const { se, sw } = footprintOf(sel)
    line(ctx, px(e, w), px(e + se, w), PAL.zone)
    line(ctx, px(e + se, w), px(e + se, w + sw), PAL.zone)
    line(ctx, px(e + se, w + sw), px(e, w + sw), PAL.zone)
    line(ctx, px(e, w + sw), px(e, w), PAL.zone)
  }

  // PANTULAN DIHAPUS TOTAL (permintaan user 2026-10-29): tidak ada lagi
  // bayangan cermin objek di lantai. Dulu di sini dipanggil drawReflections().
  crispify(ctx)
}
