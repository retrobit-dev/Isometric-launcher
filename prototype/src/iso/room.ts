import { CAM, CY, EXT_E, EXT_W, HH, IH, IW, ROOM, ROOM_VISIBLE, ZH, px, type P } from './space'
import { PAL, floorMat, wallColors } from './palette'
import { drawBox, footprintOf, sortedObjects } from './box'
import type { SceneObject } from '../scene/types'

function poly(ctx: CanvasRenderingContext2D, pts: P[], color: string) {
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
}

// Refleksi lantai: bayangan cermin objek di bawah bidang lantai,
// dipadatkan 60% dan samar (alpha 12%), dipotong persis ke bentuk lantai.
function drawReflections(ctx: CanvasRenderingContext2D, objects: SceneObject[]) {
  const E = ROOM.E + EXT_E
  const W = ROOM.W + EXT_W
  ctx.save()
  ctx.beginPath()
  const floors = objects.filter(x => x.role === 'lantai' && x.size.e > 0 && x.size.w > 0)
  if (floors.length) {
    // bidang pantul = batas objek lantai
    for (const f of floors) {
      const a = px(f.pos.e, f.pos.w, f.pos.z)
      const b = px(f.pos.e + f.size.e, f.pos.w, f.pos.z)
      const c = px(f.pos.e + f.size.e, f.pos.w + f.size.w, f.pos.z)
      const d = px(f.pos.e, f.pos.w + f.size.w, f.pos.z)
      ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.lineTo(d.x, d.y)
      ctx.closePath()
    }
  } else {
    const f0 = px(0, 0), f1 = px(E, 0), f2 = px(E, W), f3 = px(0, W)
    ctx.moveTo(f0.x, f0.y)
    ctx.lineTo(f1.x, f1.y)
    ctx.lineTo(f2.x, f2.y)
    ctx.lineTo(f3.x, f3.y)
    ctx.closePath()
  }
  ctx.clip()
  ctx.globalAlpha = 0.12
  // refleksi kini PER OBJEK (diatur dari editor objek), default ON
  const reflectable = objects.filter(
    x => (x.layer ?? 'main') !== 'underlay'
      && x.role !== 'lantai' && x.role !== 'dinding'
      && x.pantulan !== false,
  )
  for (const obj of sortedObjects(reflectable)) {
    const zh = obj.size.z * 0.6
    drawBox(ctx, {
      ...obj,
      pos: { ...obj.pos, z: -(obj.pos.z + zh) },
      size: { ...obj.size, z: zh },
    })
  }
  ctx.restore()
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
      const L = Math.max(2, Math.round(mat.plank ?? 4))
      const stagger = Math.round(L / 2)
      for (let wr = Math.floor(w0); wr < Math.ceil(w1); wr++) {
        const cd = Math.max(wr, w0), dd = Math.min(wr + 1, w1)
        if (dd <= cd) continue
        const off = ((wr % 2) + 2) % 2 === 0 ? 0 : stagger
        const first = Math.floor((e0 - off) / L) * L + off
        for (let e0p = first; e0p < e1; e0p += L) {
          const a = Math.max(e0p, e0), b = Math.min(e0p + L, e1)
          if (b <= a) continue
          const toneIdx = (Math.abs(Math.round(e0p / L)) * 5 + wr * 3) % 3
          piece(a, b, cd, dd, mat.tones[toneIdx])

          // SERAT KAYU: satu garis tipis searah panjang papan, hanya pada
          // sebagian papan (deterministik) supaya lantai tidak terlihat garis-garis
          if (mat.grain && (wr * 7 + toneIdx * 5 + Math.round(a)) % 3 !== 0) {
            const h = dd - cd
            const g1 = cd + h * (0.42 + ((wr * 5 + toneIdx) % 3) * 0.12)
            line(ctx, px(a, g1, z), px(b, g1, z), mat.grain)
          }
        }
      }
      // nat TIPIS hanya di batas baris papan (bukan garis tebal tiap tile)
      for (let ww = Math.ceil(w0); ww < w1; ww++) line(ctx, px(e0, ww, z), px(e1, ww, z), mat.grout)
      line(ctx, px(e0, w1, z), px(e1, w1, z), mat.grout)
      line(ctx, px(e0, w0, z), px(e1, w0, z), mat.grout)
      // sambungan ujung papan (hanya di ujung papan, ikut pergeseran baris)
      for (let wr = Math.floor(w0); wr < Math.ceil(w1); wr++) {
        const cd = Math.max(wr, w0), dd = Math.min(wr + 1, w1)
        if (dd <= cd) continue
        const off = ((wr % 2) + 2) % 2 === 0 ? 0 : stagger
        const first = Math.floor((e0 - off) / L) * L + off
        for (let ee = first + L; ee < e1; ee += L) {
          if (ee <= e0) continue
          line(ctx, px(ee, cd, z), px(ee, dd, z), mat.grout)
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

    // tebal slab di dua sisi depan (sama seperti lantai ruangan)
    const SK = 10
    const bL = px(e0, w1, z), bR = px(e1, w1, z), tR = px(e1, w0, z)
    poly(ctx, [bL, bR, { x: bR.x, y: bR.y + SK }, { x: bL.x, y: bL.y + SK }], mat.skirtL)
    poly(ctx, [tR, bR, { x: bR.x, y: bR.y + SK }, { x: tR.x, y: tR.y + SK }], mat.skirtR)
  }
}

// Objek ber-role 'dinding': bidang vertikal yang mengikuti tepi belakang
// lantai. side 'kiri' (DB) = bidang e konstan, membentang sepanjang w;
// side 'kanan' (DT) = bidang w konstan, membentang sepanjang e.
// Palet: sisi teduh/cahaya + plint kayu di kaki dinding (seperti palet ruangan).
export function drawWallObjects(ctx: CanvasRenderingContext2D, objects: SceneObject[]) {
  for (const o of objects) {
    if (o.role !== 'dinding') continue
    const z0 = o.pos.z
    const z1 = z0 + o.size.z
    if (o.size.z <= 0) continue

    let a: P, b: P   // dua titik kaki dinding (z0)
    if (o.side === 'kiri') {
      a = px(o.pos.e, o.pos.w, z0)
      b = px(o.pos.e, o.pos.w + o.size.w, z0)
    } else {
      a = px(o.pos.e, o.pos.w, z0)
      b = px(o.pos.e + o.size.e, o.pos.w, z0)
    }
    const at: P = { x: a.x, y: a.y - o.size.z * ZH }
    const bt: P = { x: b.x, y: b.y - o.size.z * ZH }

    // warna mengikuti `style` objek: palet dinding (dinding-navy/krem/kayu/...)
    // atau material balok biasa; style tak dikenal -> magenta (penanda bug)
    const side: 'kiri' | 'kanan' = o.side === 'kanan' ? 'kanan' : 'kiri'
    const { face, trim } = wallColors(o.style, side)

    poly(ctx, [a, b, bt, at], face)

    // plint kayu di kaki dinding (tinggi 0.18 z seperti palet ruangan)
    const dz = Math.min(0.18, o.size.z)
    const pb1: P = { x: b.x, y: b.y - dz * ZH }
    const pa1: P = { x: a.x, y: a.y - dz * ZH }
    poly(ctx, [a, b, pb1, pa1], trim)
  }
}

export function drawScene(ctx: CanvasRenderingContext2D, o: DrawOpts) {
  ctx.fillStyle = PAL.void
  ctx.fillRect(0, 0, IW, IH)

  // ruangan dihapus sementara -> kanvas kosong, menunggu referensi baru user
  if (ROOM_VISIBLE) {
    walls(ctx)
    floor(ctx)
  }
  // dinding dari objek (role 'dinding') digambar lebih dulu (paling belakang)
  drawWallObjects(ctx, o.objects)

  overlays(ctx, o.grid, o.edit)

  // lantai dari objek (role 'lantai') digambar paling bawah
  drawFloorObjects(ctx, o.objects)

  // tiga lapis: underlay (bawah) -> main -> overlay (atas),
  // masing-masing tetap diurutkan kedalaman agar isometrik benar
  const layerOf = (x: SceneObject) => x.layer ?? 'main'
  const solid = o.objects.filter(x => x.role !== 'lantai' && x.role !== 'dinding')
  for (const obj of sortedObjects(solid.filter(x => layerOf(x) === 'underlay'))) drawBox(ctx, obj)
  for (const obj of sortedObjects(solid.filter(x => layerOf(x) === 'main'))) drawBox(ctx, obj)
  for (const obj of sortedObjects(solid.filter(x => layerOf(x) === 'overlay'))) drawBox(ctx, obj)

  const marks = o.objects.filter(x =>
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

  crispify(ctx)

  // refleksi digambar SETELAH crispify agar alpha samar tidak ikut ter-threshold
  // (butuh lantai sebagai bidang pantul; tanpa lantai refleksi dilewati)
  const hasFloorObj = o.objects.some(x => x.role === 'lantai')
  if (ROOM_VISIBLE || hasFloorObj) drawReflections(ctx, o.objects)
}
