// UJI ROTASI OBJEK — kelipatan 30° (permintaan user 2026-10-29:
// "rotasi pada editor objek buat dengan kelipatan 30 derajat").
//   cd prototype && node tests/run-rotasi.mjs
//
// Yang diperiksa: normalisasi sudut, migrasi data lama (`rot` 0..3 = 90°),
// penyimpanan di scene, dan geometri footprint (4 sudut) yang diputar —
// termasuk bahwa 90° menghasilkan footprint yang sama dengan tukar e/w.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-rotasi-'))
let gagal = 0
const cek = (nama, lulus, detail = '') => {
  if (!lulus) gagal++
  console.log(`  ${lulus ? 'OK  ' : 'GAGAL'} ${nama}${detail ? ' — ' + detail : ''}`)
}
const bangun = (entri, nama) => {
  const out = join(tmp, nama)
  execFileSync('npx', ['esbuild', entri, '--bundle', '--format=esm', '--platform=node',
    `--outfile=${out}`], { stdio: 'pipe' })
  return import(pathToFileURL(out).href)
}

try {
  const T = await bangun('src/scene/types.ts', 'types.mjs')
  const S = await bangun('src/scene/store.ts', 'store.mjs')

  console.log('1. langkah 30°')
  cek('ROTASI_LANGKAH = 30', T.ROTASI_LANGKAH === 30)
  cek('0 tetap 0', T.normalRotasi(0) === 0)
  cek('30 tetap 30', T.normalRotasi(30) === 30)
  cek('45 dibulatkan ke 60', T.normalRotasi(45) === 60, String(T.normalRotasi(45)))
  cek('44 dibulatkan ke 30', T.normalRotasi(44) === 30, String(T.normalRotasi(44)))
  cek('360 -> 0', T.normalRotasi(360) === 0, String(T.normalRotasi(360)))
  cek('390 -> 30', T.normalRotasi(390) === 30, String(T.normalRotasi(390)))
  cek('-30 -> 330', T.normalRotasi(-30) === 330, String(T.normalRotasi(-30)))
  cek('NaN -> 0', T.normalRotasi(NaN) === 0)
  const semua = []
  for (let d = 0; d < 360; d += 30) semua.push(T.normalRotasi(d))
  cek('12 posisi berbeda 0..330', new Set(semua).size === 12 && Math.max(...semua) === 330, semua.join(','))

  console.log('2. data lama (rot 0..3) dimigrasi')
  const adegan = (extra) => ({
    version: 1, room: { e: 20, w: 20, wallZ: 9.5 },
    objects: [{
      id: 'a', label: 'A', pos: { e: 1, w: 2, z: 0 }, size: { e: 3, w: 1, z: 1 },
      style: 'kayu-terakota', app: null, layer: 'main', ...extra,
    }],
    meta: { locked: false, savedAt: null },
  })
  const r1 = S.normalisasiScene(adegan({ rot: 1 }))
  cek('rot 1 -> rotasi 90', r1.objects[0].rotasi === 90, JSON.stringify(r1.objects[0].rotasi))
  const r3 = S.normalisasiScene(adegan({ rot: 3 }))
  cek('rot 3 -> rotasi 270', r3.objects[0].rotasi === 270, String(r3.objects[0].rotasi))
  const r0 = S.normalisasiScene(adegan({ rot: 0 }))
  cek('rot 0 -> rotasi 0 (tidak ditulis)', r0.objects[0].rotasi === undefined, String(r0.objects[0].rotasi))

  console.log('3. rotasi baru dipertahankan')
  const r30 = S.normalisasiScene(adegan({ rotasi: 30 }))
  cek('rotasi 30 bertahan', r30.objects[0].rotasi === 30, String(r30.objects[0].rotasi))
  const rSpur = S.normalisasiScene(adegan({ rotasi: 47 }))
  cek('rotasi 47 dibulatkan ke 60 saat normalisasi', rSpur.objects[0].rotasi === 60, String(rSpur.objects[0].rotasi))
  const rTinggi = S.normalisasiScene(adegan({ rotasi: 400 }))
  // 400° = 40° -> kelipatan 30 terdekat = 30
  cek('rotasi 400 -> 30', rTinggi.objects[0].rotasi === 30, String(rTinggi.objects[0].rotasi))

  console.log('4. geometri footprint terputar')
  // hitung 4 sudut alas seperti iso/box.ts, lalu bandingkan dengan harapan
  const sudutAlas = (o) => {
    const he = o.size.e / 2, hw = o.size.w / 2
    const ce = o.pos.e + he, cw = o.pos.w + hw
    const th = ((o.rotasi ?? 0) * Math.PI) / 180
    const co = Math.cos(th), si = Math.sin(th)
    return [[-he, -hw], [he, -hw], [he, hw], [-he, hw]]
      .map(([de, dw]) => ({ e: ce + de * co - dw * si, w: cw + de * si + dw * co }))
  }
  const dasar = { pos: { e: 0, w: 0, z: 0 }, size: { e: 4, w: 2, z: 1 } }
  const lebarE = (s) => Math.max(...s.map(p => p.e)) - Math.min(...s.map(p => p.e))
  const lebarW = (s) => Math.max(...s.map(p => p.w)) - Math.min(...s.map(p => p.w))
  const s0 = sudutAlas({ ...dasar, rotasi: 0 })
  cek('0°: sebaran e = 4, w = 2', Math.abs(lebarE(s0) - 4) < 1e-9 && Math.abs(lebarW(s0) - 2) < 1e-9)
  const s90 = sudutAlas({ ...dasar, rotasi: 90 })
  cek('90°: bertukar jadi e = 2, w = 4', Math.abs(lebarE(s90) - 2) < 1e-9 && Math.abs(lebarW(s90) - 4) < 1e-9)
  const s30 = sudutAlas({ ...dasar, rotasi: 30 })
  const c30 = Math.cos(Math.PI / 6), s30n = Math.sin(Math.PI / 6)
  cek('30°: sebaran = 4·cos30 + 2·sin30', Math.abs(lebarE(s30) - (4 * c30 + 2 * s30n)) < 1e-9,
    lebarE(s30).toFixed(4))
  cek('30°: pusat footprint tetap di (2,1)',
    Math.abs((Math.max(...s30.map(p => p.e)) + Math.min(...s30.map(p => p.e))) / 2 - 2) < 1e-9)
  const s180 = sudutAlas({ ...dasar, rotasi: 180 })
  cek('180°: sebaran sama dengan 0°', Math.abs(lebarE(s180) - 4) < 1e-9 && Math.abs(lebarW(s180) - 2) < 1e-9)
  const beda = (a, b) => Math.max(...a.map((p, i) => Math.abs(p.e - b[i].e) + Math.abs(p.w - b[i].w)))
  cek('180°: sudut bertukar posisi dengan 0°', beda(s180, s0) > 1, beda(s180, s0).toFixed(3))
} finally {
  rmSync(tmp, { recursive: true, force: true })
}

console.log(gagal === 0 ? '\nSEMUA UJI ROTASI LULUS' : `\n${gagal} UJI ROTASI GAGAL`)
process.exit(gagal === 0 ? 0 : 1)
