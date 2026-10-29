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
  const D = await bangun('src/iso/dither.ts', 'dither.mjs')
  const BAYER4 = D.BAYER4

  const data = {
    versi: 4,
    dibuat: '2026-10-29',
    tema: 'PALET REFERENSI 51 WARNA (diorama Tudor) · outline 1px · dithering Bayer 4x4 · latar hitam OLED',
    sumberReferensi: '51 warna hasil ekstrak dua gambar referensi diorama (ronde 39); Endesga 32 (ronde 38) tidak dipakai lagi',
    warnaDasar: P.PAL,
    materi: P.MATERIALS,
    lantai: P.FLOOR_MATERIALS,
    dinding: P.WALL_MATERIALS,
    lantaiBawaan: P.FLOOR_DEFAULT,
    dindingBawaan: P.WALL_DEFAULT,
  }
  const ref = {
    versi: 2,
    dibuat: '2026-10-29',
    catatan: 'grid DESAIN 18x19 dari gambar referensi ronde 13, tiap sel SUDAH dibulatkan ke palet referensi 51 warna (bukan daftar warna sah)',
    jumlah: R.SEMUA.length,
    kolom: R.KOLOM,
    tingkat: R.TINGKAT,
    baris: R.PALET_REF,
    oled: R.OLED,
  }
  const retro = {
    versi: 1,
    dibuat: '2026-10-29',
    nama: 'REFERENSI 51',
    catatan: 'satu-satunya warna yang boleh muncul di kanvas (ronde 39)',
    jumlah: R.PALET_RETRO.length,
    palet: R.PALET_RETRO,
    tangga: R.TANGGA,
    gelapMaks: R.GELAP_MAKS ?? '#2b1a12',
    bayer4: BAYER4,
  }
  writeFileSync(join(AKAR, 'docs', '04-palet-retro.json'), JSON.stringify(retro, null, 1) + '\n')
  writeFileSync(join(AKAR, 'docs', '04-palet.json'), JSON.stringify(data, null, 1) + '\n')
  writeFileSync(join(AKAR, 'docs', '04-palet-referensi.json'), JSON.stringify(ref, null, 1) + '\n')
  console.log(`docs/04-palet.json: ${Object.keys(data.materi).length} material, ${Object.keys(data.lantai).length} lantai, ${Object.keys(data.dinding).length} dinding`)
  console.log(`docs/04-palet-referensi.json: grid desain ${R.KOLOM.length} kolom x ${R.TINGKAT} tingkat -> palet Endesga`)
  console.log(`docs/04-palet-retro.json: ${retro.palet.length} warna, ${retro.tangga.length} tangga nada`)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
