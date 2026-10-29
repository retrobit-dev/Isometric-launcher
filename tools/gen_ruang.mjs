// Bangun scene contoh yang MIRIP GAMBAR REFERENSI ruang guru.
//   node tools/gen_ruang.mjs              -> versi EDIT (parametrik)
//   OBJEK=<id>                             -> satu objek preset saja
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

// Scene contoh = LATAR (lantai + 2 dinding) + objek buatan sendiri.
// JENDELA dipasang di DINDING KANAN (DT) sesuai gambar referensi: menempel
// permukaan dalam dinding (w = 0,2 + 0,02), di tengah sisi kanan ruangan.
const objek = [...latar]
const jendela = P.presetOf('jendela')
if (jendela) {
  objek.push(...P.buatPreset({
    preset: jendela, e: 12.0, w: 0.22, z: 0,
    grup: 'grup-jendela', nama: jendela.nama, urutanAwal: 10, idAwal: 'jendela',
  }))
}

const scene = S.normalisasiScene({
  version: 1,
  room: { e: 20, w: 20, wallZ: 9.5, palette: 'hangat' },
  objects: objek,
  meta: { locked: false, savedAt: null },
})

writeFileSync('/tmp/ruang.json', JSON.stringify({ scene }, null, 1))
console.log(`objek: ${scene.objects.length} (LATAR + ${objek.length - latar.length} bagian jendela)`)
