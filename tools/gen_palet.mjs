// Ekspor palet web (prototype/src/iso/palette.ts + palet-referensi.ts) menjadi
// JSON yang dipakai renderer offline (tools/render_scene.py) dan dokumentasi.
//   cd prototype && node ../tools/gen_palet.mjs      (atau: node tools/gen_palet.mjs dari root)
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const AKAR = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const PROTO = join(AKAR, 'prototype')
const tmp = mkdtempSync(join(tmpdir(), 'gen-palet-'))

const bangun = (entri, nama) => {
  const out = join(tmp, nama)
  execFileSync('npx', ['esbuild', entri, '--bundle', '--format=esm', '--platform=node',
    `--outfile=${out}`], { cwd: PROTO, stdio: 'pipe' })
  return import(pathToFileURL(out).href)
}

try {
  const P = await bangun('src/iso/palette.ts', 'palette.mjs')
  const R = await bangun('src/iso/palet-referensi.ts', 'ref.mjs')

  const data = {
    versi: 3,
    dibuat: '2026-10-29',
    tema: 'palet referensi 16x12 (rainbow + brown) · latar hitam OLED',
    sumberReferensi: 'COLOR PALETTE "Rainbow colors with brown and gray" — 192 warna',
    warnaDasar: P.PAL,
    materi: P.MATERIALS,
    lantai: P.FLOOR_MATERIALS,
    dinding: P.WALL_MATERIALS,
    lantaiBawaan: P.FLOOR_DEFAULT,
    dindingBawaan: P.WALL_DEFAULT,
  }
  const ref = {
    versi: 1,
    dibuat: '2026-10-29',
    jumlah: R.SEMUA.length,
    kolom: R.KOLOM,
    tingkat: R.TINGKAT,
    baris: R.PALET_REF,
    oled: R.OLED,
  }
  writeFileSync(join(AKAR, 'docs', '04-palet.json'), JSON.stringify(data, null, 1) + '\n')
  writeFileSync(join(AKAR, 'docs', '04-palet-referensi.json'), JSON.stringify(ref, null, 1) + '\n')
  console.log(`docs/04-palet.json: ${Object.keys(data.materi).length} material, ${Object.keys(data.lantai).length} lantai, ${Object.keys(data.dinding).length} dinding`)
  console.log(`docs/04-palet-referensi.json: ${R.SEMUA.length} warna (${R.KOLOM.length} kolom x ${R.TINGKAT} tingkat)`)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
