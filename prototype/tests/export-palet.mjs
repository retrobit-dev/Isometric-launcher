// Ekspor tabel warna untuk APK — docs/04-palet.json
//
//   cd prototype && node tests/export-palet.mjs
//
// Tabel ini WAJIB dipakai apa adanya oleh renderer APK (docs/04 §6):
// menambah warna = tambah data + versi kontrak, bukan mengubah kode renderer.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const tmp = mkdtempSync(join(tmpdir(), 'isola-palet-'))
try {
  const keluar = join(tmp, 'palette.mjs')
  execFileSync('npx', ['esbuild', 'src/iso/palette.ts', '--bundle', '--format=esm',
    '--platform=node', `--outfile=${keluar}`], { stdio: 'pipe' })
  const P = await import(pathToFileURL(keluar).href)

  const data = {
    versi: 'palet-v1',
    dibuat: new Date().toISOString().slice(0, 10),
    materi: P.MATERIALS,
    lantai: P.FLOOR_MATERIALS,
    dinding: P.WALL_MATERIALS,
    warnaDasar: P.PAL,
  }
  const tujuan = join('..', 'docs', '04-palet.json')
  writeFileSync(tujuan, JSON.stringify(data, null, 2) + '\n')
  console.log(`tulis ${tujuan}: ${Object.keys(P.MATERIALS).length} materi, ` +
    `${Object.keys(P.FLOOR_MATERIALS).length} lantai, ${Object.keys(P.WALL_MATERIALS).length} dinding`)
} finally {
  rmSync(tmp, { recursive: true, force: true })
}
