// Bangun scene contoh yang MIRIP GAMBAR REFERENSI ruang guru.
//   node tools/gen_ruang.mjs              -> versi EDIT (parametrik)
//   PIXEL=1 node tools/gen_ruang.mjs      -> versi PIXEL (sprite referensi)
//   OBJEK=kursi-putar OUT=/tmp/x.png ...  -> satu objek saja (lembar katalog)
//
// Hasil: /tmp/ruang.json  { scene }  — dipakai tools/render_scene.py
import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PROTO = join(AKAR, 'prototype')
const tmp = mkdtempSync(join(tmpdir(), 'isola-ruang-'))
const build = async (entri, nama) => {
  const out = join(tmp, nama)
  execFileSync('npx', ['esbuild', entri, '--bundle', '--format=esm', '--platform=node', `--outfile=${out}`],
    { cwd: PROTO, stdio: 'pipe' })
  return import(pathToFileURL(out).href)
}
const P = await build('src/scene/presets.ts', 'presets.mjs')
const S = await build('src/scene/store.ts', 'store.mjs')

const PIXEL = process.env.PIXEL === '1'
const hanya = process.env.OBJEK

// LATAR (dinding + lantai) — ukuran & tema sama dengan referensi
const latar = [
  { id: 'lantai', label: 'Lantai Ruangan', pos: { e: 0, w: 0, z: 0 }, size: { e: 20, w: 20, z: 0.2 },
    style: 'lantai-terakota', app: null, layer: 'main', role: 'lantai', latar: true, urutan: 0 },
  { id: 'dinding-db', label: 'Dinding Kiri (DB)', pos: { e: 0, w: 0, z: 0 }, size: { e: 0.2, w: 20, z: 9.5 },
    style: 'dinding-hangat', app: null, layer: 'main', role: 'dinding', side: 'kiri', latar: true, urutan: 1 },
  { id: 'dinding-dt', label: 'Dinding Kanan (DT)', pos: { e: 0, w: 0, z: 0 }, size: { e: 20, w: 0.2, z: 9.5 },
    style: 'dinding-hangat', app: null, layer: 'main', role: 'dinding', side: 'kanan', latar: true, urutan: 2 },
]

// Tata letak meniru referensi: dinding DT di w=0 (kanan), DB di e=0 (kiri).
const taruh = [
  ['papan-gabus', 0.6, 0.06, 6.2],
  ['jendela', 13.2, 0.06, 0],
  ['bingkai-foto', 4.2, 0.06, 8.4],
  ['rak-buku', 0.45, 9.6, 0],
  ['papan-tulis', 1.6, 3.4, 0],
  ['meja-guru', 8.2, 1.4, 0],
  ['kursi-putar', 9.9, 3.7, 0],
  ['laptop', 8.9, 1.55, 1.68],
  ['lampu-meja', 11.6, 1.62, 1.68],
  ['tumpukan-buku', 8.2, 2.05, 1.68],
  ['kalkulator', 11.2, 2.35, 1.68],
  ['tanaman-pot', 15.8, 1.7, 0],
  ['tempat-sampah', 1.1, 13.0, 0],
]

let urut = 10
let gid = 0
const objek = hanya ? [] : [...latar]
// Tata letak MENIRU REFERENSI (dipakai versi PIXEL: footprint = kotak gambar)
const taruhPixel = [
  ['bingkai-foto', 3.2, 0.06, 8.4],
  ['papan-gabus', 0.55, 0.06, 6.1],
  ['jendela', 12.6, 0.06, 0],
  ['papan-tulis', 2.2, 3.0, 0],
  ['meja-guru', 7.4, 1.2, 0],
  ['kursi-putar', 8.9, 3.9, 0],
  ['laptop', 8.0, 1.5, 1.68],
  ['lampu-meja', 10.4, 1.6, 1.68],
  ['tumpukan-buku', 7.4, 2.0, 1.68],
  ['kalkulator', 10.0, 2.3, 1.68],
  ['rak-buku', 0.5, 10.4, 0],
  ['tanaman-pot', 15.6, 1.5, 0],
  ['tempat-sampah', 1.0, 13.2, 0],
]

const daftar = hanya
  ? [[hanya, hanya.startsWith('papan-') || hanya === 'jendela' || hanya === 'bingkai-foto' ? 0.06 : 0,
    hanya.startsWith('papan-') || hanya === 'jendela' || hanya === 'bingkai-foto' ? 2 : 0, 0]]
  : (PIXEL ? taruhPixel : taruh)

for (const [id, e, w, z] of daftar) {
  gid++
  const umum = { e, w, grup: `grup-contoh-${gid}`, urutanAwal: urut, idAwal: id }
  let bagian
  if (PIXEL) {
    const px = P.presetPixelOf(id)
    if (!px) throw new Error('preset pixel tidak ada: ' + id)
    bagian = P.buatPixel({ preset: px, ...umum, nama: px.nama, z: z > 0 ? z : undefined })
  } else {
    const preset = P.presetOf(id)
    if (!preset) throw new Error('preset tidak ada: ' + id)
    bagian = P.buatPreset({ preset, ...umum, nama: preset.nama, z })
  }
  urut += bagian.length
  objek.push(...bagian)
}

const scene = S.normalisasiScene({
  version: 1,
  room: { e: 20, w: 20, wallZ: 9.5, palette: 'hangat' },
  objects: objek,
  meta: { locked: false, savedAt: null },
})

writeFileSync('/tmp/ruang.json', JSON.stringify({ scene }, null, 1))
console.log(`objek: ${scene.objects.length} | mode: ${PIXEL ? 'PIXEL' : 'EDIT'}`)
